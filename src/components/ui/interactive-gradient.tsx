"use client";

import { useEffect, useRef } from "react";

export function InteractiveGradient() {
  const interactiveRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let curX = 0;
    let curY = 0;
    let tgX = 0;
    let tgY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      if (interactiveRef.current) {
        const rect = interactiveRef.current.parentElement?.getBoundingClientRect();
        if (rect) {
          tgX = event.clientX - rect.left;
          tgY = event.clientY - rect.top;
        }
      }
    };

    window.addEventListener("mousemove", handleMouseMove);

    const move = () => {
      curX += (tgX - curX) / 20;
      curY += (tgY - curY) / 20;
      if (interactiveRef.current) {
        interactiveRef.current.style.transform = `translate(${Math.round(curX)}px, ${Math.round(curY)}px)`;
      }
      requestAnimationFrame(move);
    };

    const animationId = requestAnimationFrame(move);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden bg-background">
      {/* Background radial gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-primary/10 opacity-80" />
      
      {/* Noise filter */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.15] mix-blend-overlay" xmlns="http://www.w3.org/2000/svg">
        <filter id="noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noise)" />
      </svg>
      
      {/* Animated blobs */}
      <div className="absolute -inset-[100%] opacity-50 mix-blend-multiply blur-3xl filter dark:mix-blend-screen">
        <div className="absolute top-1/2 left-1/2 h-[40vw] w-[40vw] -translate-x-1/2 -translate-y-1/2 animate-[spin_10s_linear_infinite] rounded-full bg-primary/30" />
        <div className="absolute top-1/2 left-1/2 h-[35vw] w-[35vw] -translate-x-1/2 -translate-y-1/2 animate-[spin_15s_linear_infinite_reverse] rounded-full bg-blue-500/20" />
      </div>

      {/* Mouse interactive blob */}
      <div
        ref={interactiveRef}
        className="pointer-events-none absolute -top-[15vw] -left-[15vw] h-[30vw] w-[30vw] mix-blend-multiply blur-3xl filter dark:mix-blend-screen transition-transform duration-75"
      >
        <div className="h-full w-full rounded-full bg-primary/40 opacity-70" />
      </div>
    </div>
  );
}
