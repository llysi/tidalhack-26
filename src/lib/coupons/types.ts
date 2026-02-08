export interface Coupon {
  store: string; // merchant name as returned by Flipp
  itemId?: number; // Flipp item id, used to fetch sale_story detail
  item: string;
  category?: string; // food category tag (e.g. "produce", "dairy", "meat")
  regularPrice?: number;
  couponPrice?: number;
  dealText?: string; // sale_story from Flipp item detail (e.g. "Save $10 off your basket...")
  savings?: number;
  unit?: string; // e.g. "per lb", "each"
  expires?: string;
  imageUrl?: string; // product cutout image from Flipp
  storeAddress?: string;
  storeName?: string; // specific branch name
}
