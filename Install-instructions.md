  Look at Detailed.md for installation instructions
  
  Runs in dry run mode
  Runs in dry mode with save option - outputs to a csv file that can be ingested further if wanted
  Runs in database mode for historical purposes

  Save option described
  Here's what was added:

  New file: src/csv-writer.ts
  - initCsvFile() — creates/overwrites scraped-YYYY-MM-DD.csv with the header row
  - appendProductToCsv(product) — appends one row per product, with proper CSV quoting

  src/index.ts changes
  - New saveMode flag, set by the save argument
  - Calls initCsvFile() at startup when save mode is on
  - Calls appendProductToCsv(product) for each product alongside the normal console row

  package.json — added "save" script
  
  1. Replaced src/cosmosdb.ts with a new src/postgres.ts using pg (node-postgres)
  2. Updated imports in src/index.ts
    import { establishPostgresDB, upsertProductToPostgresDB } from "./postgres.js";
    if (databaseMode) establishPostgresDB(); 
    const response = await upsertProductToPostgresDB(product);
     `PostgreSQL: ${perPageLogStats.newProducts} new products, 
  3. Swapped @azure/cosmos for pg in package.json 
    Dependencies: "pg": "8.13.3",
    devDependencies: "@types/pg": "8.11.14",
  4. Cleaned up the CosmosDB comment in typings.ts
    Removed example cosmos db document

  Here's a summary of every change made (not including save option):

  Files changed:

  ┌─────────────────┬─────────────────────────────────────────────────────────────────────┐
  │      File       │                               Change                                │
  ├─────────────────┼─────────────────────────────────────────────────────────────────────┤
  │ src/postgres.ts │ New file — replaces cosmosdb.ts with a pg-backed implementation     │
  ├─────────────────┼─────────────────────────────────────────────────────────────────────┤
  │ src/cosmosdb.ts │ Deleted                                                             │
  ├─────────────────┼─────────────────────────────────────────────────────────────────────┤
  │ src/index.ts    │ Updated 3 references: import, establishCosmosDB() call, log message │
  ├─────────────────┼─────────────────────────────────────────────────────────────────────┤
  │ src/typings.ts  │ Removed stale CosmosDB comments                                     │
  ├─────────────────┼─────────────────────────────────────────────────────────────────────┤
  │ package.json    │ Swapped @azure/cosmos → pg, added @types/pg dev dep                 │
  └─────────────────┴─────────────────────────────────────────────────────────────────────┘

  How it works:

  - On startup, establishPostgresDB() connects and runs CREATE TABLE IF NOT EXISTS products (...), so no
  manual schema setup is needed.
  - price_history is stored as a JSONB column — the same array-of-{date, price} objects from before, just
  └─────────────────┴─────────────────────────────────────────────────────────────────────┘

  How it works:

  - On startup, establishPostgresDB() connects and runs CREATE TABLE IF NOT EXISTS products (...), so no manual schema setup is needed.
  - price_history is stored as a JSONB column — the same array-of-{date, price} objects from before, just serialised to Postgres instead of CosmosDB.
  - The upsertProductToPostgresDB() function does a SELECT first, then either an UPDATE or INSERT
  (matching the original CosmosDB read-then-write pattern).

  Environment variables to set in .env (replace the old COSMOS_* vars):

  Fill in STORE_NAME, PG_USER, PG_PASSWORD, and PG_DATABASE with your local Postgres credentials. PG_HOST and PG_PORT can
  stay as defaults if you're running Postgres locally on the standard port.

   STORE_NAME=
  -COSMOS_CONSTRING=
  -COSMOS_DB_NAME=
  -COSMOS_CONTAINER=
  -COSMOS_PARTITION_KEY=
  +PG_HOST=localhost
  +PG_PORT=5432
  +PG_USER=your_user
  +PG_PASSWORD=your_password
  +PG_DATABASE=your_database_name
   IMAGE_UPLOAD_FUNC_URL=