"use client";

import { useState, useEffect, useMemo } from "react";
import type { Coupon } from "@/lib/coupons/types";
import type { SnapRetailer } from "@/lib/usda-snap";
import { useLocation } from "@/contexts/LocationContext";
import CouponStoreMap from "@/components/CouponStoreMap";
import CouponChat from "@/components/CouponChat";

const couponCache = new Map<string, Coupon[]>();

export default function CouponsPage() {
  const { location } = useLocation();
  const cacheKey = location ? `${location.zip},${location.lat},${location.lng}` : null;
  const [coupons, setCoupons] = useState<Coupon[]>(() => (cacheKey ? couponCache.get(cacheKey) ?? [] : []));
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeStore, setActiveStore] = useState<string>("");
  const [search, setSearch] = useState("");
  const [snapStores, setSnapStores] = useState<SnapRetailer[]>([]);

  useEffect(() => {
    if (!location?.zip || !cacheKey) return;
    if (couponCache.has(cacheKey)) {
      setCoupons(couponCache.get(cacheKey)!);
      return;
    }
    setLoading(true);
    setErrors([]);
    
    const params = new URLSearchParams({
      lat: String(location.lat),
      lng: String(location.lng),
    });
    if (location.zip) params.append('zip', location.zip);
    
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
  }, [cacheKey]);

  useEffect(() => {
    if (!location?.lat || !location?.lng) return;
    fetch(`/api/snap-stores?lat=${location.lat}&lng=${location.lng}`)
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setSnapStores(data))
      .catch(() => {});
  }, [location?.lat, location?.lng]);

  const stores = useMemo(() => {
    const seen = new Map<string, number>();
    for (const c of coupons) {
      seen.set(c.store, (seen.get(c.store) ?? 0) + 1);
    }
    return Array.from(seen.entries()).map(([id, count]) => ({ id, count }));
  }, [coupons]);

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
    // Inside your return statement
<div className="max-w-[1600px] mx-auto px-4 py-6">
  
  {/* NEW: Full-width Header above both sections */}
  <header className="mb-8 w-full border-b border-zinc-100 dark:border-zinc-800 pb-6">
    <h1 className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-zinc-100">
      Grocery Deals & Store Finder
    </h1>
    <div className="flex items-center gap-2 mt-2">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
      </span>
      <p className="text-sm text-zinc-500 font-medium">
        {location ? `Live deals near ${location.address.split(",")[0]}` : "Set location to see local prices"}
      </p>
    </div>
  </header>

  <div className="flex flex-col lg:flex-row gap-8 items-start">
    
    {/* Left Side: Map (Sticky) */}
    <div className="w-full lg:w-[55%] lg:sticky lg:top-6 order-2 lg:order-1">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <span className="text-blue-600">📍</span> SNAP Retailers
        </h2>
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md">
          {snapStores.length} locations
        </span>
      </div>
      
      <div className="h-[450px] lg:h-[calc(100vh-180px)] rounded-3xl overflow-hidden border-2 border-zinc-200 dark:border-zinc-800 shadow-2xl">
        <CouponStoreMap
          stores={snapStores}
          activeStore={activeStore}
          onSelectStore={(name) => {
            const match = stores.find((s) =>
              name.toLowerCase().includes(s.id.toLowerCase().split(" ")[0])
            );
            if (match) setActiveStore(match.id);
          }}
          userLat={location?.lat}
          userLng={location?.lng}
        />
      </div>
    </div>

    {/* Right Side: Search & Coupons */}
    <div className="w-full lg:w-[45%] order-1 lg:order-2">
      {/* Search Input aligned with Top of Map */}
      <div className="sticky top-0 bg-white dark:bg-black z-10 pb-4">
        <input
          type="search"
          placeholder="Search items, brands, or stores..."
          className="w-full px-5 py-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all outline-none shadow-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      
      {!search && (
        <div className="flex flex-wrap gap-2 mb-6">
          {stores.map(({ id, count }) => (
            <button
              key={id}
              onClick={() => setActiveStore(id)}
              className={`text-[11px] px-3 py-2 rounded-xl font-black transition-all uppercase tracking-tight ${
                activeStore === id 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-200" 
                  : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-zinc-400"
              }`}
            >
              {id} <span className="opacity-50 ml-1">{count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Coupon List */}
      <div className="space-y-3">
        {filtered.map((coupon, i) => (
          <div key={i} className="group p-4 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl hover:shadow-xl hover:border-blue-200 transition-all cursor-pointer">
            <div className="flex gap-4">
              <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-800 rounded-xl flex-shrink-0 flex items-center justify-center p-2">
                {coupon.imageUrl ? (
                  <img src={coupon.imageUrl} alt="" className="max-w-full max-h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
                ) : (
                  <span className="text-2xl opacity-20">🛒</span>
                )}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-sm leading-snug text-zinc-800 dark:text-zinc-200">{coupon.item}</h3>
                  <div className="text-right">
                    <p className="font-black text-blue-600 text-lg">${coupon.couponPrice?.toFixed(2)}</p>
                    {coupon.regularPrice && (
                      <p className="text-[10px] text-zinc-400 line-through">${coupon.regularPrice.toFixed(2)}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                   <p className="text-[10px] text-zinc-500 font-bold uppercase">{coupon.storeName}</p>
                   {coupon.snapEligible && (
                    <span className="bg-emerald-50 text-emerald-700 text-[8px] font-black px-1.5 py-0.5 rounded border border-emerald-100">
                      SNAP APPROVED
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>

  </div>
</div>
  );
}