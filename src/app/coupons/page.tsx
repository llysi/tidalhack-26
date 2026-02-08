"use client";

import { useState } from "react";
import type { Coupon, StoreId } from "@/lib/coupons/types";

const STORES: { id: StoreId; label: string }[] = [
  { id: "heb", label: "H-E-B" },
  { id: "aldi", label: "Aldi" },
  { id: "walmart", label: "Walmart" },
];

export default function CouponsPage() {
  const [zip, setZip] = useState("");
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeStore, setActiveStore] = useState<StoreId>("heb");

  async function handleSearch(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!zip.trim()) return;
    setLoading(true);
    setErrors([]);
    try {
      const res = await fetch(`/api/coupons?zip=${encodeURIComponent(zip)}`);
      const data = await res.json();
      setCoupons(data.coupons ?? []);
      setErrors(data.errors ?? []);
    } catch (err) {
      setErrors([String(err)]);
    } finally {
      setLoading(false);
    }
  }

  const filtered = coupons.filter((c) => c.store === activeStore);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
        Grocery Deals
      </h1>

      {/* Zip input */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          placeholder="Enter zip code..."
          className="flex-1 rounded-full border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={loading || !zip.trim()}
          className="rounded-full bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Search"}
        </button>
      </form>

      {/* Store tabs */}
      {coupons.length > 0 && (
        <div className="flex gap-2 mb-4">
          {STORES.map(({ id, label }) => {
            const count = coupons.filter((c) => c.store === id).length;
            return (
              <button
                key={id}
                onClick={() => setActiveStore(id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                  activeStore === id
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                {label} {count > 0 && <span className="opacity-70">({count})</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="mb-4 text-xs text-red-500 space-y-0.5">
          {errors.map((e, i) => (
            <p key={i}>{e}</p>
          ))}
        </div>
      )}

      {/* Coupon list */}
      {!loading && coupons.length > 0 && filtered.length === 0 && (
        <p className="text-zinc-400 text-sm">No deals found for this store.</p>
      )}

      <ul className="space-y-2">
        {filtered.map((coupon, i) => (
          <li
            key={i}
            className="flex items-center gap-3 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3"
          >
            {coupon.imageUrl && (
              <img
                src={coupon.imageUrl}
                alt={coupon.item}
                className="w-12 h-12 object-contain shrink-0 rounded"
              />
            )}
            <span className="text-sm text-zinc-800 dark:text-zinc-200 flex-1">
              {coupon.item}
              {coupon.unit && (
                <span className="text-zinc-400 ml-1 text-xs">({coupon.unit})</span>
              )}
            </span>
            <div className="text-right shrink-0">
              {coupon.regularPrice != null && (
                <span className="text-xs text-zinc-400 line-through mr-2">
                  ${coupon.regularPrice.toFixed(2)}
                </span>
              )}
              <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                ${coupon.couponPrice.toFixed(2)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
