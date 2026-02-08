export interface SnapRetailer {
  name: string;
  address: string;
  lat: number;
  lng: number;
  city: string;
  state: string;
  zip: string;
  photoName?: string;
  source: "usda_snap";
}

// USDA SNAP FeatureServer (field names updated Sep 2023, no API key required)
const ARCGIS_BASE =
  "https://services1.arcgis.com/RLQu0rK7h4kbsBq5/arcgis/rest/services/snap_retailer_location_data/FeatureServer/0/query";

export async function searchSnapRetailers(
  lat: number,
  lng: number,
  radiusMeters = 8000,
  maxResults = 20
): Promise<SnapRetailer[]> {
  const offset = radiusMeters / 111000;
  const bbox = `${lng - offset},${lat - offset},${lng + offset},${lat + offset}`;

  const params = new URLSearchParams({
    where: "1=1",
    geometry: bbox,
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "Store_Name,Store_Street_Address,City,State,Zip_Code,Longitude,Latitude",
    resultRecordCount: String(maxResults),
    f: "json",
  });

  const res = await fetch(`${ARCGIS_BASE}?${params}`);

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`[SNAP API ERROR] Status ${res.status}:`, errorText);
    throw new Error(`USDA SNAP error (${res.status})`);
  }

  const data = await res.json();

  if (data.error) {
    throw new Error(`USDA SNAP API error: ${data.error.message} (code ${data.error.code})`);
  }

  return (data.features ?? []).map((f: { attributes: Record<string, string | number> }): SnapRetailer => {
    const a = f.attributes;
    return {
      name: String(a.Store_Name ?? "Unknown"),
      address: [a.Store_Street_Address, a.City, a.State, a.Zip_Code].filter(Boolean).join(", "),
      lat: Number(a.Latitude ?? 0),
      lng: Number(a.Longitude ?? 0),
      city: String(a.City ?? ""),
      state: String(a.State ?? ""),
      zip: String(a.Zip_Code ?? ""),
      source: "usda_snap",
    };
  });
}