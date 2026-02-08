import { streamText } from "ai";
import { defaultModel } from "@/lib/featherless";
import type { Coupon } from "@/lib/coupons/types";

const NUTRITION_PROFILES: Record<string, string> = {
  produce: "vitamins, fiber, antioxidants",
  herbs: "flavor, anti-inflammatory compounds",
  meat: "protein, iron, zinc, B12",
  seafood: "protein, omega-3 fatty acids, iodine",
  dairy: "calcium, protein, vitamin D",
  bakery: "carbohydrates, quick energy",
  frozen: "convenient, retains most nutrients",
  grains: "complex carbs, B vitamins, fiber",
  baking: "energy source, used for home cooking",
  pantry: "shelf-stable staples for balanced meals",
  beverages: "hydration",
  prepared: "ready-to-eat convenience",
  snacks: "quick energy, treats",
  specialty: "diverse cultural ingredients",
};

export async function POST(req: Request) {
  try {
    const { messages, coupons } = await req.json();
    const list = (coupons as Coupon[]).slice(0, 120); // cap tokens

    // Build a compact coupon list grouped by category
    const byCat = new Map<string, string[]>();
    for (const c of list) {
      const cat = c.category ?? "other";
      if (!byCat.has(cat)) byCat.set(cat, []);
      const price = c.couponPrice != null ? ` $${c.couponPrice.toFixed(2)}` : "";
      byCat.get(cat)!.push(`${c.item}${price} (${c.store})`);
    }

    const couponContext = Array.from(byCat.entries())
      .map(([cat, items]) => `**${cat}**: ${items.join(", ")}`)
      .join("\n");

    const nutritionGuide = Object.entries(NUTRITION_PROFILES)
      .map(([cat, desc]) => `${cat}=${desc}`)
      .join("; ");

    const systemPrompt = `You are a friendly grocery shopping assistant helping users build a balanced, budget-friendly basket from current local deals.

Available deals by category:
${couponContext}

Nutrition guide: ${nutritionGuide}

When recommending a basket:
- Aim for variety across categories (produce, protein, dairy, grains)
- Prefer items with listed sale prices for budget impact
- Suggest 5-8 items with a rough total cost estimate
- Be warm, concise, and practical
- If the user mentions dietary restrictions, adjust accordingly`;

    const result = streamText({
      model: defaultModel,
      system: systemPrompt,
      messages,
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    console.error("[coupon-chat] error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
