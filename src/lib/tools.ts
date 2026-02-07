import { z } from "zod/v4";
import type { ToolSet } from "ai";
import { searchPantries, getPantryById } from "@/data/pantries";

/**
 * Tools the LLM can call during conversation.
 * Used in the intake phase and results phase respectively.
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
      // This tool's result is handled client-side to trigger navigation.
      // The summary is passed along so the results page knows the user's needs.
      return { action: "route_to_results", summary };
    },
  },
};

// --- Results phase tools ---

export const resultsTools: ToolSet = {
  search_pantries: {
    description:
      "Search for food pantries, grocery stores, or meal programs. Filter by type, tags, SNAP acceptance, and budget-friendliness.",
    inputSchema: z.object({
      type: z
        .enum(["pantry", "grocery", "meal_program"])
        .optional()
        .describe("Filter by resource type"),
      tags: z
        .array(z.string())
        .optional()
        .describe(
          "Filter by inventory tags (e.g. 'fresh produce', 'halal', 'vegetarian options')"
        ),
      accepts_snap: z
        .boolean()
        .optional()
        .describe("Filter for places that accept SNAP/EBT"),
      budget_friendly: z
        .boolean()
        .optional()
        .describe("Filter for budget-friendly options"),
    }),
    execute: async (filters: {
      type?: string;
      tags?: string[];
      accepts_snap?: boolean;
      budget_friendly?: boolean;
    }) => {
      const results = searchPantries(filters);
      return { results };
    },
  },

  get_pantry_info: {
    description:
      "Get full details about a specific food resource by its ID.",
    inputSchema: z.object({
      id: z.string().describe("The pantry/resource ID"),
    }),
    execute: async ({ id }: { id: string }) => {
      const pantry = getPantryById(id);
      if (!pantry) {
        return { error: "Resource not found" };
      }
      return { pantry };
    },
  },
};
