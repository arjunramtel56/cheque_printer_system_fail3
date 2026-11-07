"use client";

import { useEffect, useRef, useState } from "react";
import { Ruler, ShieldCheck, Printer } from "lucide-react";
import { DemoChequePreview } from "./demo-cheque-preview";

const REST_TRANSFORM = "rotateX(7deg) rotateY(-12deg) rotateZ(0.5deg)";

/**
 * CSS-only 3D showcase for the hero. A pointer tilt on desktop adds depth
 * without shipping a WebGL runtime; touch and reduced-motion users get a
 * static, perfectly readable card.
 */
export function HeroCheque3D() {
  const stageRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState(REST_TRANSFORM);
  const [tiltEnabled, setTiltEnabled] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarse = window.matchMedia("(pointer: coarse)");
    const update = () => setTiltEnabled(!reduced.matches && !coarse.matches);
    update();
    reduced.addEventListener("change", update);
    coarse.addEventListener("change", update);
    return () => {
      reduced.removeEventListener("change", update);
      coarse.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !tiltEnabled) {
      setTransform(REST_TRANSFORM);
      return;
    }

    let frame = 0;
    const onPointerMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = stage.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        setTransform(
          `rotateX(${(7 - y * 9).toFixed(2)}deg) rotateY(${(-12 + x * 14).toFixed(
            2
          )}deg) rotateZ(${(x * 1.2).toFixed(2)}deg)`
        );
      });
    };
    const onPointerLeave = () => {
      cancelAnimationFrame(frame);
      setTransform(REST_TRANSFORM);
    };

    stage.addEventListener("pointermove", onPointerMove);
    stage.addEventListener("pointerleave", onPointerLeave);
    return () => {
      cancelAnimationFrame(frame);
      stage.removeEventListener("pointermove", onPointerMove);
      stage.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [tiltEnabled]);

  return (
    <div className="relative mx-auto w-full max-w-lg">
      <div
        aria-hidden="true"
        className="absolute inset-x-6 top-10 bottom-6 rounded-[2rem] bg-blue-500/30 blur-3xl"
      />

      <div className="animate-float relative [perspective:1400px]">
        <div
          ref={stageRef}
          className="relative [transform-style:preserve-3d] [transition:transform_300ms_ease-out] will-change-transform"
          style={{ transform }}
        >
          <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-white/20 via-white/10 to-white/5 p-2 shadow-[0_40px_80px_-30px_rgba(2,6,23,0.9)] backdrop-blur">
            <div className="rounded-2xl bg-white p-3 shadow-inner sm:p-4">
              <DemoChequePreview compact />
            </div>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/20"
            />
          </div>

          <div
            className="absolute -right-4 top-8 hidden items-center gap-2 rounded-xl border border-white/15 bg-navy-900/80 px-3 py-2 text-xs font-medium text-cyan-100 shadow-xl backdrop-blur [transform:translateZ(55px)] sm:flex"
            aria-hidden="true"
          >
            <Ruler className="h-3.5 w-3.5 text-cyan-300" />
            190.5 × 88.9 mm
          </div>

          <div
            className="absolute -left-5 bottom-24 hidden items-center gap-2 rounded-xl border border-white/15 bg-navy-900/80 px-3 py-2 text-xs font-medium text-cyan-100 shadow-xl backdrop-blur [transform:translateZ(70px)] sm:flex"
            aria-hidden="true"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
            A/C PAYEE ONLY
          </div>

          <div
            className="absolute -right-3 bottom-6 hidden items-center gap-2 rounded-xl border border-white/15 bg-navy-900/80 px-3 py-2 text-xs font-medium text-cyan-100 shadow-xl backdrop-blur [transform:translateZ(40px)] sm:flex"
            aria-hidden="true"
          >
            <Printer className="h-3.5 w-3.5 text-blue-300" />
            Direct Feed · A4
          </div>
        </div>
      </div>
    </div>
  );
}
