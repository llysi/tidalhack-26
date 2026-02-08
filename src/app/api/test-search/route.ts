import { searchPlaces, lookupPlacePhotoName } from "@/lib/google-places";
import { searchSnapRetailers } from "@/lib/usda-snap";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = parseFloat(searchParams.get("lat") ?? "29.7604");
    const lng = parseFloat(searchParams.get("lng") ?? "-95.3698");
    const errors: string[] = [];

    const [placesResult, snapResult] = await Promise.allSettled([
      searchPlaces("food pantry", lat, lng),
      searchSnapRetailers(lat, lng),
    ]);

    const places =
      placesResult.status === "fulfilled" ? placesResult.value : [];
    if (placesResult.status === "rejected") {
      errors.push(`Google Places: ${placesResult.reason}`);
    }

    let snap = snapResult.status === "fulfilled" ? snapResult.value : [];
    if (snapResult.status === "rejected") {
      errors.push(`USDA SNAP: ${snapResult.reason}`);
    }

    // Enrich first 5 SNAP results with photos (cap to avoid rate limits)
    snap = await Promise.all(
      snap.map(async (s, i) => ({
        ...s,
        photoName: i < 5
          ? await lookupPlacePhotoName(s.name, s.address).catch(() => undefined)
          : undefined,
      }))
    );

    return Response.json({ places, snap, errors });
  } catch (err) {
    return Response.json({ places: [], snap: [], errors: [String(err)] });
  }
}
