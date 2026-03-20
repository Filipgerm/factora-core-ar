"use client";

import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";

import type { HomeKpiFormatKey } from "@/lib/mock-data/dashboard-mocks";
import { cn } from "@/lib/utils";

import { formatKpiAnimatedValue } from "./format-kpi-value";

interface AnimatedMetricValueProps {
  target: number;
  formatKey: HomeKpiFormatKey;
  className?: string;
}

export function AnimatedMetricValue({
  target,
  formatKey,
  className,
}: AnimatedMetricValueProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "0px 0px -15% 0px" });
  const mv = useMotionValue(0);
  const [text, setText] = useState(() =>
    formatKpiAnimatedValue(0, formatKey)
  );

  useMotionValueEvent(mv, "change", (v) => {
    setText(formatKpiAnimatedValue(v, formatKey));
  });

  useEffect(() => {
    if (!isInView) return;
    const c = animate(mv, target, {
      duration: 0.88,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => c.stop();
  }, [isInView, target, mv]);

  return (
    <span
      ref={ref}
      className={cn("inline-block tabular-nums tracking-tight", className)}
    >
      <motion.span
        initial={{ opacity: 0.65 }}
        animate={{ opacity: 1 }}
        transition={{
          type: "spring",
          stiffness: 720,
          damping: 48,
        }}
      >
        {text}
      </motion.span>
    </span>
  );
}
