"use client";

import { useEffect, useState } from "react";

import { mockHomeUserFirstName } from "@/lib/mock-data/dashboard-mocks";

function greetingForHour(hour: number): string {
  if (hour < 5) return "Good evening";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function GreetingHeader() {
  const [greeting, setGreeting] = useState("Welcome");

  useEffect(() => {
    setGreeting(greetingForHour(new Date().getHours()));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
        {greeting},{" "}
        <span className="text-[var(--brand-primary)]">{mockHomeUserFirstName}</span>
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Your agentic command center — prioritized actions, cash health, and what
        changed since you last looked.
      </p>
    </div>
  );
}
