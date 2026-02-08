export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  if (!q || q.length < 2) return Response.json([]);

  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return Response.json([]);

  try {
    const params = new URLSearchParams({ input: q, key, types: "address" });
    const res = await fetch(`https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`);
    if (!res.ok) return Response.json([]);
    const data = await res.json();
    if (data.status !== "OK") return Response.json([]);

    return Response.json(
      data.predictions.slice(0, 5).map((p: { place_id: string; description: string }) => ({
        placeId: p.place_id,
        description: p.description,
      }))
    );
  } catch {
    return Response.json([]);
  }
}
