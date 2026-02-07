import pantryData from "./pantries.json";

// TODO: Expand pantries.json to 15-20 entries covering a variety of
// types (pantry, grocery, meal_program), neighborhoods, and inventory tags.

export interface Pantry {
  id: string;
  name: string;
  type: "pantry" | "grocery" | "meal_program";
  address: string;
  lat: number;
  lng: number;
  hours: string;
  phone: string;
  inventory_tags: string[];
  accepts_snap: boolean;
  budget_friendly: boolean;
  notes: string;
}

export const pantries: Pantry[] = pantryData as Pantry[];

/**
 * Search pantries by optional filters.
 * TODO: Implement filtering logic — match on type, inventory_tags,
 * accepts_snap, budget_friendly, and proximity to a lat/lng.
 */
export function searchPantries(filters: {
  type?: string;
  tags?: string[];
  accepts_snap?: boolean;
  budget_friendly?: boolean;
  lat?: number;
  lng?: number;
}): Pantry[] {
  let results = [...pantries];

  if (filters.type) {
    results = results.filter((p) => p.type === filters.type);
  }

  if (filters.tags && filters.tags.length > 0) {
    results = results.filter((p) =>
      filters.tags!.some((tag) => p.inventory_tags.includes(tag))
    );
  }

  if (filters.accepts_snap !== undefined) {
    results = results.filter((p) => p.accepts_snap === filters.accepts_snap);
  }

  if (filters.budget_friendly !== undefined) {
    results = results.filter(
      (p) => p.budget_friendly === filters.budget_friendly
    );
  }

  // TODO: Add proximity-based sorting if lat/lng are provided.
  // Could use a simple haversine distance calculation.

  return results;
}

/**
 * Get a single pantry by ID.
 */
export function getPantryById(id: string): Pantry | undefined {
  return pantries.find((p) => p.id === id);
}
