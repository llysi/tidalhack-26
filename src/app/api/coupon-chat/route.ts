import { streamText, convertToModelMessages } from "ai";
import { z } from "zod/v4";
import { defaultModel } from "@/lib/featherless";
import type { Coupon } from "@/lib/coupons/types";

interface UserProfile {
  people?: string | null;
  budget?: string | null;
  car?: string | null;
}

const NUTRITION_PROFILES: Record<string, string> = {
  produce: "vitamins, fiber, antioxidants — essential for immunity and digestion",
  herbs: "flavor enhancement, anti-inflammatory compounds",
  meat: "complete protein, iron, zinc, B12 — muscle and energy",
  seafood: "lean protein, omega-3 fatty acids, iodine — heart and brain health",
  dairy: "calcium, protein, vitamin D — bones and satiety",
  bakery: "carbohydrates, quick energy — staple for meals",
  frozen: "convenient, retains most nutrients when flash-frozen",
  grains: "complex carbs, B vitamins, fiber — sustained energy",
  baking: "base ingredients for home-cooked meals",
  pantry: "shelf-stable staples — the backbone of any kitchen",
  beverages: "hydration",
  snacks: "quick energy, treats in moderation",
  specialty: "diverse cultural ingredients for varied cuisine",
};

interface ResolvedLocation {
  address: string;
  lat: number;
  lng: number;
  zip?: string;
}

async function geocode(address: string, key: string): Promise<ResolvedLocation | null> {
  const acRes = await fetch(`https://maps.googleapis.com/maps/api/place/autocomplete/json?${new URLSearchParams({ input: address, key })}`);
  if (!acRes.ok) return null;
  const acData = await acRes.json();
  if (acData.status !== "OK" || !acData.predictions?.length) return null;
  const placeId = acData.predictions[0].place_id as string;

  const detailRes = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?${new URLSearchParams({ place_id: placeId, fields: "geometry,formatted_address,address_components", key })}`);
  if (!detailRes.ok) return null;
  const detailData = await detailRes.json();
  if (detailData.status !== "OK") return null;

  const { lat, lng } = detailData.result.geometry.location;
  const zipComp = detailData.result.address_components?.find((c: { types: string[] }) => c.types.includes("postal_code"));
  return { address: detailData.result.formatted_address, lat, lng, zip: zipComp?.short_name };
}

export async function POST(req: Request) {
  try {
    const { messages, coupons, basket, profile, location } = await req.json();
    const list = (coupons as Coupon[]).slice(0, 150);
    const basketItems = (basket as Coupon[] | undefined) ?? [];
    const userProfile = (profile as UserProfile | undefined) ?? {};
    const userLocation = location as ResolvedLocation | null | undefined;

    // Build coupon list grouped by category
    const byCat = new Map<string, string[]>();
    for (const c of list) {
      const cat = c.category ?? "other";
      if (!byCat.has(cat)) byCat.set(cat, []);
      const price = c.couponPrice != null ? ` $${c.couponPrice.toFixed(2)}` : "";
      const snap = c.snapEligible ? " [SNAP]" : "";
      byCat.get(cat)!.push(`${c.item}${price}${snap} @ ${c.store}`);
    }

    const couponContext = Array.from(byCat.entries())
      .map(([cat, items]) => `[${cat.toUpperCase()}]\n${items.map(i => `  • ${i}`).join("\n")}`)
      .join("\n\n");

    const nutritionGuide = Object.entries(NUTRITION_PROFILES)
      .map(([cat, desc]) => `  • ${cat}: ${desc}`)
      .join("\n");

    // User profile section
    const profileLines: string[] = [];
    if (userProfile.people) profileLines.push(`- Shopping for: ${userProfile.people} people`);
    if (userProfile.budget) profileLines.push(`- Weekly budget: ${userProfile.budget}`);
    if (userProfile.car) profileLines.push(`- Has car for shopping: ${userProfile.car}`);
    const profileContext = profileLines.length > 0
      ? `USER PROFILE:\n${profileLines.join("\n")}`
      : "USER PROFILE:\n- No profile set yet";

    const missingProfile = !userProfile.people || !userProfile.budget || !userProfile.car;
    const hasLocation = !!userLocation?.address;

    // Location section
    const locationContext = hasLocation
      ? `LOCATION: ${userLocation!.address}`
      : "LOCATION: Not set yet";

    // Basket section
    const basketTotal = basketItems.reduce((s: number, c: Coupon) => s + (c.couponPrice ?? 0), 0);
    const basketContext = basketItems.length > 0
      ? `CURRENT BASKET (${basketItems.length} items, ~$${basketTotal.toFixed(2)}):\n${basketItems.map((c: Coupon) => `  • ${c.item} $${(c.couponPrice ?? 0).toFixed(2)} [${c.category ?? "?"}]`).join("\n")}`
      : "CURRENT BASKET:\n  (empty — user hasn't added anything yet)";

    const systemPrompt = `You are HoneyBear, a warm and knowledgeable grocery shopping assistant. You help users find food resources, plan meals on a budget, and discover local grocery deals.

═══════════════════════════════
${locationContext}
${profileContext}

${basketContext}
═══════════════════════════════

AVAILABLE DEALS THIS WEEK:
${couponContext}

═══════════════════════════════
NUTRITION GUIDE:
${nutritionGuide}
═══════════════════════════════

YOUR ROLE:
- You see the user's basket and available deals in real time
- Suggest items that complement what's already in their basket
- Build balanced meals: protein + produce + grains + dairy
- Prioritize SNAP-eligible items [SNAP] when relevant
- Be warm, practical, and concise. No fluff.
- If the user mentions dietary needs (vegetarian, gluten-free, etc.) — adjust immediately

ONBOARDING (ask ONE question at a time, never bundle):
${!hasLocation ? "- Location is NOT set. Ask for their full address (e.g. 123 Main St, Chicago, IL)." : "- Location is set \u2713"}
${hasLocation && missingProfile ? `- Profile incomplete. ${!userProfile.people ? "Ask how many people they're shopping for." : !userProfile.budget ? "Ask their weekly grocery budget." : "Ask if they have a car to visit multiple stores."}` : ""}
${hasLocation && !missingProfile ? "- All set! Ready to help with deals and meal planning." : ""}
- When the user provides their location/address — call setLocation immediately.
- When the user tells you their household size, budget, or transportation — call saveProfile immediately.

BASKET BUILDING:
- When the user asks you to build, suggest, or auto-fill a basket — call suggestBasket with 5-10 items.
- Pick items that cover protein + produce + grains + dairy when possible.
- Stay within their budget. Use ONLY coupon prices from the deals list for math.
- Each item must use the EXACT name and store from the deals list above.
- Include a brief reason for each item.

BUDGET MATH RULES (follow strictly):
- ONLY use the coupon sale prices shown above for ALL calculations
- NEVER estimate or guess any price — only reference exact prices from the deals list
- When discussing basket total, always show an itemized breakdown:
    Basket so far:
    • Item $X.XX
    ─────────────────
    Subtotal: $X.XX
    Remaining: $X.XX of $X budget`;

    const result = streamText({
      model: defaultModel,
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      tools: {
        setLocation: {
          description: "Geocode the user's address and set their location for finding local deals",
          inputSchema: z.object({
            address: z.string().describe("The user's city, zip code, or full address"),
          }),
          execute: async ({ address }) => {
            const key = process.env.GOOGLE_PLACES_API_KEY;
            if (!key) return { error: "Geocoding unavailable" };
            const loc = await geocode(address, key);
            if (!loc) return { error: "Could not find that address" };
            return loc;
          },
        },
        saveProfile: {
          description: "Save the user's profile: household size, weekly budget, and whether they have a car",
          inputSchema: z.object({
            people: z.string().optional().describe("Number of people in household, e.g. '2'"),
            budget: z.string().optional().describe("Weekly grocery budget, e.g. '$80'"),
            car: z.string().optional().describe("Whether they have a car: 'yes' or 'no'"),
          }),
          execute: async () => ({ saved: true }),
        },
        suggestBasket: {
          description: "Present a curated basket of grocery items for the user to add",
          inputSchema: z.object({
            items: z.array(z.object({
              item: z.string().describe("Exact item name from the deals list"),
              store: z.string().describe("Exact store name from the deals list"),
              price: z.number().describe("Coupon price in dollars"),
              reason: z.string().describe("Brief reason for including this item (1 sentence)"),
            })).describe("5-10 suggested items"),
            summary: z.string().describe("1-2 sentence overview of the suggested basket"),
          }),
          execute: async () => ({ displayed: true }),
        },
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    console.error("[coupon-chat] error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
