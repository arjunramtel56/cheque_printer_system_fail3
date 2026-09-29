"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  /** Extra classes on the wrapper (layout classes still live on the wrapper). */
  className?: string;
  /** Stagger via animation-delay, e.g. "75ms", "150ms". */
  delay?: "0" | "75" | "150" | "200" | "300";
};

/**
 * Scroll-reveal wrapper: children fade/slide in the first time they enter the
 * viewport. Pure IntersectionObserver — no animation library, and content is
 * fully visible (no hidden state) when JS is disabled or reduced-motion is on.
 */
export function Reveal({ children, className, delay = "0" }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const delayClass =
    delay === "75"
      ? "anim-delay-75"
      : delay === "150"
        ? "anim-delay-150"
        : delay === "200"
          ? "anim-delay-200"
          : delay === "300"
            ? "anim-delay-300"
            : "";

  return (
    <div
      ref={ref}
      className={`${shown ? "reveal-in" : "reveal-pending"} ${delayClass} ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
