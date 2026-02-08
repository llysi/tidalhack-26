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
    <div className="max-w-[1600px] mx-auto px-4 py-6"> {/* Increased max-width for ultra-wide screens */}
      
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* Left Side: WIDER Map (now 55% width) */}
        <div className="w-full lg:w-[40%] lg:sticky lg:top-6 order-2 lg:order-1">
          <div className="flex justify-between items-end mb-3">
            <h2 className="text-lg font-bold">Store Locations</h2>
            <span className="text-xs text-zinc-500 bg-zinc-100 px-2 py-1 rounded">
              {snapStores.length} Stores Found
            </span>
          </div>
          
          <div className="h-[450px] lg:h-[calc(100vh-120px)] rounded-3xl overflow-hidden border-2 border-zinc-200 dark:border-zinc-800 shadow-xl">
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

        {/* Right Side: Coupon List (now 45% width) */}
        <div className="w-full lg:w-[60%] order-1 lg:order-2">
          <header className="mb-6">
            <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
              Deals & Savings
            </h1>
            <p className="text-sm text-zinc-500 font-medium">
              {location ? `📍 ${location.address.split(",")[0]}` : "Set location for local prices"}
            </p>
          </header>

          {/* Search & Filter Section */}
          <div className="space-y-4 mb-8">
            <input
              type="search"
              placeholder="Search items..."
              className="w-full px-4 py-3 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border-none focus:ring-2 focus:ring-blue-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            
            {!search && (
              <div className="flex flex-wrap gap-2">
                {stores.map(({ id, count }) => (
                  <button
                    key={id}
                    onClick={() => setActiveStore(id)}
                    className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all ${
                      activeStore === id 
                        ? "bg-zinc-900 text-white dark:bg-white dark:text-black scale-105" 
                        : "bg-white border border-zinc-200 text-zinc-500 hover:border-zinc-900"
                    }`}
                  >
                    {id.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Scrollable Coupon List */}
          <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-2 custom-scrollbar">
            {filtered.map((coupon, i) => (
              <div key={i} className="group p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-blue-500 transition-colors cursor-pointer">
                <div className="flex gap-4">
                  <div className="w-20 h-20 bg-zinc-50 rounded-xl flex-shrink-0 flex items-center justify-center p-2">
                    {coupon.imageUrl ? (
                      <img src={coupon.imageUrl} alt="" className="max-w-full max-h-full object-contain" />
                    ) : (
                      <span className="text-2xl">🛒</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-sm leading-tight group-hover:text-blue-600">{coupon.item}</h3>
                      <p className="font-black text-blue-600">${coupon.couponPrice?.toFixed(2)}</p>
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-1 uppercase font-bold tracking-widest">{coupon.storeName}</p>
                    {coupon.snapEligible && (
                      <span className="mt-2 inline-block bg-blue-50 text-blue-700 text-[9px] font-black px-2 py-0.5 rounded-md">
                        SNAP ELIGIBLE
                      </span>
                    )}
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