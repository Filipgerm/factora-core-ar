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
      <h1 className="text-3xl font-semibold tracking-tighter text-foreground md:text-4xl">
        {greeting},{" "}
        <span className="bg-gradient-to-r from-[var(--brand-primary)] to-teal-600/90 bg-clip-text text-transparent dark:to-teal-400/90">
          {mockHomeUserFirstName}
        </span>
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed tracking-tight text-muted-foreground">
        Command center for cash, collections, and agent workflows — tuned for
        how European finance teams actually work.
      </p>
    </div>
  );
}
