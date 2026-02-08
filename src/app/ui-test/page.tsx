"use client";

import { useState, useEffect, useRef } from "react";
import { useLocation } from "@/contexts/LocationContext";

const SUGGESTIONS = [
  "I need help budgeting food for a family of 4",
  "Help me eat protein for under $50 this week",
  "Find food pantries near me",
  "What groceries are on sale this week?",
  "I have EBT — what stores accept it?",
  "Suggest a healthy meal plan on a budget",
  "I'm feeding 2 people on $30 a week",
  "What are the best deals near me?",
  "I need cheap high-protein meals",
  "Help me stretch my grocery budget",
];

type Step = "people" | "budget" | "car" | "address" | "done";

interface Message {
  role: "bot" | "user";
  text: string;
}

interface AutocompleteSuggestion {
  placeId: string;
  description: string;
}

const INITIAL_MESSAGES: Message[] = [
  {
    role: "bot",
    text: "Hi! I'm HoneyBear. I can help you find food resources, plan your grocery budget, and discover deals near you.",
  },
  { role: "bot", text: "To get started — how many people are you shopping for?" },
];

export default function UITestPage() {
  const { setLocation } = useLocation();

  const [titleVisible, setTitleVisible] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [step, setStep] = useState<Step>("people");
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const [acSuggestions, setAcSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [geocoding, setGeocoding] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t1 = setTimeout(() => setTitleVisible(true), 150);
    const t2 = setTimeout(() => setChatVisible(true), 600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Prevents the "jump" on load by checking message length
  useEffect(() => {
    if (messages.length > INITIAL_MESSAGES.length) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (step !== "address") return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (input.length < 2) { setAcSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/autocomplete?q=${encodeURIComponent(input)}`);
        if (res.ok) setAcSuggestions(await res.json());
      } catch {}
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [input, step]);

  function addMessage(msg: Message) {
    setMessages((prev) => [...prev, msg]);
  }

  async function selectAddress(s: AutocompleteSuggestion) {
    setAcSuggestions([]);
    setInput("");
    addMessage({ role: "user", text: s.description });
    setGeocoding(true);
    try {
      const res = await fetch(`/api/geocode?place_id=${encodeURIComponent(s.placeId)}`);
      if (res.ok) {
        const loc = await res.json();
        if (loc) setLocation(loc);
      }
    } finally {
      setGeocoding(false);
    }
    addMessage({
      role: "bot",
      text: "Perfect! I'm finding deals and resources near you — check out the Coupons and Pantries pages!",
    });
    setStep("done");
  }

  function handleSubmit(text?: string) {
    const val = (text ?? input).trim();
    if (!val) return;
    setInput("");
    setAcSuggestions([]);
    addMessage({ role: "user", text: val });

    setTimeout(() => {
      if (step === "people") {
        try { localStorage.setItem("user_people", val); } catch {}
        addMessage({ role: "bot", text: "Got it! What's your weekly food budget?" });
        setStep("budget");
      } else if (step === "budget") {
        try { localStorage.setItem("user_budget", val); } catch {}
        addMessage({ role: "bot", text: "Do you have access to a car for grocery trips?" });
        setStep("car");
      }
    }, 400);
  }

  function handleCar(yes: boolean) {
    try { localStorage.setItem("user_car", yes ? "yes" : "no"); } catch {}
    addMessage({ role: "user", text: yes ? "Yes, I have a car" : "No, I don't have a car" });
    setTimeout(() => {
      addMessage({ role: "bot", text: "Almost there! What's your address?" });
      setStep("address");
    }, 400);
  }

  const placeholder =
    step === "people" ? "Number of people…"
    : step === "budget" ? "Weekly budget (e.g. $50)…"
    : step === "address" ? "Enter your address…"
    : "";

  return (
    <div className="min-h-screen flex flex-col items-center justify-start px-6 pt-24 pb-12 bg-background text-foreground font-sans overflow-hidden">
      
      {/* Title Section */}
      <div
        className="text-center mb-8 transition-all duration-1000 ease-out"
        style={{
          opacity: titleVisible ? 1 : 0,
          transform: titleVisible ? "translateY(0)" : "translateY(15px)", 
        }}
      >
        <h1 className="text-6xl font-black tracking-tighter text-foreground mb-2">HoneyBear</h1>
        <p className="text-lg font-medium text-zinc-500 italic">Your AI food resource assistant</p>
      </div>

      {/* Chat Panel: max-w-4xl (Wider) and h-[460px] (Shorter) */}
      <div
        className="w-full max-w-4xl transition-all duration-1000 delay-300"
        style={{
          opacity: chatVisible ? 1 : 0,
          transform: chatVisible ? "translateY(0)" : "translateY(25px)",
        }}
      >
        <div className="bg-white/70 backdrop-blur-xl border-2 border-zinc-100 rounded-[2.5rem] shadow-2xl shadow-zinc-200/50 flex flex-col h-[460px] overflow-hidden">
          
          <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-[1.5rem] px-6 py-3 text-sm font-medium leading-relaxed shadow-sm ${
                    msg.role === "user"
                      ? "bg-gradient-to-br from-foreground to-zinc-800 text-background"
                      : "bg-gradient-to-br from-zinc-100/60 to-zinc-200/60 text-foreground border border-white/40"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {step === "car" && (
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => handleCar(true)}
                  className="px-8 py-2.5 rounded-full text-xs font-black uppercase tracking-widest bg-accent text-accent-fg hover:scale-105 transition-all shadow-md"
                > Yes </button>
                <button
                  onClick={() => handleCar(false)}
                  className="px-8 py-2.5 rounded-full text-xs font-black uppercase tracking-widest bg-zinc-200/50 text-foreground hover:bg-zinc-200 transition-all backdrop-blur-sm"
                > No </button>
              </div>
            )}

            {geocoding && (
              <div className="flex items-center gap-2 text-[10px] font-black uppercase text-zinc-400">
                <span className="w-1.5 h-1.5 bg-accent rounded-full animate-ping" /> Locating...
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Bottom Area: Dropdown autocomplete + Shorter Input */}
          {step !== "done" && step !== "car" && (
            <div className="relative p-3 bg-white/40 backdrop-blur-2xl border-t border-zinc-100">
              
              {/* Dropdown Style Autocomplete */}
              {step === "address" && acSuggestions.length > 0 && (
                <div className="absolute bottom-full left-3 right-3 mb-2 bg-white/95 backdrop-blur-2xl border border-zinc-100 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-40 overflow-y-auto custom-scrollbar">
                  {acSuggestions.map((s) => (
                    <button
                      key={s.placeId}
                      onClick={() => selectAddress(s)}
                      className="block w-full text-left px-5 py-3 text-xs font-bold border-b border-zinc-50 last:border-none hover:bg-accent hover:text-accent-fg transition-all text-foreground"
                    >
                      <span className="mr-2 opacity-50">📍</span> {s.description}
                    </button>
                  ))}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (step === "address" && acSuggestions.length > 0) selectAddress(acSuggestions[0]);
                  else handleSubmit();
                }}
                className="flex gap-2"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={placeholder}
                  className="flex-1 rounded-xl px-5 py-2.5 text-sm font-medium bg-zinc-100/50 border-2 border-transparent focus:border-accent focus:bg-white transition-all outline-none text-foreground placeholder:text-zinc-400"
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="bg-accent text-accent-fg px-6 rounded-xl flex items-center justify-center font-black shadow-lg shadow-accent/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-20"
                >
                  <span className="text-lg">→</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}