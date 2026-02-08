export interface Coupon {
  store: string; // merchant name as returned by Flipp
  item: string;
  regularPrice?: number;
  couponPrice: number;
  savings?: number;
  unit?: string; // e.g. "per lb", "each"
  expires?: string;
  imageUrl?: string; // product cutout image from Flipp
  storeAddress?: string;
  storeName?: string; // specific branch name
}
