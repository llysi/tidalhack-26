export interface PlaceResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string;
  hours?: string[];
  types?: string[];
  source: "google_places";
}

/**
 * Search for places using Google Places Text Search (New) API.
 * Requires GOOGLE_PLACES_API_KEY in env.
 */
export async function searchPlaces(
  query: string,
  lat: number,
  lng: number,
  radiusMeters = 8000,
  maxResults = 10
): Promise<PlaceResult[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_PLACES_API_KEY is not set");
  }

  const res = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.displayName,places.formattedAddress,places.location,places.nationalPhoneNumber,places.regularOpeningHours,places.types",
      },
      body: JSON.stringify({
        textQuery: query,
        locationBias: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: radiusMeters,
          },
        },
        maxResultCount: maxResults,
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Places API error (${res.status}): ${text}`);
  }

  const data = await res.json();
  const places = data.places ?? [];

  return places.map(
    (place: {
      displayName?: { text?: string };
      formattedAddress?: string;
      location?: { latitude?: number; longitude?: number };
      nationalPhoneNumber?: string;
      regularOpeningHours?: { weekdayDescriptions?: string[] };
      types?: string[];
    }): PlaceResult => ({
      name: place.displayName?.text ?? "Unknown",
      address: place.formattedAddress ?? "",
      lat: place.location?.latitude ?? 0,
      lng: place.location?.longitude ?? 0,
      phone: place.nationalPhoneNumber,
      hours: place.regularOpeningHours?.weekdayDescriptions,
      types: place.types,
      source: "google_places",
    })
  );
}
