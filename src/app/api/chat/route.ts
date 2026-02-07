import { streamText } from "ai";
import { defaultModel } from "@/lib/featherless";
import { intakeTools, resultsTools } from "@/lib/tools";
import { INTAKE_PROMPT, RESULTS_PROMPT } from "@/lib/prompts";

export async function POST(req: Request) {
  const { messages, phase } = await req.json();

  // Pick the system prompt and tools based on the conversation phase
  const isIntake = phase !== "results";
  const systemPrompt = isIntake ? INTAKE_PROMPT : RESULTS_PROMPT;
  const tools = isIntake ? intakeTools : resultsTools;

  const result = streamText({
    model: defaultModel,
    system: systemPrompt,
    messages,
    tools,
  });

  return result.toUIMessageStreamResponse();
}
