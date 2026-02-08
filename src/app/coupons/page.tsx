"use client";

import { useState, useEffect, useMemo } from "react";
import type { Coupon } from "@/lib/coupons/types";
import { useLocation } from "@/contexts/LocationContext";
import CouponChat from "@/components/CouponChat";

// Module-level cache — survives tab switches within the same session
const couponCache = new Map<string, Coupon[]>();

export default function CouponsPage() {
  const { location } = useLocation();
  const cacheKey = location ? `${location.zip},${location.lat},${location.lng}` : null;
  const [coupons, setCoupons] = useState<Coupon[]>(() => (cacheKey ? couponCache.get(cacheKey) ?? [] : []));
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeStore, setActiveStore] = useState<string>("");
  const [search, setSearch] = useState("");

  // Auto-search when location changes — skip if already cached
  useEffect(() => {
    if (!location?.zip || !cacheKey) return;
    if (couponCache.has(cacheKey)) {
      setCoupons(couponCache.get(cacheKey)!);
      return;
    }
    setLoading(true);
    setErrors([]);
    
    // Build query string - use zip if available, otherwise use coordinates
    const params = new URLSearchParams({
      lat: String(location.lat),
      lng: String(location.lng),
    });
    if (location.zip) {
      params.append('zip', location.zip);
    }
    
    fetch(`/api/coupons?${params}`)
      .then((r) => r.json())
      .then(({ coupons, errors }) => {
        const data = coupons ?? [];
        couponCache.set(cacheKey, data);
        setCoupons(data);
        setErrors(errors ?? []);
      })
      .catch((err) => setErrors([String(err)]))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  // Build dynamic store list from whatever came back
  const stores = useMemo(() => {
    const seen = new Map<string, number>();
    for (const c of coupons) {
      seen.set(c.store, (seen.get(c.store) ?? 0) + 1);
    }
    return Array.from(seen.entries()).map(([id, count]) => ({ id, count }));
  }, [coupons]);

  // Auto-select first store when data loads
  useEffect(() => {
    if (stores.length > 0 && !stores.find((s) => s.id === activeStore)) {
      setActiveStore(stores[0].id);
    }
  }, [stores, activeStore]);

  const filtered = useMemo(() => {
    if (search.trim()) {
      const q = search.toLowerCase();
      return coupons.filter(
        (c) =>
          c.item.toLowerCase().includes(q) ||
          c.store.toLowerCase().includes(q) ||
          c.dealText?.toLowerCase().includes(q)
      );
    }
    return coupons.filter((c) => c.store === activeStore);
  }, [coupons, activeStore, search]);

  return (
    <div className="relative max-w-2xl mx-auto px-4 py-6">
      {loading && (
        <div className="fixed inset-x-0 bottom-0 top-14 z-40 flex items-center justify-center bg-white/60 dark:bg-black/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-zinc-300 dark:border-zinc-600 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading deals…</p>
          </div>
        </div>
      )}

      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
        Grocery Deals
      </h1>
      {location ? (
        <p className="text-sm text-zinc-400 mb-4">Near {location.address.split(",").slice(0, 2).join(",")} — edit in the nav bar</p>
      ) : (
        <p className="text-sm text-zinc-400 mb-4">Set your location in the nav bar to see local deals</p>
      )}

      {/* Search */}
      {coupons.length > 0 && (
        <input
          type="search"
          placeholder="Search all deals…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}

      {/* Store tabs */}
      {!search && stores.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {stores.map(({ id, count }) => (
            <button
              key={id}
              onClick={() => setActiveStore(id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                activeStore === id
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              {id} <span className="opacity-70">({count})</span>
            </button>
          ))}
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="mb-4 text-xs text-red-500 space-y-0.5">
          {errors.map((e, i) => <p key={i}>{e}</p>)}
        </div>
      )}

      {!loading && location && coupons.length === 0 && !errors.length && (
        <p className="text-zinc-400 text-sm">No deals found near you.</p>
      )}

      {!loading && location && coupons.length > 0 && filtered.length === 0 && (
        <p className="text-zinc-400 text-sm">
          {search ? `No deals matching "${search}".` : "No deals found for this store."}
        </p>
      )}

      {/* AI Basket side panel — renders its own fixed button + panel */}
      {coupons.length > 0 && <CouponChat coupons={coupons} />}

      {/* Coupon list */}
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
            <div className="flex-1 min-w-0">
              <p className="text-sm text-zinc-800 dark:text-zinc-200">
                {coupon.item}
                {coupon.unit && (
                  <span className="text-zinc-400 ml-1 text-xs">({coupon.unit})</span>
                )}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                {coupon.category && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 capitalize">
                    {coupon.category}
                  </span>
                )}
                {(coupon.storeName || coupon.storeAddress) && (
                  <p className="text-xs text-zinc-400 truncate">
                    {coupon.storeName}
                    {coupon.storeAddress && ` · ${coupon.storeAddress}`}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              {coupon.regularPrice != null && (
                <span className="text-xs text-zinc-400 line-through mr-2">
                  ${coupon.regularPrice.toFixed(2)}
                </span>
              )}
              {coupon.couponPrice != null ? (
                <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                  ${coupon.couponPrice.toFixed(2)}
                </span>
              ) : coupon.dealText ? (
                <span className="text-xs font-medium text-orange-500 dark:text-orange-400">
                  {coupon.dealText}
                </span>
              ) : (
                <span className="text-xs text-zinc-400">see store</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
