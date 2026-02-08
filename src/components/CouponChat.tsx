"use client";

import { useState, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { Coupon } from "@/lib/coupons/types";
import { useBasket } from "@/contexts/BasketContext";

interface CouponChatProps {
  coupons: Coupon[];
}

interface SuggestedItem {
  item: string;
  store: string;
  price: number;
  reason: string;
}

export default function CouponChat({ coupons }: CouponChatProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [snapshot, setSnapshot] = useState<Coupon[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const handledTools = useRef<Set<string>>(new Set());
  const { items: basketItems, addItem } = useBasket();

  function getUserProfile() {
    try {
      return {
        people: localStorage.getItem("user_people") ?? null,
        budget: localStorage.getItem("user_budget") ?? null,
        car: localStorage.getItem("user_car") ?? null,
      };
    } catch {
      return { people: null, budget: null, car: null };
    }
  }

  const { messages, sendMessage, status, addToolOutput } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/coupon-chat",
      body: { coupons: snapshot, basket: basketItems, profile: getUserProfile() },
    }),
  });

  const loading = status === "submitted" || status === "streaming";

  // Handle client-side tool calls
  useEffect(() => {
    for (const msg of messages) {
      for (const part of msg.parts) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const p = part as any;
        if (p.type !== "tool-invocation") continue;
        const inv = p.toolInvocation;
        if (!inv || inv.state !== "call") continue;
        if (handledTools.current.has(inv.toolCallId)) continue;
        handledTools.current.add(inv.toolCallId);

        if (inv.toolName === "saveProfile") {
          try {
            if (inv.args.people) localStorage.setItem("user_people", inv.args.people);
            if (inv.args.budget) localStorage.setItem("user_budget", inv.args.budget);
            if (inv.args.car) localStorage.setItem("user_car", inv.args.car);
          } catch {}
          addToolOutput({ tool: inv.toolName, toolCallId: inv.toolCallId, output: "Profile saved." });
        } else if (inv.toolName === "suggestBasket") {
          addToolOutput({ tool: inv.toolName, toolCallId: inv.toolCallId, output: "Suggestions displayed to user." });
        }
      }
    }
  }, [messages, addToolOutput]);

  function openPanel() {
    setSnapshot(coupons);
    setOpen(true);
  }

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  function findCoupon(item: string, store: string): Coupon | undefined {
    return (
      snapshot.find(c => c.item === item && c.store === store) ??
      snapshot.find(c => c.item.toLowerCase() === item.toLowerCase() && c.store.toLowerCase() === store.toLowerCase()) ??
      snapshot.find(c => c.item.toLowerCase().includes(item.toLowerCase()) && c.store.toLowerCase().includes(store.toLowerCase()))
    );
  }

  function SuggestionCard({ items, summary }: { items: SuggestedItem[]; summary: string }) {
    const total = items.reduce((s, i) => s + i.price, 0);
    return (
      <div
        className="rounded-2xl p-3 text-sm space-y-2"
        style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)" }}
      >
        <p className="font-semibold text-xs" style={{ color: "var(--accent)" }}>✨ Suggested Basket</p>
        <p className="text-xs opacity-70" style={{ color: "var(--foreground)" }}>{summary}</p>
        <div className="space-y-1">
          {items.map((item, i) => {
            const coupon = findCoupon(item.item, item.store);
            return (
              <div key={i} className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-xs truncate" style={{ color: "var(--foreground)" }}>{item.item}</p>
                  <p className="text-[10px] opacity-50 truncate" style={{ color: "var(--foreground)" }}>{item.reason}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs font-bold" style={{ color: "var(--accent)" }}>${item.price.toFixed(2)}</span>
                  {coupon && (
                    <button
                      onClick={() => addItem(coupon)}
                      className="text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center transition hover:scale-110"
                      style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
                      title="Add to basket"
                    >
                      +
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between pt-1" style={{ borderTop: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)" }}>
          <span className="text-xs font-bold" style={{ color: "var(--foreground)" }}>Total: ${total.toFixed(2)}</span>
          <button
            onClick={() => {
              for (const item of items) {
                const coupon = findCoupon(item.item, item.store);
                if (coupon) addItem(coupon);
              }
            }}
            className="text-[10px] font-black px-3 py-1 rounded-full transition hover:opacity-90"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            Add All
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={open ? () => setOpen(false) : openPanel}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold shadow-lg transition hover:opacity-90"
        style={{ background: "var(--foreground)", color: "var(--background)" }}
      >
        {open ? "✕ Close" : "✨ AI Basket"}
        {!open && <span className="text-[9px] opacity-50 font-mono">Llama 3.1</span>}
      </button>

      {/* Side panel */}
      <div
        className={`fixed top-14 right-0 bottom-0 z-40 w-80 flex flex-col shadow-xl transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ background: "var(--background)", borderLeft: "1px solid color-mix(in srgb, var(--foreground) 12%, transparent)" }}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid color-mix(in srgb, var(--foreground) 12%, transparent)" }}>
          <div>
            <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>✨ AI Basket</span>
            <span className="ml-2 text-[10px] opacity-40 font-mono" style={{ color: "var(--foreground)" }}>Llama-3.1-70B</span>
          </div>
          <button onClick={() => setOpen(false)} className="text-lg leading-none opacity-40 hover:opacity-100">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-sm text-center mt-8 opacity-40" style={{ color: "var(--foreground)" }}>
              Ask me to build a balanced basket from this week&apos;s deals!
            </p>
          )}
          {messages.map((msg) =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            msg.parts.map((part: any, pi: number) => {
              if (part.type === "text" && part.text) {
                return (
                  <div key={`${msg.id}-${pi}`} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className="max-w-[85%] rounded-2xl px-3 py-2 text-sm"
                      style={
                        msg.role === "user"
                          ? { background: "var(--accent)", color: "var(--accent-fg)" }
                          : { background: "color-mix(in srgb, var(--foreground) 8%, transparent)", color: "var(--foreground)" }
                      }
                    >
                      <p className="whitespace-pre-wrap">{part.text}</p>
                    </div>
                  </div>
                );
              }
              if (part.type === "tool-invocation" && part.toolInvocation?.toolName === "suggestBasket") {
                const inv = part.toolInvocation;
                if (inv.state === "call" || inv.state === "result") {
                  return (
                    <div key={`${msg.id}-${pi}`} className="flex justify-start">
                      <div className="max-w-[92%] w-full">
                        <SuggestionCard items={inv.args.items} summary={inv.args.summary} />
                      </div>
                    </div>
                  );
                }
              }
              return null;
            })
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl px-3 py-2 text-sm opacity-50" style={{ background: "color-mix(in srgb, var(--foreground) 8%, transparent)", color: "var(--foreground)" }}>
                Thinking…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!input.trim() || loading) return;
            sendMessage({ text: input });
            setInput("");
          }}
          className="flex gap-2 p-3"
          style={{ borderTop: "1px solid color-mix(in srgb, var(--foreground) 12%, transparent)" }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. build me a healthy week of meals…"
            className="flex-1 rounded-full px-3 py-1.5 text-sm focus:outline-none"
            style={{ background: "color-mix(in srgb, var(--foreground) 6%, transparent)", border: "1px solid color-mix(in srgb, var(--foreground) 15%, transparent)", color: "var(--foreground)" }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-full px-3 py-1.5 text-sm disabled:opacity-40 transition"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            →
          </button>
        </form>
      </div>
    </>
  );
}
