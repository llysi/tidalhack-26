export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name");

  if (!name) return new Response("Missing name", { status: 400 });

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return new Response("Missing API key", { status: 500 });

  const url = `https://places.googleapis.com/v1/${name}/media?maxWidthPx=400&key=${apiKey}`;
  const res = await fetch(url);

  if (!res.ok) return new Response("Photo fetch failed", { status: res.status });

  const buffer = await res.arrayBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
