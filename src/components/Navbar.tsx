"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useLocation, geocodeAddress } from "@/contexts/LocationContext";

const links = [
  { href: "/", label: "Home" },
  { href: "/coupons", label: "Coupons" },
  { href: "/test", label: "Test" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { location, setLocation } = useLocation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [geocoding, setGeocoding] = useState(false);

  function startEdit() {
    setDraft(location?.address ?? "");
    setEditing(true);
  }

  async function commitEdit() {
    if (!draft.trim()) { setEditing(false); return; }
    setGeocoding(true);
    try {
      const resolved = await geocodeAddress(draft.trim());
      if (resolved) setLocation(resolved);
    } finally {
      setGeocoding(false);
      setEditing(false);
    }
  }

  // Short display label — prefer city/state over full address
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
      <div className="ml-auto flex items-center gap-2">
        {editing ? (
          <form
            onSubmit={(e) => { e.preventDefault(); commitEdit(); }}
            className="flex items-center gap-1"
          >
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitEdit}
              placeholder="Enter address..."
              className="w-48 text-sm border border-zinc-300 dark:border-zinc-600 rounded px-2 py-0.5 bg-white dark:bg-zinc-900 focus:outline-none"
            />
          </form>
        ) : (
          <button
            onClick={startEdit}
            disabled={geocoding}
            className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            {geocoding ? "Locating..." : label ? `📍 ${label}` : "📍 Set location"}
          </button>
        )}
      </div>
    </nav>
  );
}
