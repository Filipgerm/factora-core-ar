"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type AuthFormPanelProps = {
  children: React.ReactNode;
};

/**
 * Glass auth surface with subtle pointer tilt (disabled when reduced-motion is on).
 */
export function AuthFormPanel({ children }: AuthFormPanelProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [reduceMotion, setReduceMotion] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (reduceMotion) return;
      const el = shellRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      setTilt({ x: px * 5, y: -py * 5 });
    },
    [reduceMotion]
  );

  const onPointerLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
  }, []);

  const transform =
    reduceMotion || (tilt.x === 0 && tilt.y === 0)
      ? undefined
      : `perspective(920px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg) scale3d(1.008, 1.008, 1)`;

  return (
    <div
      className={cn(
        "w-full max-w-[min(32rem,100%)] lg:max-w-[min(34rem,100%)]",
        "lg:-ml-2 xl:-ml-4"
      )}
    >
      <div
        ref={shellRef}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        style={{ transform }}
        className={cn(
          "group/form-shell relative rounded-2xl border border-slate-200/85 bg-white/80 p-7 shadow-xl shadow-slate-900/[0.06] backdrop-blur-xl sm:p-8",
          "ring-1 ring-white/70 transition-[transform,box-shadow,border-color] duration-300 ease-out will-change-transform",
          "dark:border-slate-700/75 dark:bg-slate-900/60 dark:shadow-black/25 dark:ring-white/[0.06]",
          "before:pointer-events-none before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-br before:from-white/90 before:via-transparent before:to-blue-50/35 before:opacity-95 before:transition-opacity before:duration-300 group-hover/form-shell:before:opacity-100 dark:before:from-slate-800/25 dark:before:to-purple-950/25",
          "after:pointer-events-none after:absolute after:inset-px after:rounded-[15px] after:opacity-0 after:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.65)] after:transition-opacity after:duration-300 group-hover/form-shell:after:opacity-100 dark:after:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.06)]",
          "hover:border-slate-300/90 hover:shadow-2xl hover:shadow-slate-900/[0.08] dark:hover:border-slate-600/80 dark:hover:shadow-black/35"
        )}
      >
        <div
          className="auth-form-sheen pointer-events-none absolute -inset-px rounded-2xl opacity-0 blur-sm transition-opacity duration-300 group-hover/form-shell:opacity-100"
          aria-hidden
        />
        <div className="relative z-10">{children}</div>
      </div>
    </div>
  );
}
