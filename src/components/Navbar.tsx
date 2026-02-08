"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useLocation, geocodeAddress } from "@/contexts/LocationContext";

const links = [
  { href: "/", label: "Home" },
  { href: "/coupons", label: "Coupons" },
  { href: "/pantries", label: "Pantries" },
];

interface Suggestion {
  placeId: string;
  description: string;
}

export default function Navbar() {
  const pathname = usePathname();
  const { location, setLocation } = useLocation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function startEdit() {
    setDraft(location?.address ?? "");
    setEditing(true);
    setSuggestions([]);
  }

  function closeEdit() {
    setEditing(false);
    setSuggestions([]);
    setActiveSuggestion(-1);
  }

  // Debounced autocomplete fetch
  useEffect(() => {
    if (!editing) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (draft.length < 2) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/autocomplete?q=${encodeURIComponent(draft)}`);
        if (res.ok) setSuggestions(await res.json());
      } catch {}
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [draft, editing]);

  async function selectSuggestion(s: Suggestion) {
    closeEdit();
    setGeocoding(true);
    try {
      const res = await fetch(`/api/geocode?place_id=${encodeURIComponent(s.placeId)}`);
      if (res.ok) {
        const resolved = await res.json();
        if (resolved) setLocation(resolved);
      }
    } finally {
      setGeocoding(false);
    }
  }

  async function commitEdit() {
    if (geocoding) return;
    if (!draft.trim()) { closeEdit(); return; }
    // If there's an active suggestion, use it
    if (activeSuggestion >= 0 && suggestions[activeSuggestion]) {
      await selectSuggestion(suggestions[activeSuggestion]);
      return;
    }
    closeEdit();
    setGeocoding(true);
    try {
      const resolved = await geocodeAddress(draft.trim());
      if (resolved) setLocation(resolved);
    } finally {
      setGeocoding(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestion((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestion((i) => Math.max(i - 1, -1));
    } else if (e.key === "Escape") {
      closeEdit();
    }
  }

  const label = location
    ? `${location.address.split(",").slice(0, 2).join(",").trim()}${location.zip ? ` (${location.zip})` : ""}`
    : null;

  return (
    <nav className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black px-6 py-3 flex items-center gap-6">
      <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mr-4">
        ADI-I
      </span>
      {links.map(({ href, label: linkLabel }) => (
        <Link
          key={href}
          href={href}
          className={`text-sm ${
            pathname === href
              ? "text-zinc-900 dark:text-zinc-100 font-medium"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          }`}
        >
          {linkLabel}
        </Link>
      ))}

      {/* Location */}
      <div className="ml-auto flex items-center gap-2 relative">
        {editing ? (
          <div className="relative">
            <form
              onSubmit={(e) => { e.preventDefault(); commitEdit(); }}
            >
              <input
                autoFocus
                value={draft}
                onChange={(e) => { setDraft(e.target.value); setActiveSuggestion(-1); }}
                onKeyDown={handleKeyDown}
                onBlur={() => setTimeout(closeEdit, 150)}
                placeholder="Enter address..."
                className="w-64 text-sm border border-zinc-300 dark:border-zinc-600 rounded px-2 py-0.5 bg-white dark:bg-zinc-900 focus:outline-none"
              />
            </form>
            {suggestions.length > 0 && (
              <ul className="absolute left-0 top-full mt-1 w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg z-50 overflow-hidden">
                {suggestions.map((s, i) => (
                  <li
                    key={s.placeId}
                    onMouseDown={() => selectSuggestion(s)}
                    className={`px-3 py-2 text-sm cursor-pointer ${
                      i === activeSuggestion
                        ? "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                        : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {s.description}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <button
            onClick={startEdit}
            disabled={geocoding}
            className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            {geocoding ? "Locating..." : label ? `📍 ${label}` : "📍 Set your address"}
          </button>
        )}
      </div>
    </nav>
  );
}
