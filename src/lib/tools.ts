import { z } from "zod/v4";
import type { ToolSet } from "ai";
import { searchFoodResources } from "./search";

/**
 * Tools the LLM can call during conversation.
 */

// --- Intake phase tool ---

export const intakeTools: ToolSet = {
  route_to_results: {
    description:
      "Call this when the intake conversation is complete and you have enough info to show results. Include a summary of the user's needs.",
    inputSchema: z.object({
      summary: z
        .string()
        .describe(
          "A brief summary of what the user is looking for (location, food type, budget, dietary needs, etc.)"
        ),
    }),
    execute: async ({ summary }: { summary: string }) => {
      return { action: "route_to_results", summary };
    },
  },
};

// --- Results phase tools ---

export const resultsTools: ToolSet = {
  search_food_resources: {
    description:
      "Search for food pantries, grocery stores, meal programs, and SNAP/EBT retailers near a location. Returns results from Google Places and the USDA SNAP database.",
    inputSchema: z.object({
      query: z
        .string()
        .describe(
          "What to search for, e.g. 'food pantry', 'soup kitchen', 'halal grocery store'"
        ),
      lat: z.number().describe("Latitude of the search center"),
      lng: z.number().describe("Longitude of the search center"),
    }),
    execute: async ({
      query,
      lat,
      lng,
    }: {
      query: string;
      lat: number;
      lng: number;
    }) => {
      const results = await searchFoodResources(query, lat, lng);
      return results;
    },
  },
};
