export interface Product {
  id: string;
  name: string;
  size?: string;
  currentPrice: number;
  category: string;
  unitPrice?: string;
}

export interface DBProduct {
  id: string;
  name: string;
  size?: string;
  lastChecked: string;
  priceHistory: DatedPrice[];
  sourceSite: string;
  category: string;
  unitPrice?: string;
}
export interface DatedPrice {
  date: string;
  price: number;
}

export interface ProductResponse {
  upsertType: UpsertResponse;
  dbProduct: DBProduct;
}
export const enum UpsertResponse {
  NewProduct,
  PriceChanged,
  AlreadyUpToDate,
  Failed,
}

// Urls to scrape should have an associated category
export interface CategorisedUrl {
  url: string;
  category: string;
}
