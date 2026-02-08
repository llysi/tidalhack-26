"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function Home() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Initial animation delay
    const t = setTimeout(() => setVisible(true), 150);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center px-6 bg-background text-foreground font-sans overflow-hidden">
      
      {/* Hero Content */}
      <div
        className="text-center mb-12 transition-all duration-1000 ease-out"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(20px)", 
        }}
      >
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-foreground mb-6 leading-[0.85]">
          HUNT THE DEALS.<br />
          KEEP THE <span className="text-amber-400 drop-shadow-[0_2px_15px_rgba(251,191,36,0.3)]">HONEY.</span>
        </h1>
        
        <p className="text-xl font-medium text-zinc-500 italic max-w-xl mx-auto leading-relaxed">
          Your AI-powered assistant for local grocery deals, 
          community resources, and smart budget planning.
        </p>
      </div>

      {/* Main Call to Action */}
      <div 
        className="transition-all duration-1000 delay-500 flex flex-col items-center"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(20px)",
        }}
      >
        <Link 
          href="/coupons?chat=true" 
          className="group relative inline-flex items-center gap-4 bg-foreground text-background px-12 py-6 rounded-full text-xl font-black uppercase tracking-widest hover:scale-105 hover:bg-zinc-800 active:scale-95 transition-all shadow-[0_20px_50px_rgba(0,0,0,0.1)]"
        >
          Start Saving Now
          <span className="text-2xl group-hover:translate-x-2 transition-transform">→</span>
        </Link>
        
        <div className="mt-8 flex items-center gap-4">
          <div className="flex -space-x-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-background bg-zinc-200 flex items-center justify-center text-[10px]">
                {i === 1 ? '🐻' : i === 2 ? '🍯' : '🛒'}
              </div>
            ))}
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
            Join 1,000+ neighbors saving weekly
          </p>
        </div>
      </div>
    </div>
  );
}