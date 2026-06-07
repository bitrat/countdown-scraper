# Detailed Setup & Run Instructions

This scraper collects product prices from Woolworths NZ and stores them in a local PostgreSQL database.

---

## What You Need to Install

1. **Node.js** (v18 or later)
2. **PostgreSQL** (v14 or later)
3. **Playwright browser** (Firefox — installed via npm, not separately)

---

## Step 1 — Install using nvm-windows

Install nvm package manager:
winget install CoreyButler.NVMforWindows

Check version:
nvm version

powershell admin terminal - install versions of node.js and tell nvm which to use:
nvm install 22
nvm use 22
node -v

You can now install other versions of node and still use v22, or switch to the latest version
nvm install 24     # or whatever version you had before — now managed by nvm
nvm use 22         # back to 22 for the scraper project

---

## Step 2 — Install PostgreSQL

1. Go to https://www.postgresql.org/download/windows/ and download the installer (use the **EDB** installer, which is the standard one).
2. Run the installer. During setup:
   - Choose a password for the **postgres** superuser — write this down, you will need it.
   - Leave the port as **5432** (the default).
   - Leave the locale as default.
3. When the installer finishes, it may offer to launch **Stack Builder** — you can skip that.
4. Verify PostgreSQL is running by opening the **pgAdmin** app that was installed with it, or by 
  add pg to your environment variables
  Press Win + R, type sysdm.cpl, and press Enter to open System Properties.
	Navigate to the Advanced tab and click Environment Variables.
	Under System variables, select Path and click Edit.
	Click New and paste the path to your PostgreSQL bin folder (e.g., C:\Program Files\PostgreSQL\18\bin).
	Click OK on all windows, close your current PowerShell window, and open a new one.
5. opening a terminal and running:

```
psql -U postgres -c "SELECT version();"
```

It will prompt for the password you set in step 2. If it prints a version string, PostgreSQL is working.

---

## Step 3 — Create a Database

You need to create a dedicated database for the scraper. Run this in your terminal (it will prompt for the postgres password):

```
psql -U postgres -c "CREATE DATABASE woolworths_prices;"
```

You can also create a separate user instead of using the postgres superuser:

```
psql -U postgres -c "CREATE USER scraper_user WITH PASSWORD 'your_password_here';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE woolworths_prices TO scraper_user;"
```

---

## Step 4 — Install Project Dependencies

Open a terminal, navigate to the project folder, and run:

```
npm install
```

This installs all packages listed in `package.json`, including the `pg` PostgreSQL client.

---

## Step 5 — Install the Playwright Browser

The scraper uses a headless Firefox browser to load pages. Install it once with:

```
npx playwright install firefox
```

This downloads the Firefox browser binary into a local cache. It only needs to be done once.

---

## Step 6 — Configure the .env File

Open the `.env` file in the project root and fill in your PostgreSQL credentials:

```
STORE_NAME=
PG_HOST=localhost
PG_PORT=5432
PG_USER=postgres
PG_PASSWORD=your_password_here
PG_DATABASE=woolworths_prices
```

- `STORE_NAME` — optional. Set this to a Woolworths store location name (e.g. `Thorndon`) to lock the scraper to a specific store. Leave blank to use the default store.
- `PG_HOST` — leave as `localhost` if PostgreSQL is running on the same machine.
- `PG_PORT` — leave as `5432` unless you changed it during installation.
- `PG_USER` — either `postgres` (superuser) or the dedicated user you created in Step 3. (scraper_user)
- `PG_PASSWORD` — the password for that user.
- `PG_DATABASE` — the database name you created in Step 3 (`woolworths_prices`).
- `IMAGE_UPLOAD_FUNC_URL` — leave blank unless you have an image upload endpoint configured.

> **Note:** The database table (`products`) is created automatically the first time you run in database mode. You do not need to create it manually.

---

## Step 7 — Run the Scraper

There are two modes: **dry run** (no database) and **database mode**.

### Dry Run (no database required)

```
npm run dev
```

This scrapes all URLs in `urls.txt` and prints the results to the console as a table. Nothing is saved. Use this to verify the scraper is working before touching the database.

Sample output:

```
    ID | Name                              | Size           | Price  | Unit Price
----------------------------------------------------------------------------------
762844 | Ocean Blue Smoked Salmon Slices   | 100g           | $    9 | $90 /kg
697201 | Clearly Premium Smoked Salmon     | 200g           | $ 13.5 | $67.5 /kg
```

### Save to csv mode

```
  npm run save
```
  This scrapes all URLs and saves results to csv file scraped-yyyy-mm-dd.csv

  Or for a single category:
  npx tsx src/index.ts save https://www.woolworths.co.nz/shop/browse/fruit-veg


### Database Mode

```
npm run db
```

This scrapes all URLs and saves results to PostgreSQL. New products are inserted, and existing products have their price history updated if the price has changed by more than $0.05.

On first run against an empty database, every product will be a "New Product". On subsequent runs, you will see price change tracking.

---

## Optional: Scrape a Single URL

Pass a Woolworths URL directly instead of using `urls.txt`:

```
npx tsx src/index.ts https://www.woolworths.co.nz/shop/browse/drinks/juice
```

Or in database mode:

```
npx tsx src/index.ts db https://www.woolworths.co.nz/shop/browse/drinks/juice
```

---

## Optional: Run with a Visible Browser Window

Add the `headed` argument to watch the browser open and navigate in real time:

```
npx tsx src/index.ts headed
npx tsx src/index.ts db headed
```

---

## Checking the Data in PostgreSQL

After running in database mode, you can query the database directly:

```
psql -U postgres -d woolworths_prices
```

Then run SQL queries:

```sql
-- Count all products
SELECT COUNT(*) FROM products;

-- See all products in a category
SELECT id, name, size, last_checked FROM products WHERE category = 'fruit';

-- See price history for a specific product
SELECT name, price_history FROM products WHERE id = '762844';

-- Find products with more than one price entry (i.e. price has changed)
SELECT name, jsonb_array_length(price_history) AS price_changes
FROM products
WHERE jsonb_array_length(price_history) > 1
ORDER BY price_changes DESC;
```

---

## Troubleshooting

**`ECONNREFUSED` when running in db mode**
PostgreSQL is not running. On Windows, open **Services** (search in Start menu), find **postgresql-x64-XX**, and start it.

**`password authentication failed`**
The password in `.env` does not match the PostgreSQL user password. Double-check `PG_USER` and `PG_PASSWORD`.

**`database "woolworths_prices" does not exist`**
Run Step 3 again to create the database.

**`Timeout waiting for selector` during scraping**
The Woolworths website may have changed its HTML structure, or you may be rate-limited. The scraper retries 3 times automatically. Try running again with `headed` to watch what the browser sees.

**Playwright not installed**
Run `npx playwright install firefox` as in Step 5.
