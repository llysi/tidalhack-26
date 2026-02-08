import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

// Creates the Featherless AI provider (OpenAI-compatible API).
// Make sure FEATHERLESS_API_KEY is set in your .env.local file.
export const featherless = createOpenAICompatible({
  name: "featherless",
  baseURL: "https://api.featherless.ai/v1",
  apiKey: process.env.FEATHERLESS_API_KEY,
});

// Change this to switch models. Use any model ID from https://featherless.ai/models
export const MODEL_ID = "Qwen/Qwen2.5-72B-Instruct";

export const defaultModel = featherless(MODEL_ID);
