import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

// Creates the Featherless AI provider (OpenAI-compatible API).
// Make sure FEATHERLESS_API_KEY is set in your .env.local file.
export const featherless = createOpenAICompatible({
  name: "featherless",
  baseURL: "https://api.featherless.ai/v1",
  apiKey: process.env.FEATHERLESS_API_KEY,
});

// Default model — Llama 3.1 70B Instruct
// TODO: Confirm the exact model ID available on your Featherless account.
export const defaultModel = featherless("meta-llama/Meta-Llama-3.1-70B-Instruct");
