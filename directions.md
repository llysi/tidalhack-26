Setup:

# 1. Install dependencies
npm install

# 2. Create a .env.local file for the API key
#    (this file is gitignored, so each person creates their own)
echo "FEATHERLESS_API_KEY=your-key-here" > .env.local

# 3. Start the dev server
npm run dev

# 4. Open in browser
#    http://localhost:3000
#    (Ctrl+C in terminal to stop)

Project Overview

This is a Next.js 16 app (TypeScript + Tailwind CSS) that builds a conversational chatbot to help users find food resources (pantries, affordable groceries, meal programs).

Key tech:

Next.js App Router — pages live in src/app/
Vercel AI SDK (ai + @ai-sdk/openai-compatible) — handles streaming chat with the LLM
Featherless AI — OpenAI-compatible API running Llama 3.1 70B Instruct
Tailwind CSS v4 — styling

