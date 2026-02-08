"use client";

import { useEffect, useState } from "react";
import CouponChat from "@/components/CouponChat";

export default function Home() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 150);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex flex-col items-center justify-start pt-12 pb-12 bg-background text-foreground font-sans">
      <div
        className="text-center mb-8 transition-all duration-1000 ease-out"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(15px)",
        }}
      >
        <h1 className="text-6xl font-black tracking-tighter text-foreground mb-2">ADI-I</h1>
        <p className="text-lg font-medium text-zinc-500 italic">Your AI food resource assistant</p>
      </div>

      <div
        className="w-full max-w-4xl transition-all duration-1000 delay-300"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(25px)",
        }}
      >
        <CouponChat coupons={[]} inline />
      </div>
    </div>
  );
}
