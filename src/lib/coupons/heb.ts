/**
 * HEB deals fetcher.
 *
 * To find the correct endpoint, open https://www.heb.com/event/deals in
 * Chrome DevTools → Network tab, filter by Fetch/XHR, and look for requests
 * returning product/promotion JSON. Update HEB_DEALS_URL below.
 *
 * Current approach: fetch the deals page and extract __NEXT_DATA__ JSON
 * embedded in the HTML, which Next.js apps include for SSR hydration.
 */

import type { Coupon } from "./types";

const HEB_DEALS_URL = "https://www.heb.com/event/deals";

export async function fetchHebCoupons(): Promise<Coupon[]> {
  const res = await fetch(HEB_DEALS_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!res.ok) throw new Error(`HEB fetch failed: ${res.status}`);

  const html = await res.text();

  // Extract __NEXT_DATA__ JSON blob embedded by Next.js
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) throw new Error("HEB: __NEXT_DATA__ not found in page");

  const nextData = JSON.parse(match[1]);

  // Navigate the data tree — adjust path if HEB updates their page structure
  const products: unknown[] =
    nextData?.props?.pageProps?.initialData?.data?.products ??
    nextData?.props?.pageProps?.products ??
    [];

  return products.flatMap((p: unknown) => {
    const prod = p as Record<string, unknown>;
    const name = prod.name as string | undefined;
    const regular = (prod.averageRating as number) || (prod.price as number);
    const promo = prod.lowestPrice as number | undefined;

    if (!name || promo == null) return [];

    return [
      {
        store: "heb" as const,
        item: name,
        regularPrice: typeof regular === "number" ? regular : undefined,
        couponPrice: promo,
        savings:
          typeof regular === "number" ? Math.max(0, regular - promo) : undefined,
      },
    ];
  });
}
