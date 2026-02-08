/**
 * Aldi weekly specials fetcher.
 *
 * To find the correct endpoint, open https://www.aldi.us/en/weekly-specials/
 * in Chrome DevTools → Network tab, filter by Fetch/XHR, and look for requests
 * returning specials/deals JSON. Update ALDI_SPECIALS_URL below.
 *
 * Current approach: fetch the weekly specials page and extract JSON from
 * embedded <script type="application/json"> or __NEXT_DATA__ tags.
 */

import type { Coupon } from "./types";

const ALDI_SPECIALS_URL = "https://www.aldi.us/en/weekly-specials/";

export async function fetchAldiCoupons(): Promise<Coupon[]> {
  const res = await fetch(ALDI_SPECIALS_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!res.ok) throw new Error(`Aldi fetch failed: ${res.status}`);

  const html = await res.text();

  // Try __NEXT_DATA__ first
  const nextMatch = html.match(
    /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/
  );
  if (nextMatch) {
    const nextData = JSON.parse(nextMatch[1]);
    const items: unknown[] =
      nextData?.props?.pageProps?.items ??
      nextData?.props?.pageProps?.products ??
      [];
    return parseAldiItems(items);
  }

  // Fallback: look for inline JSON array of specials
  const jsonMatch = html.match(/window\.__SPECIALS__\s*=\s*(\[[\s\S]*?\]);/);
  if (jsonMatch) {
    return parseAldiItems(JSON.parse(jsonMatch[1]));
  }

  throw new Error("Aldi: could not locate weekly specials data in page");
}

function parseAldiItems(items: unknown[]): Coupon[] {
  return items.flatMap((item: unknown) => {
    const i = item as Record<string, unknown>;
    const name = (i.name ?? i.title ?? i.productName) as string | undefined;
    const regular = (i.regularPrice ?? i.price ?? i.originalPrice) as
      | number
      | undefined;
    const sale = (i.salePrice ?? i.specialPrice ?? i.price) as
      | number
      | undefined;

    if (!name || sale == null) return [];

    return [
      {
        store: "aldi" as const,
        item: name,
        regularPrice: regular,
        couponPrice: sale,
        savings:
          regular != null ? Math.max(0, regular - sale) : undefined,
        expires: (i.validUntil ?? i.expires ?? i.endDate) as string | undefined,
      },
    ];
  });
}
