/**
 * Flipp coupon fetcher.
 *
 * Flipp aggregates deals from grocery stores and exposes a search API
 * used by their web app.
 *
 * API endpoint discovered from https://flipp.com/coupons:
 *   https://backflipp.wishabi.com/flipp/items/search
 *
 * To verify/update: open https://flipp.com/coupons in Chrome DevTools →
 * Network tab (Fetch/XHR) and look for requests to backflipp.wishabi.com.
 */

import type { Coupon } from "./types";

const FLIPP_API = "https://backflipp.wishabi.com/flipp/items/search";

// Keywords that identify grocery / food stores (case-insensitive)
const GROCERY_KEYWORDS = [
  "grocery", "supermarket", "market", "food", "farm", "kroger", "aldi",
  "walmart", "heb", "h-e-b", "costco", "target", "safeway", "publix",
  "whole foods", "trader joe", "sprouts", "meijer", "wegman", "giant",
  "stop & shop", "king soopers", "smith", "fry's", "ralphs", "vons",
  "jewel", "shaw", "hannaford", "winn", "piggly", "hy-vee", "brookshire",
  "fiesta", "randall", "sams club", "sam's", "bj's", "lidl", "save",
];

function isGroceryStore(name: string): boolean {
  const lower = name.toLowerCase();
  return GROCERY_KEYWORDS.some((kw) => lower.includes(kw));
}

export async function fetchFlippCoupons(
  postalCode: string,
  query = ""
): Promise<Coupon[]> {
  // Use a food-related default query so grocery stores show up in results
  const searchQuery = query || "food";
  const params = new URLSearchParams({
    locale: "en-US",
    postal_code: postalCode,
    q: searchQuery,
  });

  const res = await fetch(`${FLIPP_API}?${params}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "application/json",
      Referer: "https://flipp.com/",
    },
  });

  if (!res.ok) {
    throw new Error(
      `Flipp API failed: ${res.status} — verify endpoint in src/lib/coupons/flipp.ts`
    );
  }

  const data = await res.json();

  // Items may be under data.items or directly as an array
  const items: unknown[] = Array.isArray(data) ? data : data?.items ?? [];

  return items.flatMap((item: unknown) => {
    const i = item as Record<string, unknown>;
    const merchant = (i.merchant_name ?? i.store_name ?? "") as string;

    // Only include grocery / food stores
    if (!isGroceryStore(merchant)) return [];

    const name = (i.name ?? i.description) as string | undefined;
    const salePrice = (i.current_price ?? i.sale_price ?? i.price) as
      | number
      | undefined;
    const regular = (i.pre_price ?? i.original_price ?? i.regular_price) as
      | number
      | undefined;

    if (!name || salePrice == null) return [];

    const imageUrl =
      ((i.cutout_image_url ?? i.clean_image_url ?? i.image_url) as string | undefined) || undefined;

    // Store location — Flipp includes address info on some item/flyer objects
    const storeAddress = (
      i.store_address ??
      i.merchant_address ??
      i.address
    ) as string | undefined;
    const storeName = (i.flyer_merchant_name ?? merchant) as string;

    return [
      {
        store: merchant.trim(),
        item: name,
        regularPrice: regular,
        couponPrice: salePrice,
        savings:
          regular != null ? Math.max(0, regular - salePrice) : undefined,
        expires: (i.valid_to ?? i.expiry_date) as string | undefined,
        imageUrl,
        storeAddress: storeAddress || undefined,
        storeName,
      },
    ];
  });
}
