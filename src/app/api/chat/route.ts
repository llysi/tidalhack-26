import { streamText } from "ai";
import { defaultModel } from "@/lib/featherless";
import { intakeTools, resultsTools } from "@/lib/tools";
import { INTAKE_PROMPT, RESULTS_PROMPT } from "@/lib/prompts";

export async function POST(req: Request) {
  const { messages, phase, location } = await req.json();

  // Pick the system prompt and tools based on the conversation phase
  const isIntake = phase !== "results";
  let systemPrompt = isIntake ? INTAKE_PROMPT : RESULTS_PROMPT;
  const tools = isIntake ? intakeTools : resultsTools;

  if (location?.lat && location?.lng) {
    systemPrompt += `\n\nThe user's location: ${location.address} (lat: ${location.lat}, lng: ${location.lng}). Use these coordinates directly for any searches — do not ask for their location.`;
  }

  const result = streamText({
    model: defaultModel,
    system: systemPrompt,
    messages,
    tools,
  });

  return result.toUIMessageStreamResponse();
}
