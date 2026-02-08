import { searchPlaces, type PlaceResult } from "./google-places";
import { searchSnapRetailers, type SnapRetailer } from "./usda-snap";

export type FoodResource = PlaceResult | SnapRetailer;

export interface SearchResults {
  places: PlaceResult[];
  snapRetailers: SnapRetailer[];
  errors: string[];
}

/**
 * Search both Google Places and USDA SNAP APIs in parallel.
 * Returns results from whichever APIs succeed, plus any errors.
 */
export async function searchFoodResources(
  query: string,
  lat: number,
  lng: number,
  radiusMeters = 8000
): Promise<SearchResults> {
  const errors: string[] = [];

  const [placesResult, snapResult] = await Promise.allSettled([
    searchPlaces(query, lat, lng, radiusMeters),
    searchSnapRetailers(lat, lng, radiusMeters),
  ]);

  const places =
    placesResult.status === "fulfilled" ? placesResult.value : [];
  if (placesResult.status === "rejected") {
    errors.push(`Google Places: ${placesResult.reason}`);
  }

  const snapRetailers =
    snapResult.status === "fulfilled" ? snapResult.value : [];
  if (snapResult.status === "rejected") {
    errors.push(`USDA SNAP: ${snapResult.reason}`);
  }

  return { places, snapRetailers, errors };
}
