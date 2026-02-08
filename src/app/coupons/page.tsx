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
    <div className="max-w-[1600px] mx-auto px-6 py-8 bg-background min-h-screen">
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-zinc-200 border-t-foreground rounded-full animate-spin" />
            <p className="text-sm font-medium text-foreground">Loading local deals...</p>
          </div>
        </div>
      )}

      {/* Global Header */}
      <header className="mb-10 w-full border-b border-zinc-200 pb-8">
        <h1 className="text-5xl font-black tracking-tighter text-foreground leading-none">
          Deals
        </h1>
        <div className="flex items-center gap-3 mt-4">
          <span className="px-2 py-1 bg-accent/10 text-accent text-[10px] font-black uppercase rounded tracking-widest">
            Live Feed
          </span>
          <p className="text-sm text-zinc-500 font-medium italic">
            {location ? `Exploring ${location.address.split(",")[0]}` : "Set location to find deals"}
          </p>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-10 items-start">
        {/* Left: Interactive Map Sidebar */}
        <aside className="w-full lg:w-[55%] lg:sticky lg:top-8 order-2 lg:order-1">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-xl font-black text-foreground uppercase tracking-tight">
              Store Map
            </h2>
            <div className="px-3 py-1 bg-zinc-100 rounded-full text-[10px] font-bold text-zinc-500">
              {snapStores.length} SNAP LOCATIONS
            </div>
          </div>
          
          <div className="h-[450px] lg:h-[calc(100vh-220px)] rounded-[2.5rem] overflow-hidden border-2 border-zinc-200 shadow-2xl shadow-zinc-200/50">
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
        </aside>

        {/* Right: Search & Coupon Feed */}
        <main className="w-full lg:w-[45%] order-1 lg:order-2">
          {/* Fixed Search Area */}
          <div className="sticky top-0 bg-background/95 backdrop-blur-md z-20 pb-6">
            <input
              type="search"
              placeholder="Search items, brands, or stores..."
              className="w-full px-6 py-5 rounded-2xl bg-white border-2 border-zinc-100 focus:border-accent text-foreground transition-all outline-none shadow-sm placeholder:text-zinc-400"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          {/* Store Tabs */}
          {!search && (
            <div className="flex flex-wrap gap-2 mb-8">
              {stores.map(({ id, count }) => (
                <button
                  key={id}
                  onClick={() => setActiveStore(id)}
                  className={`text-[11px] px-4 py-2.5 rounded-xl font-black transition-all uppercase tracking-tighter ${
                    activeStore === id 
                      ? "bg-foreground text-background shadow-xl scale-105" 
                      : "bg-white border border-zinc-200 text-zinc-400 hover:border-zinc-300"
                  }`}
                >
                  {id} <span className="opacity-40 ml-1">{count}</span>
                </button>
              ))}
            </div>
          )}

          {/* Result Feed */}
          <div className="space-y-4">
            {filtered.length > 0 ? (
              filtered.map((coupon, i) => (
                <div key={i} className="group p-5 bg-white border border-zinc-100 rounded-[1.5rem] hover:border-accent/30 hover:shadow-xl transition-all duration-300 cursor-pointer">
                  <div className="flex gap-5">
                    <div className="w-24 h-24 bg-zinc-50 rounded-2xl flex-shrink-0 flex items-center justify-center p-3 border border-zinc-50 group-hover:bg-white transition-colors">
                      {coupon.imageUrl ? (
                        <img src={coupon.imageUrl} alt="" className="max-w-full max-h-full object-contain" />
                      ) : (
                        <span className="text-3xl grayscale opacity-20">🛒</span>
                      )}
                    </div>
                    <div className="flex-1 py-1">
                      <div className="flex justify-between items-start gap-4">
                        <h3 className="font-bold text-base leading-tight text-foreground group-hover:text-accent transition-colors">
                          {coupon.item}
                        </h3>
                        <div className="text-right">
                          <p className="font-black text-accent text-xl leading-none">
                            ${coupon.couponPrice?.toFixed(2)}
                          </p>
                          {coupon.regularPrice && (
                            <p className="text-[10px] text-zinc-400 line-through mt-1">
                              ${coupon.regularPrice.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-4">
                         <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{coupon.storeName}</p>
                         {coupon.snapEligible && (
                          <span className="bg-accent/10 text-accent text-[8px] font-black px-2 py-1 rounded-md border border-accent/20">
                            SNAP
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-20 border-2 border-dashed border-zinc-200 rounded-[2rem]">
                <p className="text-zinc-400 font-medium italic">No deals found for this selection.</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {coupons.length > 0 && <CouponChat coupons={coupons} />}
    </div>
  );
}