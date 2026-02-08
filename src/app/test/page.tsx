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

interface TestData {
  places: PlaceResult[];
  snap: SnapResult[];
  errors: string[];
}

function distanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function TestPage() {
  const { location } = useLocation();
  const [data, setData] = useState<TestData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!location) return;
    setLoading(true);
    setData(null);
    fetch(`/api/test-search?lat=${location.lat}&lng=${location.lng}`)
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch((err) => setData({ places: [], snap: [], errors: [String(err)] }))
      .finally(() => setLoading(false));
  }, [location?.lat, location?.lng]);

  return (
    <div className="min-h-screen bg-white dark:bg-black p-8 font-sans">
      <h1 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-zinc-100">
        API Test Page
      </h1>
      {location ? (
        <p className="text-zinc-500 text-sm mb-6">
          📍 {location.address} ({(+location.lat).toFixed(4)}, {(+location.lng).toFixed(4)}) 
        </p>
      ) : (
        <p className="text-zinc-400 text-sm mb-6">Set your location in the nav bar to search.</p>
      )}

      {loading && <p className="text-zinc-400">Loading...</p>}

      {data && data.errors.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
          <h2 className="font-semibold text-red-700 dark:text-red-400 mb-2">Errors</h2>
          {data.errors.map((err, i) => (
            <p key={i} className="text-red-600 dark:text-red-400 text-sm">{err}</p>
          ))}
        </div>
      )}

      {data && (
        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-semibold mb-3 text-zinc-900 dark:text-zinc-100">
              Google Places Results ({data.places.length})
            </h2>
            {data.places.length === 0 ? (
              <p className="text-zinc-400 text-sm">No results (is GOOGLE_PLACES_API_KEY set in .env.local?)</p>
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-700 text-left text-zinc-500">
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Address</th>
                    <th className="py-2 pr-4">Phone</th>
                    <th className="py-2 pr-4">Hours</th>
                    <th className="py-2 pr-4">Distance</th>
                  </tr>
                </thead>
                <tbody>
                  {data.places.map((p, i) => (
                    <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200">
                      <td className="py-2 pr-4 font-medium">
                        {p.photoName && (
                          <img
                            src={`/api/photo?name=${encodeURIComponent(p.photoName)}`}
                            alt={p.name}
                            className="w-16 h-16 object-cover rounded mb-1"
                          />
                        )}
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.name} ${p.address}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {p.name}
                        </a>
                      </td>
                      <td className="py-2 pr-4">{p.address}</td>
                      <td className="py-2 pr-4">{p.phone ?? "—"}</td>
                      <td className="py-2 pr-4 text-xs">
                        {p.hours?.length ? (
                          <ul className="space-y-0.5">{p.hours.map((h, j) => <li key={j}>{h}</li>)}</ul>
                        ) : "—"}
                      </td>
                      <td className="py-2 pr-4 text-zinc-500">
                        {location ? `${distanceMiles(location.lat, location.lng, p.lat, p.lng).toFixed(1)} mi` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3 text-zinc-900 dark:text-zinc-100">
              USDA SNAP Retailers ({data.snap.length})
            </h2>
            {data.snap.length === 0 ? (
              <p className="text-zinc-400 text-sm">No results.</p>
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-700 text-left text-zinc-500">
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Address</th>
                    <th className="py-2 pr-4">Distance</th>
                  </tr>
                </thead>
                <tbody>
                  {data.snap.map((s, i) => (
                    <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200">
                      <td className="py-2 pr-4 font-medium">
                        {s.photoName && (
                          <img
                            src={`/api/photo?name=${encodeURIComponent(s.photoName)}`}
                            alt={s.name}
                            className="w-16 h-16 object-cover rounded mb-1"
                          />
                        )}
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.name} ${s.address}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {s.name}
                        </a>
                      </td>
                      <td className="py-2 pr-4">{s.address}</td>
                      <td className="py-2 pr-4 text-zinc-500">
                        {location ? `${distanceMiles(location.lat, location.lng, s.lat, s.lng).toFixed(1)} mi` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
