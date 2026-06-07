# Woolworths Scraper

This project scrapes product info from Woolworths (Formerly Countdown) NZ website and optionally places the data into a local postgres DB

A history of price changes is stored within each product's database entry.

## Basic Setup

With `NodeJS` installed, clone this repository, then run `npm install` to install dependencies.

Playwright must also be installed when running for the first time with `npx playwright install`.

The program can now be tested in dry run mode without any further setup using `npm run dev`.

## Optional Setup

The `.env` file has variables that can be filled for more functionality.

```js
STORE_NAME=             Optional supermarket location name
PG_HOST=localhost
PG_PORT=5432
PG_USER=your_user
PG_PASSWORD=your_password
PG_DATABASE=woolworths_prices
```

## Usage

`npm run dev` - will use dry-run mode, no azure connection is required and the results will log to console.

`npm run db` - will scrape through the URLs and store the results into Postgres locally.

`npm run save` - will scrape through the URLs and store the results into a csv file

`npm run db https://sampleurl` - a single url can be used as an argument. This will be scraped instead of the URLs text file.

## Other Command-Line Arguments

`headed` - will run the browser in a window instead of a headless.

## Output

Sample log output when running in dry run mode:

```cmd
    ID | Name                              | Size           | Price  | Unit Price
----------------------------------------------------------------------------------
762844 | Ocean Blue Smoked Salmon Slices   | 100g           | $    9 | $90 /kg
697201 | Clearly Premium Smoked Salmon     | 200g           | $ 13.5 | $67.5 /kg
830035 | Ocean Blue Smoked Salmon Slices   | 180g           | $   12 | $67.7 /kg
```
