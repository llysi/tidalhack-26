import { searchPlaces, lookupPlacePhotoName } from "@/lib/google-places";
import { searchSnapRetailers } from "@/lib/usda-snap";

export async function GET(req: Request) {
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

  // Enrich SNAP results with photos from Google Places
  snap = await Promise.all(
    snap.map(async (s) => ({
      ...s,
      photoName: await lookupPlacePhotoName(s.name, s.address).catch(() => undefined),
    }))
  );

  return Response.json({ places, snap, errors });
}
