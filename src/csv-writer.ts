import { writeFileSync, appendFileSync, existsSync } from "fs";
import { Product } from "./typings";
import { log, colour } from "./utilities";

const today = new Date().toISOString().split("T")[0];
export const csvFilename = `scraped-${today}.csv`;

const CSV_HEADER = "id,category,name,size,price,unit_price\n";

export function initCsvFile() {
  writeFileSync(csvFilename, CSV_HEADER, "utf-8");
  log(`Saving to ${csvFilename}`, colour.green);
}

export function appendProductToCsv(product: Product) {
  const q = (s: string | undefined) => `"${(s ?? "").replace(/"/g, '""')}"`;
  const row =
    [
      product.id,
      q(product.category),
      q(product.name),
      q(product.size),
      product.currentPrice.toFixed(2),
      q(product.unitPrice),
    ].join(",") + "\n";
  appendFileSync(csvFilename, row, "utf-8");
}
