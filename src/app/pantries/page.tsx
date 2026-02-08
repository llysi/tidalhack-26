"use client";

import { useState, useEffect } from "react";
import { useLocation } from "@/contexts/LocationContext";

interface PlaceResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string;
  hours?: string[];
  photoName?: string;
}

interface SnapResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
  photoName?: string;
}

interface PlacesData {
  places: PlaceResult[];
  snap: SnapResult[];
  errors: string[];
}

const placesCache = new Map<string, PlacesData>();

function distanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function PantriesPage() {
  const { location, radius } = useLocation();
  const cacheKey = location ? `${location.lat},${location.lng},${radius}` : null;
  const [data, setData] = useState<PlacesData | null>(() =>
    cacheKey ? placesCache.get(cacheKey) ?? null : null
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!location || !cacheKey) return;
    if (placesCache.has(cacheKey)) {
      setData(placesCache.get(cacheKey)!);
      return;
    }
    setLoading(true);
    fetch(`/api/test-search?lat=${location.lat}&lng=${location.lng}&radius=${radius * 1609}`)
      .then((res) => res.json())
      .then((d) => {
        placesCache.set(cacheKey, d);
        setData(d);
      })
      .catch((err) => setData({ places: [], snap: [], errors: [String(err)] }))
      .finally(() => setLoading(false));
  }, [cacheKey]);

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-8 bg-background min-h-screen">
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-zinc-200 border-t-foreground rounded-full animate-spin" />
            <p className="text-sm font-black text-foreground uppercase tracking-widest">Updating Map...</p>
          </div>
        </div>
      )}

      {/* Global Header */}
      <header className="mb-10 w-full border-b border-zinc-200 pb-8">
        <h1 className="text-5xl font-black tracking-tighter text-foreground leading-none">
          Resources
        </h1>
        <div className="flex items-center gap-3 mt-4">
          <span className="px-2 py-1 bg-accent/10 text-accent text-[10px] font-black uppercase rounded tracking-widest">
            Community Support
          </span>
          <p className="text-sm text-zinc-500 font-medium italic">
            {location ? `Exploring resources near ${location.address.split(",")[0]}` : "Set location to find local support"}
          </p>
        </div>
      </header>

      {data && data.errors.length > 0 && (
        <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-bold uppercase tracking-tight">
          {data.errors.map((err, i) => <p key={i}>{err}</p>)}
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          
          {/* Section: Food Pantries */}
          <section>
            <div className="flex justify-between items-end mb-6">
              <h2 className="text-xl font-black text-foreground uppercase tracking-tight">Food Pantries</h2>
              <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 px-2 py-1 rounded">{data.places.length} FOUND</span>
            </div>
            
            <div className="space-y-4">
              {data.places.length === 0 ? (
                <div className="p-12 border-2 border-dashed border-zinc-100 rounded-[2rem] text-center text-zinc-400 italic">No pantries found in this radius.</div>
              ) : (
                data.places.map((p, i) => (
                  <div key={i} className="group p-5 bg-white border border-zinc-100 rounded-[1.5rem] hover:border-accent/30 hover:shadow-xl transition-all duration-300">
                    <div className="flex gap-5">
                      {p.photoName ? (
                        <img
                          src={`/api/photo?name=${encodeURIComponent(p.photoName)}`}
                          alt=""
                          className="w-24 h-24 object-cover rounded-2xl flex-shrink-0"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-zinc-50 rounded-2xl flex items-center justify-center text-3xl grayscale opacity-20">🥫</div>
                      )}
                      <div className="flex-1">
                        <div className="flex justify-between items-start gap-2">
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.name} ${p.address}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-base leading-tight text-foreground group-hover:text-accent transition-colors"
                          >
                            {p.name}
                          </a>
                          <p className="text-right text-accent font-black text-xs shrink-0 whitespace-nowrap">
                            {location ? `${distanceMiles(location.lat, location.lng, p.lat, p.lng).toFixed(1)} MI` : "—"}
                          </p>
                        </div>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">{p.address}</p>
                        
                        <div className="mt-4 flex flex-wrap gap-2 items-center">
                          {p.phone && (
                            <span className="text-[10px] font-black text-zinc-500 border border-zinc-100 px-2 py-1 rounded uppercase">{p.phone}</span>
                          )}
                          {p.hours && (
                            <div className="group/hours relative">
                              <span className="cursor-help text-[10px] font-black bg-zinc-100 text-zinc-500 px-2 py-1 rounded uppercase">View Hours</span>
                              <ul className="absolute left-0 bottom-full mb-2 hidden group-hover/hours:block bg-foreground text-background text-[10px] p-3 rounded-xl shadow-xl z-10 w-48 font-bold leading-relaxed">
                                {p.hours.map((h, j) => <li key={j}>{h}</li>)}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Section: SNAP Retailers */}
          <section>
            <div className="flex justify-between items-end mb-6">
              <h2 className="text-xl font-black text-foreground uppercase tracking-tight">SNAP Retailers</h2>
              <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 px-2 py-1 rounded">{data.snap.length} FOUND</span>
            </div>

            <div className="space-y-4">
              {data.snap.length === 0 ? (
                <div className="p-12 border-2 border-dashed border-zinc-100 rounded-[2rem] text-center text-zinc-400 italic">No retailers found.</div>
              ) : (
                data.snap.map((s, i) => (
                  <div key={i} className="group p-5 bg-white border border-zinc-100 rounded-[1.5rem] hover:border-accent/30 hover:shadow-xl transition-all duration-300">
                    <div className="flex gap-5">
                      {s.photoName ? (
                        <img
                          src={`/api/photo?name=${encodeURIComponent(s.photoName)}`}
                          alt=""
                          className="w-20 h-20 object-cover rounded-2xl flex-shrink-0"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-zinc-50 rounded-2xl flex items-center justify-center text-2xl grayscale opacity-20">🛒</div>
                      )}
                      <div className="flex-1">
                        <div className="flex justify-between items-start gap-2">
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.name} ${s.address}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-sm leading-tight text-foreground group-hover:text-accent transition-colors"
                          >
                            {s.name}
                          </a>
                          <p className="text-right text-accent font-black text-xs shrink-0">
                            {location ? `${distanceMiles(location.lat, location.lng, s.lat, s.lng).toFixed(1)} MI` : "—"}
                          </p>
                        </div>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">{s.address}</p>
                        <span className="mt-3 inline-block bg-accent/10 text-accent text-[8px] font-black px-2 py-1 rounded border border-accent/20 uppercase tracking-tighter">
                          SNAP Accepted
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}