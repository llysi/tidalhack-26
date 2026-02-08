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
      { headers: { "User-Agent": "ADI-I/1.0" } }
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
  const postalCode = searchParams.get("zip");
  if (!postalCode) return Response.json({ coupons: [], errors: ["zip parameter is required"] });
  const query = searchParams.get("q") ?? "";
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");

  try {
    let coupons = await fetchFlippCoupons(postalCode, query);

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
