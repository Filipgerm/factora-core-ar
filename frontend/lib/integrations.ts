"use client";

import * as React from "react";

export type IntegrationType = "erp" | "bank" | "payment" | "platform" | "tbd";

export interface IntegrationRecord {
  type: IntegrationType;
  id: string;
  name?: string;
  connectedAt: number;
}

const STORAGE_KEY = "factora-integrations";

function read(): IntegrationRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(list: IntegrationRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function getIntegrations(): IntegrationRecord[] {
  return read();
}

export function addIntegration(
  type: IntegrationType,
  id: string,
  name?: string
) {
  const list = read();
  const exists = list.some((x) => x.id === id);
  if (!exists) {
    list.push({ type, id, name, connectedAt: Date.now() });
    write(list);
  }
}

export function clearIntegration(id: string) {
  const list = read().filter((x) => x.id !== id);
  write(list);
}

// Public setters to control the full list
export function setIntegrations(list: IntegrationRecord[]) {
  write(list);
}

export function clearAllIntegrations() {
  write([]);
}

// Demo seed used when entering from sign-in
export function getDemoSeed(): IntegrationRecord[] {
  const now = Date.now();
  return [
    { type: "erp", id: "mydata", name: "myDATA", connectedAt: now },
    { type: "erp", id: "erp:entersoftone", name: "ENTERSOFTONE", connectedAt: now + 12000 },
    {
      type: "bank",
      id: "bank:piraeus-bank",
      name: "Piraeus Bank",
      connectedAt: now + 24000,
    },
  ];
}

export function hasType(type: IntegrationType): boolean {
  return read().some((x) => x.type === type);
}

export function hasERP(): boolean {
  return hasType("erp");
}

export function hasBank(): boolean {
  return hasType("bank");
}

export function hasPlatform(): boolean {
  return hasType("platform");
}

export function hasTBD(): boolean {
  return hasType("tbd");
}

export function useConnectionGates() {
  const { items, add } = useIntegrations();
  const erp = items.some((x) => x.type === "erp");
  const bank = items.some((x) => x.type === "bank");
  const platform = items.some((x) => x.type === "platform");
  const tbd = items.some((x) => x.type === "tbd");
  return { hasERP: erp, hasBank: bank, hasPlatform: platform, hasTBD: tbd, items, add };
}

export function useIntegrations() {
  const [items, setItems] = React.useState<IntegrationRecord[]>([]);

  React.useEffect(() => {
    setItems(read());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setItems(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const refresh = React.useCallback(() => setItems(read()), []);

  const add = React.useCallback(
    (type: IntegrationType, id: string, name?: string) => {
      addIntegration(type, id, name);
      refresh();
    },
    [refresh]
  );

  return { items, add };
}
