"use client";

import { useState } from "react";

interface Theme {
  name: string;
  vars: Record<string, string>;
}

const THEMES: Theme[] = [
  {
    name: "Default",
    vars: {
      "--background": "#ffffff",
      "--foreground": "#171717",
      "--accent": "#2563eb",
      "--accent-fg": "#ffffff",
      "--app-font": "var(--font-geist-sans)",
    },
  },
  {
    name: "Warm",
    vars: {
      "--background": "#fffbf5",
      "--foreground": "#1c1412",
      "--accent": "#ea580c",
      "--accent-fg": "#ffffff",
      "--app-font": "var(--font-outfit)",
    },
  },
  {
    name: "Forest",
    vars: {
      "--background": "#f7fdf7",
      "--foreground": "#14261a",
      "--accent": "#16a34a",
      "--accent-fg": "#ffffff",
      "--app-font": "var(--font-dm-sans)",
    },
  },
  {
    name: "Slate",
    vars: {
      "--background": "#f8fafc",
      "--foreground": "#0f172a",
      "--accent": "#7c3aed",
      "--accent-fg": "#ffffff",
      "--app-font": "var(--font-jakarta)",
    },
  },
  {
    name: "Rose",
    vars: {
      "--background": "#fff5f7",
      "--foreground": "#1a0a0d",
      "--accent": "#e11d48",
      "--accent-fg": "#ffffff",
      "--app-font": "var(--font-outfit)",
    },
  },
  {
    name: "Sage",
    vars: {
      "--background": "#f5f0e8",
      "--foreground": "#1a2e1a",
      "--accent": "#2d5a27",
      "--accent-fg": "#ffffff",
      "--app-font": "var(--font-dm-sans)",
    },
  },
];

const FONTS = [
  { name: "Geist", value: "var(--font-geist-sans)" },
  { name: "Outfit", value: "var(--font-outfit)" },
  { name: "DM Sans", value: "var(--font-dm-sans)" },
  { name: "Jakarta", value: "var(--font-jakarta)" },
];

function applyVars(vars: Record<string, string>) {
  for (const [k, v] of Object.entries(vars)) {
    document.documentElement.style.setProperty(k, v);
  }
}

export default function ThemeSwitcher() {
  const [open, setOpen] = useState(false);
  const [activeTheme, setActiveTheme] = useState("Default");

  function applyTheme(t: Theme) {
    applyVars(t.vars);
    setActiveTheme(t.name);
  }

  function applyFont(value: string) {
    document.documentElement.style.setProperty("--app-font", value);
  }

  return (
    <div className="fixed top-1/2 -translate-y-1/2 left-0 z-50 flex">
      {/* Tab handle */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="writing-mode-vertical bg-zinc-800 dark:bg-zinc-200 text-zinc-100 dark:text-zinc-900 px-1.5 py-3 text-[10px] font-semibold tracking-widest uppercase shadow-lg hover:opacity-90 transition rounded-r-lg"
        style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
      >
        🎨 Theme
      </button>

      {/* Panel slides in from left */}
      <div
        className={`transition-all duration-200 overflow-hidden ${open ? "w-52" : "w-0"}`}
      >
        <div className="bg-white dark:bg-zinc-900 border-y border-r border-zinc-200 dark:border-zinc-700 rounded-r-xl shadow-xl p-3 w-52 space-y-3">
          <div>
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">
              Color
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {THEMES.map((t) => (
                <button
                  key={t.name}
                  onClick={() => applyTheme(t)}
                  className={`px-2 py-1.5 rounded-lg text-xs font-medium transition ${
                    activeTheme === t.name
                      ? "bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">
              Font
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {FONTS.map((f) => (
                <button
                  key={f.name}
                  onClick={() => applyFont(f.value)}
                  className="px-2 py-1.5 rounded-lg text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
