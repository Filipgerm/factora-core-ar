"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { motion } from "framer-motion";

import { mockHomeUserFirstName } from "@/lib/mock-data/dashboard-mocks";

const SNAP_SPRING = { type: "spring" as const, stiffness: 520, damping: 40 };

function formatNow(d: Date) {
  return format(d, "MMM d, yyyy, h:mm a");
}

export function HomeDashboardGreeting() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SNAP_SPRING}
      className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between"
    >
      <h1 className="text-sm font-medium tracking-tight text-muted-foreground">
        Hi, {mockHomeUserFirstName}
      </h1>
      <p
        className="font-mono text-xs tabular-nums tracking-tight text-muted-foreground/90 sm:text-right"
        suppressHydrationWarning
      >
        {formatNow(now)}
      </p>
    </motion.div>
  );
}
