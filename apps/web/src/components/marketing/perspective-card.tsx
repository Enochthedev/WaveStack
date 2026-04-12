"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

interface PerspectiveCardProps {
  children: ReactNode;
  intensity?: number;
}

export function PerspectiveCard({ children, intensity = 10 }: PerspectiveCardProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const card = cardRef.current;
    const wrap = wrapRef.current;
    if (!card || !wrap) return;

    const xTo = gsap.quickTo(card, "rotateY", {
      duration: 0.4,
      ease: "power2.out",
    });
    const yTo = gsap.quickTo(card, "rotateX", {
      duration: 0.4,
      ease: "power2.out",
    });

    const handleMove = (e: MouseEvent) => {
      const rect = wrap.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      xTo((px - 0.5) * intensity);
      yTo((0.5 - py) * intensity);
    };

    const handleLeave = () => {
      xTo(0);
      yTo(0);
    };

    wrap.addEventListener("mousemove", handleMove);
    wrap.addEventListener("mouseleave", handleLeave);
    return () => {
      wrap.removeEventListener("mousemove", handleMove);
      wrap.removeEventListener("mouseleave", handleLeave);
    };
  });

  return (
    <div ref={wrapRef} style={{ perspective: 800 }}>
      <div ref={cardRef} style={{ transformStyle: "preserve-3d" }}>
        {children}
      </div>
    </div>
  );
}
