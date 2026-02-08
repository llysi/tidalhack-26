/**
 * Walmart rollbacks/deals fetcher.
 *
 * To find the correct endpoint, open https://www.walmart.com/browse/food/rollback/
 * in Chrome DevTools → Network tab, filter by Fetch/XHR. Walmart uses a GraphQL
 * API or REST endpoints like /api/2/pages/browse. Update WALMART_ROLLBACK_URL below.
 *
 * Current approach: fetch the rollback browse page and extract __NEXT_DATA__ JSON.
 */

import type { Coupon } from "./types";

const WALMART_ROLLBACK_URL =
  "https://www.walmart.com/browse/food/rollback/976759_976794_1044183";

export async function fetchWalmartCoupons(): Promise<Coupon[]> {
  const res = await fetch(WALMART_ROLLBACK_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!res.ok) throw new Error(`Walmart fetch failed: ${res.status}`);

  const html = await res.text();

  // Walmart embeds product data in __NEXT_DATA__
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) throw new Error("Walmart: __NEXT_DATA__ not found in page");

  const nextData = JSON.parse(match[1]);

  // Path varies by page version — try multiple known locations
  const items: unknown[] =
    nextData?.props?.pageProps?.initialData?.searchResult?.itemStacks?.[0]
      ?.items ??
    nextData?.props?.pageProps?.initialData?.data?.contentLayout?.modules?.find(
      (m: Record<string, unknown>) => m.type === "ItemCarousel"
    )?.configs?.products ??
    [];

  return items.flatMap((item: unknown) => {
    const i = item as Record<string, unknown>;
    const name = (i.name ?? i.title) as string | undefined;
    const priceInfo = i.priceInfo as Record<string, unknown> | undefined;
    const currentPrice = (priceInfo?.currentPrice as Record<string, unknown>)
      ?.price as number | undefined;
    const wasPrice = (priceInfo?.wasPrice as Record<string, unknown>)?.price as
      | number
      | undefined;

    // Also handle flat price fields
    const salePrice = (currentPrice ?? i.salePrice ?? i.price) as
      | number
      | undefined;
    const regularPrice = (wasPrice ?? i.wasPrice ?? i.originalPrice) as
      | number
      | undefined;

    if (!name || salePrice == null) return [];

    return [
      {
        store: "walmart" as const,
        item: name,
        regularPrice,
        couponPrice: salePrice,
        savings:
          regularPrice != null
            ? Math.max(0, regularPrice - salePrice)
            : undefined,
      },
    ];
  });
}
