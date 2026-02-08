"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useLocation, geocodeAddress } from "@/contexts/LocationContext";

const links = [
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
    <nav className="sticky top-0 z-[100] w-full px-6 py-3 flex items-center gap-8 bg-background transition-all">
      {/* Brand Logo */}
      <Link href="/" className="text-2xl font-black tracking-tighter text-black hover:text-accent transition-colors">
        ADI-I
      </Link>
      
      <div className="flex items-center gap-8">
        {links.map(({ href, label: linkLabel }) => (
          <Link
            key={href}
            href={href}
            className={`text-xs font-black uppercase tracking-[0.2em] transition-all duration-300 ${
              pathname === href
                ? "text-accent" 
                : "text-black hover:text-accent"
            }`}
          >
            {linkLabel}
          </Link>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-6">
        <div className="relative flex items-center">
          {editing ? (
            <div className="relative">
              <form onSubmit={(e) => { e.preventDefault(); commitEdit(); }}>
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => { setDraft(e.target.value); setActiveSuggestion(-1); }}
                  onKeyDown={handleKeyDown}
                  onBlur={() => setTimeout(closeEdit, 150)}
                  placeholder="Enter address..."
                  className="w-72 text-xs font-bold border-b-2 border-black bg-transparent px-1 py-2 focus:outline-none focus:border-accent transition-all text-black placeholder:text-zinc-400"
                />
              </form>
              
              {suggestions.length > 0 && (
                <ul className="absolute right-0 top-full mt-2 w-80 bg-white border border-zinc-100 rounded-2xl shadow-2xl z-[110] overflow-hidden">
                  {suggestions.map((s, i) => (
                    <li
                      key={s.placeId}
                      onMouseDown={() => selectSuggestion(s)}
                      className={`px-4 py-3 text-xs font-bold cursor-pointer transition-all border-b border-zinc-50 last:border-none ${
                        i === activeSuggestion
                          ? "bg-accent text-white"
                          : "text-black hover:bg-accent hover:text-white"
                      }`}
                    >
                      📍 {s.description}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <button
              onClick={startEdit}
              disabled={geocoding}
              className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-black hover:text-accent transition-all"
            >
              {geocoding ? (
                 <span className="animate-pulse">Locating...</span>
              ) : (
                <>
                  <span className="text-accent group-hover:text-black transition-colors">📍</span>
                  {label ? label : "Set Address"}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}