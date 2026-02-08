import { streamText, convertToModelMessages } from "ai";
import { defaultModel } from "@/lib/featherless";

export async function POST(req: Request) {
  try {
    const { messages, coupons, profile } = await req.json();

    const budget = profile?.budget || "0";
    const couponList = Array.isArray(coupons) ? coupons : [];

    // Map shortened keys back to strings for the AI
    const couponMenu = couponList
      .map((c: any) => `- ${c.i} | $${Number(c.p).toFixed(2)} | Store: ${c.s}`)
      .join("\n");

    const systemPrompt = `
      You are HoneyBear. Confirm data by listing the first 3 items you see.
      
      USER BUDGET: ${budget}
      AVAILABLE DEALS:
      ${couponList.length > 0 ? couponMenu : "EMPTY"}

      STRICT RULES:
      1. If list is EMPTY, say: "Honey pot is empty! Waiting for deals..."
      2. Provide 2 combinations under ${budget}.
      3. SHOW MATH: (Item A + Item B = Total).
    `;

    const result = await streamText({
      model: defaultModel,
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    return Response.json({ error: "API Route Error" }, { status: 500 });
  }
}