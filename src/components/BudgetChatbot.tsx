"use client";
import React, { useEffect, useState } from "react";

export default function BudgetChatbot(): JSX.Element {
  const [open, setOpen] = useState(false);
  const [people, setPeople] = useState<number | null>(null);
  const [budget, setBudget] = useState<string | null>(null);
  const [car, setCar] = useState<boolean | null>(null);
  const [step, setStep] = useState<"people" | "budget" | "car">("people");
  const [input, setInput] = useState("");

  useEffect(() => {
    try {
      const storedBudget = localStorage.getItem("user_budget");
      const storedPeople = localStorage.getItem("user_people");
      const storedCar = localStorage.getItem("user_car");
      if (storedBudget) setBudget(storedBudget);
      if (storedPeople) setPeople(Number.parseInt(storedPeople, 10) || null);
      if (storedCar === "yes") setCar(true);
      if (storedCar === "no") setCar(false);
    } catch (e) {
      // ignore in non-browser environments
    }
  }, []);

  function savePeople() {
    const val = input.trim();
    const n = Number.parseInt(val, 10);
    if (!val || Number.isNaN(n) || n <= 0) return;
    try {
      localStorage.setItem("user_people", String(n));
      setPeople(n);
    } catch (e) {}
    setInput("");
    setStep("budget");
  }

  function saveBudget() {
    const val = input.trim();
    if (!val) return;
    try {
      localStorage.setItem("user_budget", val);
      setBudget(val);
    } catch (e) {}
    setInput("");
    setStep("car");
  }

  function saveCar(hasCar: boolean) {
    try {
      localStorage.setItem("user_car", hasCar ? "yes" : "no");
      setCar(hasCar);
    } catch (e) {}
    setOpen(false);
  }

  function clearAll() {
    try {
      localStorage.removeItem("user_budget");
      localStorage.removeItem("user_people");
      localStorage.removeItem("user_car");
    } catch (e) {}
    setBudget(null);
    setPeople(null);
    setCar(null);
    setInput("");
    setStep("people");
    setOpen(true);
  }

  useEffect(() => {
    function clearOnClose() {
      try {
        localStorage.removeItem("user_budget");
        localStorage.removeItem("user_people");
        localStorage.removeItem("user_car");
      } catch (e) {}
    }

    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", clearOnClose);
      window.addEventListener("pagehide", clearOnClose);
      window.addEventListener("unload", clearOnClose);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("beforeunload", clearOnClose);
        window.removeEventListener("pagehide", clearOnClose);
        window.removeEventListener("unload", clearOnClose);
      }
    };
  }, []);

  return (
    <>
      {/* Chat trigger (centered) */}
      {!open && (
        <div
          style={{
            position: "fixed",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 9999,
          }}
        >
          <button
            onClick={() => {
              setStep("people");
              setInput("");
              setOpen(true);
            }}
            aria-label="Open budget chatbot"
            style={{
              background: "#0ea5e9",
              color: "white",
              border: "none",
              padding: "12px 16px",
              borderRadius: 28,
              boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            {people && budget
              ? `People: ${people} • Budget: ${budget}`
              : budget
              ? `Budget: ${budget}`
              : people
              ? `People: ${people}`
              : "Start"}
          </button>
        </div>
      )}

      {/* Modal / Prompt */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "white",
            zIndex: 10000,
            padding: 16,
          }}
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 360,
              maxWidth: "100%",
              background: "white",
              borderRadius: 12,
              padding: 20,
              boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
            }}
          >
            <h3 style={{ margin: "0 0 8px 0" }}>Hi! AID-I is happy to help you today!</h3>
            {step === "people" ? (
              <>
                <p style={{ margin: "0 0 12px 0", color: "#374151" }}>
                  To plan the best course of action, please tell us a bit about yourself. How many people do you need to feed?
                </p>

                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") savePeople();
                  }}
                  placeholder={people ? String(people) : "Enter number of people"}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    marginBottom: 12,
                  }}
                />

                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  {people && (
                    <button
                      onClick={clearAll}
                      style={{
                        background: "transparent",
                        border: "1px solid #e5e7eb",
                        padding: "8px 12px",
                        borderRadius: 8,
                        cursor: "pointer",
                      }}
                    >
                      Reset
                    </button>
                  )}

                  <button
                    onClick={() => setOpen(false)}
                    style={{
                      background: "transparent",
                      border: "1px solid #e5e7eb",
                      padding: "8px 12px",
                      borderRadius: 8,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    onClick={savePeople}
                    style={{
                      background: "#10b981",
                      color: "white",
                      border: "none",
                      padding: "8px 12px",
                      borderRadius: 8,
                      cursor: "pointer",
                    }}
                  >
                    Save
                  </button>
                </div>
              </>
            ) : step === "budget" ? (
              <>
                <p style={{ margin: "0 0 12px 0", color: "#374151" }}>
                  What is your weekly food budget?
                </p>

                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveBudget();
                  }}
                  placeholder={budget ?? "Enter your weekly budget"}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    marginBottom: 12,
                  }}
                />

                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button
                    onClick={() => {
                      setStep("people");
                      setInput("2");
                    }}
                    style={{
                      background: "transparent",
                      border: "1px solid #e5e7eb",
                      padding: "8px 12px",
                      borderRadius: 8,
                      cursor: "pointer",
                    }}
                  >
                    Back
                  </button>

                  <button
                    onClick={() => setOpen(false)}
                    style={{
                      background: "transparent",
                      border: "1px solid #e5e7eb",
                      padding: "8px 12px",
                      borderRadius: 8,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    onClick={saveBudget}
                    style={{
                      background: "#10b981",
                      color: "white",
                      border: "none",
                      padding: "8px 12px",
                      borderRadius: 8,
                      cursor: "pointer",
                    }}
                  >
                    Save
                  </button>
                </div>
              </>
            ) : (
              <>
                <p style={{ margin: "0 0 12px 0", color: "#374151" }}>
                  Do you have access to a car?
                </p>

                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginBottom: 12 }}>
                  <button
                    onClick={() => saveCar(true)}
                    style={{
                      background: car === true ? "#0ea5e9" : "#10b981",
                      color: "white",
                      border: "none",
                      padding: "8px 12px",
                      borderRadius: 8,
                      cursor: "pointer",
                    }}
                  >
                    Yes
                  </button>

                  <button
                    onClick={() => saveCar(false)}
                    style={{
                      background: car === false ? "#0ea5e9" : "#ef4444",
                      color: "white",
                      border: "none",
                      padding: "8px 12px",
                      borderRadius: 8,
                      cursor: "pointer",
                    }}
                  >
                    No
                  </button>
                </div>

                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button
                    onClick={() => setStep("budget")}
                    style={{
                      background: "transparent",
                      border: "1px solid #e5e7eb",
                      padding: "8px 12px",
                      borderRadius: 8,
                      cursor: "pointer",
                    }}
                  >
                    Back
                  </button>

                  <button
                    onClick={() => setOpen(false)}
                    style={{
                      background: "transparent",
                      border: "1px solid #e5e7eb",
                      padding: "8px 12px",
                      borderRadius: 8,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
