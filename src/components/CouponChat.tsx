"use client";

import { useState, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

export default function CouponChat({ coupons }: { coupons: any[] }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");

  // useChat initialization
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/coupon-chat",
      // This body is sent to the server. 
      // Ensure 'coupons' here refers to the prop passed from the page.
      body: { coupons }, 
    }),
  });

  const loading = status === "submitted" || status === "streaming";

  // REMOVE THE "return null" GUARD. 
  // Instead, show a loading state ONLY for the button or UI parts.

  return (
    <>
      <button 
        disabled={coupons.length === 0}
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 px-6 py-3 bg-black text-white rounded-full font-black disabled:opacity-50"
      >
        {coupons.length === 0 ? "⌛ Loading Deals..." : (open ? "✕" : "✨ AI Basket")}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 w-96 h-[500px] z-40 bg-white border border-zinc-200 rounded-[2rem] shadow-2xl flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${m.role === "user" ? "bg-black text-white" : "bg-zinc-100"}`}>
                  {/* FIX: Map through parts for UI Stream compatibility */}
                  {m.parts.map((part, i) => (
                    part.type === 'text' ? <span key={i} className="whitespace-pre-wrap">{part.text}</span> : null
                  ))}
                </div>
              </div>
            ))}
          </div>

          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              await sendMessage({ text: input });
              setInput("");
            }} 
            className="p-4 border-t flex gap-2"
          >
            <input 
              value={input} 
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 px-4 py-2 bg-zinc-100 rounded-xl outline-none" 
              placeholder="Suggest 2 dinner options..."
            />
            <button type="submit" className="bg-amber-400 text-white px-4 rounded-xl font-bold"> → </button>
          </form>
        </div>
      )}
    </>
  );
}