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

/** Geocode a free-text address using Nominatim (no API key needed). */
export async function geocodeAddress(
  address: string
): Promise<ResolvedLocation | null> {
  const params = new URLSearchParams({ q: address, format: "json", limit: "1", addressdetails: "1" });
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    { headers: { "User-Agent": "ADI-I/1.0" } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.length) return null;

  const result = data[0];
  const lat = parseFloat(result.lat);
  const lng = parseFloat(result.lon);
  let zip = result.address?.postcode as string | undefined;

  // If no zip from forward geocode, try reverse geocoding
  if (!zip) {
    try {
      const rev = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        { headers: { "User-Agent": "ADI-I/1.0" } }
      );
      if (rev.ok) {
        const revData = await rev.json();
        zip = revData.address?.postcode;
      }
    } catch {}
  }

  return {
    address: result.display_name ?? address,
    lat,
    lng,
    zip,
  };
}
