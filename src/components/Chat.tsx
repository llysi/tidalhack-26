"use client";

import { useState, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

interface ChatProps {
  phase: "intake" | "results";
}

export default function Chat({ phase }: ChatProps) {
  const [input, setInput] = useState("");

  const [sessionId] = useState(() => {
    try {
      // Use Web Crypto API when available for a stable unique id
      // Fallback to timestamp when not available
      // cast to any to avoid TS issues in some environments
      return (globalThis as any)?.crypto?.randomUUID?.() ?? String(Date.now());
    } catch {
      return String(Date.now());
    }
  });

  useEffect(() => {
    try {
      // Clear client storage so the app always starts fresh on each visit
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      // ignore storage errors (e.g., SSR or blocked storage)
    }
  }, []);


  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
const [locError, setLocError] = useState<string>("");


const handleGetLocation = () => {
  if (!navigator.geolocation) {
    setLocError("Geolocation is not supported by your browser.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      setCoords({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
      console.log("Location captured:", position.coords.latitude, position.coords.longitude);
    },
    (error) => {
      setLocError("Location access denied. Please enter your zip code manually.");
    }
  );
};

<div className="flex flex-col gap-2">
  <button 
    onClick={handleGetLocation}
    className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition"
  >
    📍 Use My Current Location
  </button>
  
  {coords && <p className="text-green-500 text-sm">Location set!</p>}
  {locError && <p className="text-red-500 text-sm">{locError}</p>}
</div>


  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { phase, sessionId },
    }),
  });

  const isLoading = status === "submitted" || status === "streaming";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
  }

  // Extract text content from a message's parts array
  function getMessageText(message: (typeof messages)[number]): string {
    return message.parts
      .filter((part): part is { type: "text"; text: string } => part.type === "text")
      .map((part) => part.text)
      .join("");
  }

  

  return (
    <div className="flex h-full flex-col">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-zinc-400 text-center mt-8">
            {phase === "intake"
              ? "Hi! Tell me what kind of food resources you're looking for."
              : "Ask me anything about the food resources shown on the map."}
          </p>
        )}

        {messages.map((message) => {
          const text = getMessageText(message);
          if (!text) return null;

          return (
            <div
              key={message.id}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  message.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                }`}
              >
                {/* TODO: Render markdown or rich content if needed */}
                <p className="whitespace-pre-wrap">{text}</p>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-zinc-100 dark:bg-zinc-800 rounded-2xl px-4 py-2 text-zinc-400">
              Thinking...
            </div>
          </div>
        )}
      </div>

      {/* Input form */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-zinc-200 dark:border-zinc-700 p-4 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-full border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="rounded-full bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </form>
    </div>
  );
}
