"use client";

import { createContext, useContext, useState, useCallback } from "react";
import type { Coupon } from "@/lib/coupons/types";

interface BasketItem extends Coupon {
  qty: number;
}

interface BasketContextValue {
  items: BasketItem[];
  addItem: (coupon: Coupon) => void;
  removeItem: (index: number) => void;
  clearBasket: () => void;
  total: number;
  count: number;
}

const BasketContext = createContext<BasketContextValue | null>(null);

export function BasketProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<BasketItem[]>([]);

  const addItem = useCallback((coupon: Coupon) => {
    setItems((prev) => {
      const existing = prev.findIndex(
        (i) => i.item === coupon.item && i.store === coupon.store
      );
      if (existing >= 0) {
        return prev.map((i, idx) =>
          idx === existing ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, { ...coupon, qty: 1 }];
    });
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearBasket = useCallback(() => setItems([]), []);

  const total = items.reduce(
    (sum, i) => sum + (i.couponPrice ?? i.regularPrice ?? 0) * i.qty,
    0
  );
  const count = items.reduce((sum, i) => sum + i.qty, 0);

  return (
    <BasketContext.Provider value={{ items, addItem, removeItem, clearBasket, total, count }}>
      {children}
    </BasketContext.Provider>
  );
}

export function useBasket() {
  const ctx = useContext(BasketContext);
  if (!ctx) throw new Error("useBasket must be inside BasketProvider");
  return ctx;
}
