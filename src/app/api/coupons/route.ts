import { fetchFlippCoupons } from "@/lib/coupons/flipp";

async function findNearestStore(
  query: string,
  lat: number,
  lng: number
): Promise<string | undefined> {
  const delta = 0.15; // ~16 km bounding box
  const viewbox = `${lng - delta},${lat + delta},${lng + delta},${lat - delta}`;
  const params = new URLSearchParams({
    q: query,
    format: "json",
    limit: "1",
    viewbox,
    bounded: "1",
    addressdetails: "1",
  });
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      { headers: { "User-Agent": "HoneyBear/1.0" } }
    );
    if (!res.ok) return undefined;
    const data = await res.json();
    if (!data.length) return undefined;
    return data[0].display_name as string;
  } catch {
    return undefined;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  let postalCode = searchParams.get("zip");
  const query = searchParams.get("q") ?? "";
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");

  // If no postal code provided, try to reverse geocode from coordinates
  if (!postalCode && !isNaN(lat) && !isNaN(lng)) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
        { headers: { "User-Agent": "HoneyBear/1.0" } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.address?.postcode) {
          postalCode = data.address.postcode;
        }
      }
    } catch {
      /* skip reverse geocoding errors */
    }
  }

  if (!postalCode) return Response.json({ coupons: [], errors: ["No postal code available for location"] });

  try {
    let coupons = await fetchFlippCoupons(postalCode, query);

    // Fetch sale_story from Flipp item detail API for "see store" items
    await Promise.all(
      coupons
        .filter((c) => c.couponPrice == null && c.itemId)
        .map(async (c) => {
          try {
            const res = await fetch(
              `https://backflipp.wishabi.com/flipp/items/${c.itemId}`,
              { headers: { "User-Agent": "Mozilla/5.0", Referer: "https://flipp.com/", Accept: "application/json" } }
            );
            if (!res.ok) return;
            const data = await res.json();
            const item = data.item ?? data;
            if (item.sale_story) c.dealText = item.sale_story;
            if (item.current_price && !c.couponPrice) c.couponPrice = parseFloat(item.current_price) || undefined;
          } catch { /* skip */ }
        })
    );

    // Look up exact store branch addresses via Nominatim if coordinates available
    if (!isNaN(lat) && !isNaN(lng)) {
      const storeNames = [...new Set(coupons.map((c) => c.store))];
      const storeAddresses: Record<string, string> = {};
      await Promise.all(
        storeNames.map(async (name) => {
          const addr = await findNearestStore(name, lat, lng);
          if (addr) storeAddresses[name] = addr;
        })
      );
      coupons = coupons.map((c) =>
        c.storeAddress ? c : { ...c, storeAddress: storeAddresses[c.store] }
      );
    }

    return Response.json({ coupons, errors: [] });
  } catch (err) {
    return Response.json({ coupons: [], errors: [String(err)] });
  }
}
