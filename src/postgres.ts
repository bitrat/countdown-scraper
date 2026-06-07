import * as dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: `.env.local`, override: true });

import pg from "pg";
const { Pool } = pg;
import { logError, log, colour } from "./utilities";
import { Product, UpsertResponse, ProductResponse, DBProduct, DatedPrice } from "./typings";

let pool: Pool;

const today = new Date().toISOString().split('T')[0];

export async function establishPostgresDB() {
  const config = {
    host: process.env.PG_HOST || "localhost",
    port: parseInt(process.env.PG_PORT || "5432"),
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE,
  };

  if (!config.database) {
    throw Error("PG_DATABASE not found in .env");
  }

  pool = new Pool(config);

  try {
    const client = await pool.connect();

    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id           TEXT PRIMARY KEY,
        name         TEXT    NOT NULL,
        size         TEXT,
        last_checked TEXT    NOT NULL,
        price_history JSONB  NOT NULL,
        source_site  TEXT    NOT NULL,
        category     TEXT    NOT NULL,
        unit_price   TEXT
      )
    `);

    log(`Connected to PostgreSQL \tDatabase: ${config.database} \tHost: ${config.host}`, colour.green);

    const testResult = await client.query("SELECT * FROM products LIMIT 5");
    const products = testResult.rows.map(rowToDBProduct);

    if (products.length > 0) {
      products.forEach(p => {
        if (p.name.length < 3) throw new Error("Product name too short");
      });
    }

    client.release();
  } catch (error: any) {
    throw Error(error + "\n\nInvalid PostgreSQL connection - check PG_* settings in .env");
  }
}

export async function upsertProductToPostgresDB(
  scrapedProduct: Product
): Promise<UpsertResponse> {
  try {
    const result = await pool.query(
      "SELECT * FROM products WHERE id = $1",
      [scrapedProduct.id]
    );

    if (result.rows.length > 0) {
      const dbProduct = rowToDBProduct(result.rows[0]);
      const response = buildUpdatedDBProduct(scrapedProduct, dbProduct);

      await pool.query(
        `UPDATE products
            SET name = $1, size = $2, last_checked = $3,
                price_history = $4, category = $5, unit_price = $6
          WHERE id = $7`,
        [
          response.dbProduct.name,
          response.dbProduct.size ?? null,
          response.dbProduct.lastChecked,
          JSON.stringify(response.dbProduct.priceHistory),
          response.dbProduct.category,
          response.dbProduct.unitPrice ?? null,
          response.dbProduct.id,
        ]
      );

      return response.upsertType;
    } else {
      const dbProduct = transformToDBProduct(scrapedProduct);

      await pool.query(
        `INSERT INTO products (id, name, size, last_checked, price_history, source_site, category, unit_price)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          dbProduct.id,
          dbProduct.name,
          dbProduct.size ?? null,
          dbProduct.lastChecked,
          JSON.stringify(dbProduct.priceHistory),
          dbProduct.sourceSite,
          dbProduct.category,
          dbProduct.unitPrice ?? null,
        ]
      );

      console.log(
        `  New Product: ${scrapedProduct.name.slice(0, 47).padEnd(47)}` +
        ` | $ ${scrapedProduct.currentPrice}`
      );

      return UpsertResponse.NewProduct;
    }
  } catch (e: any) {
    logError(e);
    return UpsertResponse.Failed;
  }
}

function rowToDBProduct(row: any): DBProduct {
  return {
    id: row.id,
    name: row.name,
    size: row.size ?? undefined,
    lastChecked: row.last_checked,
    priceHistory: row.price_history as DatedPrice[],
    sourceSite: row.source_site,
    category: row.category,
    unitPrice: row.unit_price ?? undefined,
  };
}

function buildUpdatedDBProduct(
  scrapedProduct: Product,
  dbProduct: DBProduct
): ProductResponse {
  try {
    dbProduct.lastChecked = today;

    const dbLastPrice = dbProduct.priceHistory[dbProduct.priceHistory.length - 1].price;
    const priceDifference = Math.abs(dbLastPrice - scrapedProduct.currentPrice);

    const dbLastUpdated = dbProduct.priceHistory[dbProduct.priceHistory.length - 1].date;
    if (priceDifference > 0.05 && dbLastUpdated != today) {
      const newDatedPrice: DatedPrice = {
        date: today,
        price: scrapedProduct.currentPrice
      };
      dbProduct.priceHistory.push(newDatedPrice);

      logPriceChange(dbProduct);

      return {
        upsertType: UpsertResponse.PriceChanged,
        dbProduct: dbProduct,
      };
    } else {
      return {
        upsertType: UpsertResponse.AlreadyUpToDate,
        dbProduct: dbProduct,
      };
    }
  } catch (error: any) {
    logError("Error building updated DB product: " + error.message);
    process.exit(1);
  }
}

function transformToDBProduct(p: Product): DBProduct {
  const firstDatedPrice: DatedPrice = {
    date: today,
    price: p.currentPrice
  };
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    size: p.size,
    priceHistory: [firstDatedPrice],
    lastChecked: today,
    sourceSite: "countdown.co.nz",
    unitPrice: p.unitPrice
  };
}

export function logPriceChange(p: DBProduct) {
  const newPrice = p.priceHistory[p.priceHistory.length - 1].price;
  const oldPrice = p.priceHistory[p.priceHistory.length - 2].price;

  const priceIncreased = newPrice > oldPrice;
  log(
    priceIncreased ? colour.red : colour.green,
    "  Price " + (priceIncreased ? "Up   : " : "Down : ") +
    `${p.name.slice(0, 47).padEnd(47)} | $ ${oldPrice.toFixed(2)} > $${newPrice.toFixed(2)}`
  );
}
