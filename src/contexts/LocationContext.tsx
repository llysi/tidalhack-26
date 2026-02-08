"use client";

import { createContext, useContext, useState, useEffect } from "react";

export interface ResolvedLocation {
  address: string; // user-entered address
  lat: number;
  lng: number;
  zip?: string; // extracted from geocode result if available
}

export const RADIUS_OPTIONS = [5, 10, 25, 50] as const;
export type RadiusMiles = (typeof RADIUS_OPTIONS)[number];

interface LocationContextValue {
  location: ResolvedLocation | null;
  setLocation: (loc: ResolvedLocation | null) => void;
  radius: RadiusMiles;
  setRadius: (r: RadiusMiles) => void;
}

const LocationContext = createContext<LocationContextValue>({
  location: null,
  setLocation: () => {},
  radius: 10,
  setRadius: () => {},
});

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocationState] = useState<ResolvedLocation | null>(null);
  const [radius, setRadiusState] = useState<RadiusMiles>(10);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("user-location");
      if (saved) setLocationState(JSON.parse(saved));
      const savedRadius = localStorage.getItem("user-radius");
      if (savedRadius) setRadiusState(Number(savedRadius) as RadiusMiles);
    } catch {}
  }, []);

  function setLocation(loc: ResolvedLocation | null) {
    setLocationState(loc);
    if (loc) localStorage.setItem("user-location", JSON.stringify(loc));
    else localStorage.removeItem("user-location");
  }

  function setRadius(r: RadiusMiles) {
    setRadiusState(r);
    localStorage.setItem("user-radius", String(r));
  }

  return (
    <LocationContext.Provider value={{ location, setLocation, radius, setRadius }}>
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
