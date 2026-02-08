"use client";

import { createContext, useContext, useState, useEffect } from "react";

export interface ResolvedLocation {
  address: string; // user-entered address
  lat: number;
  lng: number;
  zip?: string; // extracted from geocode result if available
}

interface LocationContextValue {
  location: ResolvedLocation | null;
  setLocation: (loc: ResolvedLocation | null) => void;
}

const LocationContext = createContext<LocationContextValue>({
  location: null,
  setLocation: () => {},
});

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocationState] = useState<ResolvedLocation | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("user-location");
      if (saved) setLocationState(JSON.parse(saved));
    } catch {}
  }, []);

  function setLocation(loc: ResolvedLocation | null) {
    setLocationState(loc);
    if (loc) localStorage.setItem("user-location", JSON.stringify(loc));
    else localStorage.removeItem("user-location");
  }

  return (
    <LocationContext.Provider value={{ location, setLocation }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  return useContext(LocationContext);
}

/** Geocode a free-text address via server-side API route (avoids CORS/ad-blocker issues). */
export async function geocodeAddress(
  address: string
): Promise<ResolvedLocation | null> {
  const res = await fetch(`/api/geocode?q=${encodeURIComponent(address)}`);
  if (!res.ok) return null;
  return res.json();
}
