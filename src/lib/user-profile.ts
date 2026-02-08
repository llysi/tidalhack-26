export interface UserProfile {
  people: string | null;
  budget: string | null;
  car: string | null;
}

export function getProfile(): UserProfile {
  try {
    return {
      people: localStorage.getItem("user_people"),
      budget: localStorage.getItem("user_budget"),
      car: localStorage.getItem("user_car"),
    };
  } catch {
    return { people: null, budget: null, car: null };
  }
}

export function saveProfile(updates: Partial<UserProfile>) {
  try {
    if (updates.people != null) localStorage.setItem("user_people", updates.people);
    if (updates.budget != null) localStorage.setItem("user_budget", updates.budget);
    if (updates.car != null) localStorage.setItem("user_car", updates.car);
  } catch {}
}

export function isProfileComplete(p: UserProfile): boolean {
  return !!(p.people && p.budget && p.car);
}

/** Returns the first unanswered question to ask the user */
export function nextProfileQuestion(p: UserProfile, hasLocation?: boolean): string | null {
  if (!hasLocation) return "Hi! I'm HoneyBear 👋 To get started, what's your full address? (e.g. 123 Main St, Chicago, IL)";
  if (!p.people) return "Got it! How many people are you shopping for?";
  if (!p.budget) return "What's your weekly grocery budget?";
  if (!p.car) return "Do you have a car for grocery trips?";
  return null;
}
