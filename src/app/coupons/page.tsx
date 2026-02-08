"use client";

import { useState, useEffect, useMemo } from "react";
import type { Coupon } from "@/lib/coupons/types";
import type { SnapRetailer } from "@/lib/usda-snap";
import { useLocation } from "@/contexts/LocationContext";
import CouponStoreMap from "@/components/CouponStoreMap";
import CouponChat from "@/components/CouponChat";
import BasketPanel from "@/components/BasketPanel";
import { useBasket } from "@/contexts/BasketContext";

const couponCache = new Map<string, Coupon[]>();

export default function CouponsPage() {
  const { location } = useLocation();
  const { addItem } = useBasket();
  const cacheKey = location ? `${location.zip},${location.lat},${location.lng}` : null;
  const [coupons, setCoupons] = useState<Coupon[]>(() => (cacheKey ? couponCache.get(cacheKey) ?? [] : []));
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeStore, setActiveStore] = useState<string>("");
  const [search, setSearch] = useState("");
  const [snapStores, setSnapStores] = useState<SnapRetailer[]>([]);
  const [snapOnly, setSnapOnly] = useState(false);

  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);

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
    const seen = new Map<string, { count: number; hasSnap: boolean }>();
    for (const c of coupons) {
      const current = seen.get(c.store) || { count: 0, hasSnap: false };
      seen.set(c.store, {
        count: current.count + 1,
        hasSnap: current.hasSnap || !!c.snapEligible
      });
    }
    return Array.from(seen.entries()).map(([id, info]) => ({ 
      id, 
      count: info.count, 
      hasSnap: info.hasSnap 
    }));
  }, [coupons]);

  useEffect(() => {
    if (stores.length > 0 && !stores.find((s) => s.id === activeStore)) {
      setActiveStore(stores[0].id);
    }
  }, [stores, activeStore]);

  const handleFocusStore = (storeId: string) => {
    setActiveStore(storeId);
    const storeInfo = snapStores.find(s => 
      s.name.toLowerCase().includes(storeId.toLowerCase().split(" ")[0])
    );
    if (storeInfo) {
      setMapCenter({ lat: storeInfo.lat, lng: storeInfo.lng });
    }
  };

  const filtered = useMemo(() => {
    let list = coupons;
    if (snapOnly) {
      list = list.filter(c => c.snapEligible);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      return list.filter(
        (c) =>
          c.item.toLowerCase().includes(q) ||
          c.store.toLowerCase().includes(q)
      );
    }
    return list.filter((c) => c.store === activeStore);
  }, [coupons, activeStore, search, snapOnly]);

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
      <header className="mb-10 w-full border-b border-zinc-200 pb-8 flex justify-between items-end">
        <div>
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
        </div>
        
        <button
          onClick={() => setSnapOnly(!snapOnly)}
          className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
            snapOnly 
              ? "bg-accent border-accent text-foreground shadow-lg" 
              : "bg-white border-zinc-200 text-zinc-400 hover:border-accent"
          }`}
        >
          {snapOnly ? "✓ SNAP Eligible Only" : "Filter SNAP Eligible"}
        </button>
      </header>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left: Map Sidebar - Made narrower (30%) to allow grid to breathe */}
        <aside className="w-full lg:w-[40%] lg:sticky lg:top-8 order-2 lg:order-1">
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
              center={mapCenter} 
              onSelectStore={(name) => {
                const match = stores.find((s) =>
                  name.toLowerCase().includes(s.id.toLowerCase().split(" ")[0])
                );
                if (match) handleFocusStore(match.id);
              }}
              userLat={location?.lat}
              userLng={location?.lng}
            />
          </div>
        </aside>

        {/* Right: Search & Grid Coupon Feed - Made wider (70%) */}
        <main className="w-full lg:w-[60%] order-1 lg:order-2">
          <div className="sticky top-0 bg-background/95 backdrop-blur-md z-20 pb-6">
            <input
              type="search"
              placeholder="Search items, brands, or stores..."
              className="w-full px-6 py-5 rounded-2xl bg-white border-2 border-zinc-100 focus:border-accent text-foreground transition-all outline-none shadow-sm placeholder:text-zinc-400"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          {!search && (
            <div className="flex flex-wrap gap-2 mb-8">
              {stores.map(({ id, count, hasSnap }) => {
                const isGrayedOut = snapOnly && !hasSnap;
                return (
                  <button
                    key={id}
                    onClick={() => !isGrayedOut && handleFocusStore(id)}
                    className={`text-[11px] px-4 py-2.5 rounded-xl font-black transition-all uppercase tracking-tighter border ${
                      isGrayedOut
                        ? "bg-zinc-50 border-zinc-100 text-zinc-300 opacity-40 grayscale cursor-not-allowed"
                        : activeStore === id 
                          ? "bg-foreground border-foreground text-background shadow-xl scale-105" 
                          : "bg-white border-zinc-200 text-zinc-400 hover:border-zinc-300"
                    }`}
                  >
                    {id} <span className="opacity-40 ml-1">{count}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* GRID: 3 columns on desktop, 2 on tablet, 1 on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((coupon, i) => (
              <div 
                key={i} 
                onClick={() => handleFocusStore(coupon.store)}
                className="group flex flex-col p-4 bg-white border border-zinc-100 rounded-[1.5rem] hover:border-accent/30 hover:shadow-xl transition-all duration-300 cursor-pointer active:scale-[0.98]"
              >
                {/* Top Section: Image and Price */}
                <div className="relative w-full aspect-square bg-zinc-50 rounded-2xl mb-4 flex items-center justify-center p-4 border border-zinc-50 group-hover:bg-white transition-colors overflow-hidden">
                  {coupon.imageUrl ? (
                    <img src={coupon.imageUrl} alt="" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <span className="text-4xl grayscale opacity-20">🛒</span>
                  )}
                  
                  {/* Price Badge Overlay */}
                  <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-xl shadow-sm border border-zinc-100">
                    <p className="font-black text-accent text-base leading-none">
                      ${coupon.couponPrice?.toFixed(2)}
                    </p>
                    {coupon.regularPrice && (
                      <p className="text-[9px] text-zinc-400 line-through text-right">
                        ${coupon.regularPrice.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Section: Details */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-sm leading-tight text-foreground group-hover:text-accent transition-colors line-clamp-2 mb-2">
                      {coupon.item}
                    </h3>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-50">
                    <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest truncate max-w-[50%]">
                      {coupon.storeName}
                    </p>
                    <div className="flex items-center gap-1.5">
                      {coupon.snapEligible && (
                        <span className="bg-accent/10 text-accent text-[8px] font-black px-2 py-0.5 rounded-md border border-accent/20">
                          SNAP
                        </span>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); addItem(coupon); }}
                        className="text-[11px] font-black w-6 h-6 rounded-full flex items-center justify-center transition hover:scale-110 active:scale-95"
                        style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
                        title="Add to basket"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {filtered.length === 0 && (
            <div className="text-center py-20 border-2 border-dashed border-zinc-200 rounded-[2rem]">
              <p className="text-zinc-400 font-medium italic">No deals found for this selection.</p>
            </div>
          )}
        </main>
      </div>

      <BasketPanel />
      {coupons.length > 0 && <CouponChat coupons={coupons} />}
    </div>
  );
}