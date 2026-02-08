"use client";

import { useState } from "react";
import { useBasket } from "@/contexts/BasketContext";

export default function BasketPanel() {
  const { items, removeItem, clearBasket, total, count } = useBasket();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating basket button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 left-6 z-50 flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold shadow-lg transition"
        style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
      >
        🛒 Basket
        {count > 0 && (
          <span className="bg-white/20 rounded-full px-1.5 text-xs font-bold">{count}</span>
        )}
      </button>

      {/* Slide-in panel from left */}
      <div
        className={`fixed top-14 left-0 bottom-0 z-40 w-80 flex flex-col shadow-xl transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: "var(--background)", borderRight: "1px solid color-mix(in srgb, var(--foreground) 12%, transparent)" }}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid color-mix(in srgb, var(--foreground) 12%, transparent)" }}>
          <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>🛒 My Basket</span>
          <button onClick={() => setOpen(false)} className="text-lg leading-none opacity-50 hover:opacity-100">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {items.length === 0 ? (
            <p className="text-sm text-center mt-8 opacity-50" style={{ color: "var(--foreground)" }}>
              No items yet — add deals from the coupons page!
            </p>
          ) : (
            items.map((item, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm" style={{ background: "color-mix(in srgb, var(--foreground) 6%, transparent)" }}>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate" style={{ color: "var(--foreground)" }}>{item.item}</p>
                  <p className="text-xs opacity-60" style={{ color: "var(--foreground)" }}>
                    {item.store} · {item.couponPrice != null ? `$${item.couponPrice.toFixed(2)}` : "—"}
                    {item.qty > 1 && ` × ${item.qty}`}
                  </p>
                </div>
                <button
                  onClick={() => removeItem(i)}
                  className="ml-2 text-xs opacity-40 hover:opacity-100 shrink-0"
                  style={{ color: "var(--foreground)" }}
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="p-4 space-y-3" style={{ borderTop: "1px solid color-mix(in srgb, var(--foreground) 12%, transparent)" }}>
            <div className="flex justify-between text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              <span>Estimated total</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <button
              onClick={clearBasket}
              className="w-full text-xs py-2 rounded-full opacity-50 hover:opacity-100 transition"
              style={{ color: "var(--foreground)" }}
            >
              Clear basket
            </button>
          </div>
        )}
      </div>
    </>
  );
}
