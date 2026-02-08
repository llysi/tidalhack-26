"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/results", label: "Results" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black px-6 py-3 flex items-center gap-6">
      <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mr-4">
        ADI-I
      </span>
      {links.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={`text-sm ${
            pathname === href
              ? "text-zinc-900 dark:text-zinc-100 font-medium"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
