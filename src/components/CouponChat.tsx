"use client";

import { useState, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { Coupon } from "@/lib/coupons/types";
import { useBasket } from "@/contexts/BasketContext";
import { getProfile, saveProfile, nextProfileQuestion, isProfileComplete } from "@/lib/user-profile";

interface CouponChatProps {
  coupons: Coupon[];
  inline?: boolean;
}

interface SuggestedItem {
  item: string;
  store: string;
  price: number;
  reason: string;
}

function BotBubble({ text, size = "normal" }: { text: string; size?: "normal" | "large" }) {
  return (
    <div className="flex justify-start">
      <div
        className={`max-w-[85%] rounded-2xl whitespace-pre-wrap ${size === "large" ? "px-4 py-2.5 text-sm" : "px-3 py-2 text-sm"}`}
        style={{ background: "color-mix(in srgb, var(--foreground) 8%, transparent)", color: "var(--foreground)" }}
      >
        {text}
      </div>
    </div>
  );
}

export default function CouponChat({ coupons, inline }: CouponChatProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [snapshot, setSnapshot] = useState<Coupon[]>([]);
  const [profile, setProfile] = useState<ReturnType<typeof getProfile>>({ people: null, budget: null, car: null });
  const bottomRef = useRef<HTMLDivElement>(null);
  const handledTools = useRef<Set<string>>(new Set());
  const { items: basketItems, addItem } = useBasket();

  // Load profile from localStorage after mount (avoids SSR/client mismatch)
  useEffect(() => {
    setProfile(getProfile());
  }, []);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/coupon-chat",
      body: { coupons: snapshot, basket: basketItems, profile },
    }),
  });

  const loading = status === "submitted" || status === "streaming";

  // Sync profile to localStorage when saveProfile tool result arrives
  useEffect(() => {
    for (const msg of messages) {
      for (const part of msg.parts) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const p = part as any;
        if (p.type !== "tool-invocation") continue;
        const inv = p.toolInvocation;
        if (!inv || inv.state !== "result") continue;
        if (handledTools.current.has(inv.toolCallId)) continue;
        handledTools.current.add(inv.toolCallId);

        if (inv.toolName === "saveProfile") {
          saveProfile(inv.args);
          setProfile(getProfile());
        }
      }
    }
  }, [messages]);

  function openPanel() {
    setSnapshot(coupons);
    setProfile(getProfile());
    setOpen(true);
  }

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  // In inline mode, auto-open on mount
  useEffect(() => {
    if (inline) {
      setSnapshot(coupons);
      setProfile(getProfile());
      setOpen(true);
    }
  }, [inline, coupons]);

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

  const initialQuestion = nextProfileQuestion(profile);

  // Shared message list JSX (not a component — avoids remount on every render)
  const messageListJsx = (padded: boolean) => (
    <div className={`flex-1 overflow-y-auto space-y-3 ${padded ? "p-6" : "p-4"}`}>
      {messages.length === 0 && (
        <div className="space-y-2 mt-2">
          {initialQuestion ? (
            <BotBubble text={initialQuestion} size="large" />
          ) : (
            <BotBubble text={isProfileComplete(profile) ? "Welcome back! Ready to build your basket from this week's deals?" : "Ask me anything about groceries, budgeting, or meal planning!"} size="large" />
          )}
        </div>
      )}
      {messages.map((msg) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        msg.parts.map((part: any, pi: number) => {
          if (part.type === "text" && part.text) {
            return (
              <div key={`${msg.id}-${pi}`} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`rounded-2xl whitespace-pre-wrap text-sm ${padded ? "max-w-[80%] px-4 py-2.5" : "max-w-[85%] px-3 py-2"}`}
                  style={
                    msg.role === "user"
                      ? { background: padded ? "var(--foreground)" : "var(--accent)", color: padded ? "var(--background)" : "var(--accent-fg)" }
                      : { background: "color-mix(in srgb, var(--foreground) 8%, transparent)", color: "var(--foreground)" }
                  }
                >
                  {part.text}
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
      {loading && <BotBubble text="Thinking…" />}
      <div ref={bottomRef} />
    </div>
  );

  if (inline) {
    return (
      <div
        className="flex flex-col rounded-[2rem] overflow-hidden shadow-2xl shadow-zinc-200/50 border-2 border-zinc-100"
        style={{ background: "var(--background)", height: "460px" }}
      >
        <div className="flex items-center px-6 py-4" style={{ borderBottom: "1px solid color-mix(in srgb, var(--foreground) 8%, transparent)" }}>
          <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>✨ ADI-I</span>
          <span className="ml-2 text-[10px] opacity-40 font-mono" style={{ color: "var(--foreground)" }}>Llama-3.1-70B</span>
          {isProfileComplete(profile) && (
            <span className="ml-auto text-[9px] opacity-40 font-mono" style={{ color: "var(--foreground)" }}>
              {profile.people}p · {profile.budget} · {profile.car === "yes" ? "🚗" : "🚶"}
            </span>
          )}
        </div>
        {messageListJsx(true)}
        <form
          onSubmit={(e) => { e.preventDefault(); if (!input.trim() || loading) return; sendMessage({ text: input }); setInput(""); }}
          className="flex gap-2 p-4"
          style={{ borderTop: "1px solid color-mix(in srgb, var(--foreground) 8%, transparent)" }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your answer…"
            className="flex-1 rounded-full px-4 py-2 text-sm focus:outline-none"
            style={{ background: "color-mix(in srgb, var(--foreground) 6%, transparent)", border: "1px solid color-mix(in srgb, var(--foreground) 12%, transparent)", color: "var(--foreground)" }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-full px-4 py-2 text-sm disabled:opacity-40 transition"
            style={{ background: "var(--foreground)", color: "var(--background)" }}
          >
            →
          </button>
        </form>
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
        {messageListJsx(false)}
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
            placeholder={initialQuestion ? "Type your answer…" : "e.g. build me a healthy week of meals…"}
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
