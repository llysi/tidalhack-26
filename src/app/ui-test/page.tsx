"use client";

import { useState, useEffect, useRef } from "react";
import { useLocation } from "@/contexts/LocationContext";
// import ThemeSwitcher from "@/components/ThemeSwitcher";

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
    text: "Hi! I'm ADI-I. I can help you find food resources, plan your grocery budget, and discover deals near you.",
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

  // Address autocomplete state
  const [acSuggestions, setAcSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [geocoding, setGeocoding] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Staggered fade-ins
  useEffect(() => {
    const t1 = setTimeout(() => setTitleVisible(true), 150);
    const t2 = setTimeout(() => setChatVisible(true), 800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, acSuggestions]);

  // Debounced autocomplete when on address step
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
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ background: "var(--background)", color: "var(--foreground)" }}>
      {/* <ThemeSwitcher /> */}
      {/* Title */}
      <div
        className="text-center mb-8"
        style={{
          opacity: titleVisible ? 1 : 0,
          transform: titleVisible ? "translateY(0)" : "translateY(-12px)",
          transition: "opacity 0.7s ease, transform 0.7s ease",
        }}
      >
        <h1 className="text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          ADI-I
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-3 text-lg">
          Your AI food resource assistant
        </p>
      </div>

      {/* Chat panel */}
      <div
        className="w-full max-w-lg"
        style={{
          opacity: chatVisible ? 1 : 0,
          transform: chatVisible ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.7s ease, transform 0.7s ease",
        }}
      >
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-xl overflow-hidden flex flex-col h-[520px]">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {/* Yes/No buttons for car step */}
            {step === "car" && (
              <div className="flex gap-2 pl-1 pt-1">
                <button
                  onClick={() => handleCar(true)}
                  className="px-4 py-2 rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-sm font-medium hover:bg-green-200 dark:hover:bg-green-800 transition"
                >
                  Yes
                </button>
                <button
                  onClick={() => handleCar(false)}
                  className="px-4 py-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                >
                  No
                </button>
              </div>
            )}

            {/* Address autocomplete suggestions */}
            {step === "address" && acSuggestions.length > 0 && (
              <div className="space-y-1 pl-1">
                {acSuggestions.map((s) => (
                  <button
                    key={s.placeId}
                    onClick={() => selectAddress(s)}
                    className="block w-full text-left px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-600 dark:hover:text-blue-300 transition"
                  >
                    {s.description}
                  </button>
                ))}
              </div>
            )}

            {geocoding && (
              <p className="text-xs text-zinc-400 pl-1">Locating…</p>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Scrolling suggestion chips */}
          {step !== "done" && step !== "car" && (
            <div className="overflow-hidden border-t border-zinc-100 dark:border-zinc-800 py-2">
              <div
                className="flex gap-2 w-max"
                style={{ animation: "marquee 28s linear infinite" }}
              >
                {[...SUGGESTIONS, ...SUGGESTIONS].map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSubmit(s)}
                    className="shrink-0 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-600 dark:hover:text-blue-300 transition"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input area */}
          {step !== "done" && step !== "car" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (step === "address" && acSuggestions.length > 0) {
                  selectAddress(acSuggestions[0]);
                } else {
                  handleSubmit();
                }
              }}
              className="border-t border-zinc-200 dark:border-zinc-700 flex gap-2 p-3"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={placeholder}
                className="flex-1 rounded-full border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="rounded-full bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-40 transition"
              >
                →
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
