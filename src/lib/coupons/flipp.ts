/**
 * Flipp coupon + flyer fetcher.
 *
 * Flipp aggregates deals from grocery stores. Their app shows:
 *   1. All flyer items via /flipp/flyers (weekly circulars)
 *   2. Digital coupons via /flipp/coupons
 *
 * Strategy: fetch all active flyers for the postal code, then fetch every
 * item from each flyer. This mirrors what flipp.com does in "All Circulars".
 *
 * To verify/update: open https://flipp.com in Chrome DevTools →
 * Network tab (Fetch/XHR) and look for requests to backflipp.wishabi.com.
 */

import type { Coupon } from "./types";

const BASE = "https://backflipp.wishabi.com/flipp";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json",
  Referer: "https://flipp.com/",
};

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

function parseItem(i: Record<string, unknown>, fallbackMerchant = ""): Coupon | null {
  const merchant = ((i.merchant_name ?? i.store_name ?? fallbackMerchant) as string).trim();
  if (!merchant || !isGroceryStore(merchant)) return null;

  const name = (i.name ?? i.description) as string | undefined;
  if (!name) return null;

  const salePrice = (i.current_price ?? i.sale_price ?? i.price) as number | undefined;
  const regular = (i.pre_price ?? i.original_price ?? i.regular_price) as number | undefined;

  return {
    store: merchant,
    item: name,
    regularPrice: regular,
    couponPrice: salePrice,
    savings: regular != null && salePrice != null ? Math.max(0, regular - salePrice) : undefined,
    expires: (i.valid_to ?? i.expiry_date) as string | undefined,
    imageUrl: ((i.cutout_image_url ?? i.clean_image_url ?? i.image_url) as string | undefined) || undefined,
    storeAddress: (i.store_address ?? i.merchant_address ?? i.address) as string | undefined || undefined,
    storeName: (i.flyer_merchant_name ?? merchant) as string,
  };
}

/** Fetch all items from a specific flyer */
async function fetchFlyerItems(flyerId: number, merchantName: string): Promise<Coupon[]> {
  try {
    const res = await fetch(`${BASE}/flyers/${flyerId}?locale=en-us`, { headers: HEADERS });
    if (!res.ok) return [];
    const data = await res.json();
    const items: unknown[] = data?.items ?? [];
    return items.flatMap((item) => {
      const i = item as Record<string, unknown>;
      const name = (i.name ?? i.short_name) as string | undefined;
      if (!name) return [];
      // price is a string like "9.97" or empty
      const priceStr = i.price as string | undefined;
      const salePrice = priceStr ? parseFloat(priceStr) || undefined : undefined;
      const coupon: Coupon = {
        store: merchantName,
        item: name,
        couponPrice: salePrice,
        expires: i.valid_to as string | undefined,
        imageUrl: (i.cutout_image_url as string | undefined) || undefined,
        storeName: merchantName,
      };
      return [coupon];
    });
  } catch {
    return [];
  }
}

/** Fetch all active flyers for a postal code */
async function fetchFlyers(postalCode: string): Promise<Array<{ id: number; merchant_name: string }>> {
  const params = new URLSearchParams({ locale: "en-us", postal_code: postalCode });
  try {
    const res = await fetch(`${BASE}/flyers?${params}`, { headers: HEADERS });
    if (!res.ok) return [];
    const data = await res.json();
    const flyers: unknown[] = Array.isArray(data) ? data : data?.flyers ?? [];
    return flyers
      .map((f) => f as Record<string, unknown>)
      .filter((f) => f.id && isGroceryStore((f.merchant ?? f.merchant_name ?? "") as string))
      .map((f) => ({ id: f.id as number, merchant_name: (f.merchant ?? f.merchant_name ?? "") as string }));
  } catch {
    return [];
  }
}

/** Fallback: search endpoint for when flyers API doesn't return enough */
async function searchItems(postalCode: string, q: string): Promise<Coupon[]> {
  const params = new URLSearchParams({ locale: "en-us", postal_code: postalCode, q });
  try {
    const res = await fetch(`${BASE}/items/search?${params}`, { headers: HEADERS });
    if (!res.ok) return [];
    const data = await res.json();
    const items: unknown[] = Array.isArray(data) ? data : data?.items ?? [];
    return items.flatMap((item) => {
      const parsed = parseItem(item as Record<string, unknown>);
      return parsed ? [parsed] : [];
    });
  } catch {
    return [];
  }
}

export async function fetchFlippCoupons(
  postalCode: string,
  query = ""
): Promise<Coupon[]> {
  // If a specific search query is provided, just search
  if (query) return searchItems(postalCode, query);

  // Otherwise: fetch all grocery flyers and pull every item from each
  const flyers = await fetchFlyers(postalCode);

  let allCoupons: Coupon[] = [];

  if (flyers.length > 0) {
    const flyerResults = await Promise.all(
      flyers.map((f) => fetchFlyerItems(f.id, f.merchant_name))
    );
    allCoupons = flyerResults.flat();
  }

  // Always also run a broad search as fallback/supplement
  const searchResults = await Promise.all(
    ["meat", "produce", "dairy", "bakery", "frozen"].map((q) => searchItems(postalCode, q))
  );
  allCoupons.push(...searchResults.flat());

  // Deduplicate by store+item
  const seen = new Set<string>();
  const deduped: Coupon[] = [];
  for (const c of allCoupons) {
    const key = `${c.store}|${c.item}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(c);
    }
  }
  return deduped;
}
