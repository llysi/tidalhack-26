"use client";

import { useState, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { Coupon } from "@/lib/coupons/types";

interface CouponChatProps {
  coupons: Coupon[];
}

export default function CouponChat({ coupons }: CouponChatProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [snapshot, setSnapshot] = useState<Coupon[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/coupon-chat",
      body: { coupons: snapshot },
    }),
  });

  const loading = status === "submitted" || status === "streaming";

  function openPanel() {
    setSnapshot(coupons);
    setOpen(true);
  }

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={open ? () => setOpen(false) : openPanel}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg hover:bg-blue-700 transition"
      >
        {open ? "✕ Close" : "✨ AI Basket"}
      </button>

      {/* Side panel */}
      <div
        className={`fixed top-14 right-0 bottom-0 z-40 w-80 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-700 flex flex-col shadow-xl transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
          <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">✨ AI Basket</span>
          <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-600 text-lg leading-none">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-sm text-zinc-400 text-center mt-8">
              Ask me to build a balanced basket from this week&apos;s deals!
            </p>
          )}
          {messages.map((msg) => {
            const text = msg.parts
              .filter((p): p is { type: "text"; text: string } => p.type === "text")
              .map((p) => p.text)
              .join("");
            if (!text) return null;
            return (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{text}</p>
                </div>
              </div>
            );
          })}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-zinc-100 dark:bg-zinc-800 rounded-2xl px-3 py-2 text-sm text-zinc-400">
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
          className="border-t border-zinc-200 dark:border-zinc-700 flex gap-2 p-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. build me a healthy week of meals…"
            className="flex-1 rounded-full border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-full bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            →
          </button>
        </form>
      </div>
    </>
  );
}
