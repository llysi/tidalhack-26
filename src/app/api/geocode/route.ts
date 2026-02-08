async function placeDetails(placeId: string, key: string) {
  const detailParams = new URLSearchParams({
    place_id: placeId,
    fields: "geometry,formatted_address,address_components",
    key,
  });
  const res = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?${detailParams}`);
  if (!res.ok) return null;
  const data = await res.json();
  if (data.status !== "OK") return null;

  const result = data.result;
  const { lat, lng } = result.geometry.location;
  const address = result.formatted_address as string;
  const zipComp = result.address_components?.find((c: { types: string[] }) =>
    c.types.includes("postal_code")
  );
  return { address, lat, lng, zip: zipComp?.short_name as string | undefined };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return Response.json(null);

  // Direct place_id lookup (from autocomplete selection)
  const directId = searchParams.get("place_id");
  if (directId) {
    try {
      return Response.json(await placeDetails(directId, key));
    } catch {
      return Response.json(null);
    }
  }

  const q = searchParams.get("q");
  if (!q) return Response.json(null);

  try {
    // Autocomplete to get place_id
    const acParams = new URLSearchParams({ input: q, key, types: "address" });
    const acRes = await fetch(`https://maps.googleapis.com/maps/api/place/autocomplete/json?${acParams}`);
    if (!acRes.ok) return Response.json(null);
    const acData = await acRes.json();
    if (acData.status !== "OK" || !acData.predictions?.length) return Response.json(null);

    const placeId = acData.predictions[0].place_id as string;

    return Response.json(await placeDetails(placeId, key));
  } catch {
    return Response.json(null);
  }
}
