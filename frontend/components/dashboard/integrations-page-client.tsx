"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Blocks, Building2, Layers, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const SNAP_SPRING = { type: "spring" as const, stiffness: 640, damping: 44 };

type TileCategory = "integration" | "bank";

type Accent =
  | "teal"
  | "violet"
  | "orange"
  | "sky"
  | "emerald"
  | "green"
  | "rose"
  | "amber"
  | "slate"
  | "indigo";

interface Tile {
  id: string;
  name: string;
  category: TileCategory;
  subcategory: string;
  logo?: {
    src: string;
    shape: "mark" | "wordmark";
  };
  accent: Accent;
}

const INTEGRATION_TILES: ReadonlyArray<Tile> = [
  {
    id: "stripe",
    name: "Stripe",
    category: "integration",
    subcategory: "Payments",
    logo: {
      src: "/images/integrations/Stripe_Logo,_revised_2016.svg",
      shape: "wordmark",
    },
    accent: "violet",
  },
  {
    id: "hubspot",
    name: "Hubspot",
    category: "integration",
    subcategory: "CRM",
    logo: {
      src: "/images/integrations/HubSpot_Logo.svg",
      shape: "wordmark",
    },
    accent: "orange",
  },
  {
    id: "salesforce",
    name: "Salesforce",
    category: "integration",
    subcategory: "CRM",
    logo: {
      src: "/images/integrations/Salesforce.com_logo.svg",
      shape: "wordmark",
    },
    accent: "sky",
  },
  {
    id: "google-sheets",
    name: "Google Sheets",
    category: "integration",
    subcategory: "Spreadsheets",
    logo: {
      src: "/images/integrations/Google_Sheets_logo_(2014-2020).svg",
      shape: "wordmark",
    },
    accent: "emerald",
  },
  {
    id: "excel",
    name: "Excel",
    category: "integration",
    subcategory: "Spreadsheets",
    logo: {
      src: "/images/integrations/Microsoft_Office_Excel_(2019–2025).svg",
      shape: "wordmark",
    },
    accent: "green",
  },
  {
    id: "gmail",
    name: "Gmail",
    category: "integration",
    subcategory: "Mail",
    logo: {
      src: "/images/integrations/Gmail_icon_(2020).svg",
      shape: "wordmark",
    },
    accent: "rose",
  },
  {
    id: "snowflake",
    name: "Snowflake",
    category: "integration",
    subcategory: "Data warehouse",
    logo: {
      src: "/images/integrations/Snowflake_Logo.svg",
      shape: "wordmark",
    },
    accent: "sky",
  },
  {
    id: "redshift",
    name: "Amazon Redshift",
    category: "integration",
    subcategory: "Data warehouse",
    logo: {
      src: "/images/integrations/Amazon-Redshift-Logo.svg",
      shape: "wordmark",
    },
    accent: "amber",
  },
];

const BANK_TILES: ReadonlyArray<Tile> = [
  {
    id: "alpha",
    name: "Alpha Bank",
    category: "bank",
    subcategory: "Banking",
    logo: { src: "/images/banks/alpha-bank.jpg", shape: "mark" },
    accent: "rose",
  },
  {
    id: "attica",
    name: "Attica Bank",
    category: "bank",
    subcategory: "Banking",
    logo: { src: "/images/banks/attica-bank.png", shape: "mark" },
    accent: "sky",
  },
  {
    id: "bnp-paribas",
    name: "BNP Paribas",
    category: "bank",
    subcategory: "Banking",
    logo: { src: "/images/banks/bnp-paribas.png", shape: "mark" },
    accent: "emerald",
  },
  {
    id: "credia",
    name: "Credia Bank",
    category: "bank",
    subcategory: "Banking",
    logo: { src: "/images/banks/credia-bank.png", shape: "mark" },
    accent: "amber",
  },
  {
    id: "deutsche",
    name: "Deutsche Bank",
    category: "bank",
    subcategory: "Banking",
    logo: { src: "/images/banks/deutsche-bank.png", shape: "mark" },
    accent: "slate",
  },
  {
    id: "eurobank",
    name: "Eurobank",
    category: "bank",
    subcategory: "Banking",
    logo: { src: "/images/banks/euro-bank.png", shape: "mark" },
    accent: "violet",
  },
  {
    id: "ing",
    name: "ING",
    category: "bank",
    subcategory: "Banking",
    logo: { src: "/images/banks/ing-bank.png", shape: "mark" },
    accent: "orange",
  },
  {
    id: "nbg",
    name: "National Bank of Greece",
    category: "bank",
    subcategory: "Banking",
    logo: { src: "/images/banks/nbg-bank.png", shape: "mark" },
    accent: "sky",
  },
  {
    id: "optima",
    name: "Optima Bank",
    category: "bank",
    subcategory: "Banking",
    logo: { src: "/images/banks/optima-bank.jpg", shape: "mark" },
    accent: "teal",
  },
  {
    id: "piraeus",
    name: "Piraeus Bank",
    category: "bank",
    subcategory: "Banking",
    logo: { src: "/images/banks/piraeus-bank.png", shape: "mark" },
    accent: "emerald",
  },
  {
    id: "revolut",
    name: "Revolut",
    category: "bank",
    subcategory: "Banking",
    logo: { src: "/images/banks/revolut-bank.svg", shape: "wordmark" },
    accent: "slate",
  },
  {
    id: "santander",
    name: "Santander",
    category: "bank",
    subcategory: "Banking",
    logo: { src: "/images/banks/santander-bank.png", shape: "mark" },
    accent: "rose",
  },
  {
    id: "triodos",
    name: "Triodos Bank",
    category: "bank",
    subcategory: "Banking",
    logo: { src: "/images/banks/triodos-bank.png", shape: "mark" },
    accent: "green",
  },
  {
    id: "viva",
    name: "Viva",
    category: "bank",
    subcategory: "Banking",
    logo: { src: "/images/banks/viva-bank.png", shape: "mark" },
    accent: "amber",
  },
  {
    id: "wise",
    name: "Wise",
    category: "bank",
    subcategory: "Banking",
    logo: { src: "/images/banks/wise-bank.svg", shape: "wordmark" },
    accent: "emerald",
  },
];

const ACCENT_CLASSES: Record<Accent, { text: string; glow: string }> = {
  teal: {
    text: "text-[color:var(--brand-primary)]",
    glow: "group-hover:shadow-[0_12px_32px_-16px_rgba(47,154,138,0.35)]",
  },
  violet: {
    text: "text-violet-700",
    glow: "group-hover:shadow-[0_12px_32px_-16px_rgba(139,92,246,0.35)]",
  },
  orange: {
    text: "text-orange-700",
    glow: "group-hover:shadow-[0_12px_32px_-16px_rgba(249,115,22,0.3)]",
  },
  sky: {
    text: "text-sky-700",
    glow: "group-hover:shadow-[0_12px_32px_-16px_rgba(14,165,233,0.3)]",
  },
  emerald: {
    text: "text-emerald-700",
    glow: "group-hover:shadow-[0_12px_32px_-16px_rgba(16,185,129,0.3)]",
  },
  green: {
    text: "text-green-700",
    glow: "group-hover:shadow-[0_12px_32px_-16px_rgba(34,197,94,0.3)]",
  },
  rose: {
    text: "text-rose-700",
    glow: "group-hover:shadow-[0_12px_32px_-16px_rgba(244,63,94,0.3)]",
  },
  amber: {
    text: "text-amber-700",
    glow: "group-hover:shadow-[0_12px_32px_-16px_rgba(245,158,11,0.3)]",
  },
  slate: {
    text: "text-slate-700",
    glow: "group-hover:shadow-[0_12px_32px_-16px_rgba(15,23,42,0.2)]",
  },
  indigo: {
    text: "text-indigo-700",
    glow: "group-hover:shadow-[0_12px_32px_-16px_rgba(99,102,241,0.3)]",
  },
};

type CategoryFilter = "all" | "integration" | "bank";

interface TileLogoProps {
  name: string;
  accent: Accent;
  logo: Tile["logo"];
}

function TileLogo({ name, accent, logo }: TileLogoProps) {
  const [errored, setErrored] = useState(false);
  const classes = ACCENT_CLASSES[accent];
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (!logo || errored) {
    return (
      <div
        className="flex h-20 w-full items-center justify-start"
        aria-hidden
      >
        <span
          className={cn("text-3xl font-bold tracking-tight", classes.text)}
        >
          {initials}
        </span>
      </div>
    );
  }

  const isWordmark = logo.shape === "wordmark";
  return (
    <div className="flex h-20 w-full items-center justify-start" aria-hidden>
      <Image
        src={logo.src}
        alt={`${name} logo`}
        width={isWordmark ? 220 : 80}
        height={80}
        className={cn(
          "h-auto w-auto object-contain object-left",
          isWordmark ? "max-h-14 max-w-[220px]" : "max-h-16 max-w-[160px]"
        )}
        onError={() => setErrored(true)}
        unoptimized
      />
    </div>
  );
}

function TileCard({ tile, delay }: { tile: Tile; delay: number }) {
  const classes = ACCENT_CLASSES[tile.accent];
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SNAP_SPRING, delay }}
      className={cn(
        "group flex h-[200px] cursor-default flex-col items-start justify-between gap-4 rounded-2xl border border-slate-100 bg-white px-6 py-6 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-[1px] hover:border-slate-200",
        classes.glow
      )}
    >
      <TileLogo name={tile.name} accent={tile.accent} logo={tile.logo} />
      <div className="min-w-0 space-y-0.5">
        <div className="truncate text-[15px] font-semibold tracking-tight text-slate-900">
          {tile.name}
        </div>
        <div className="text-[11px] tracking-tight text-muted-foreground">
          {tile.subcategory}
        </div>
      </div>
    </motion.button>
  );
}

function SectionHeader({
  icon,
  label,
  count,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span
        className="flex size-6 items-center justify-center rounded-md bg-[var(--brand-primary-subtle)] text-[color:var(--brand-primary)] ring-1 ring-inset ring-teal-200/60"
        aria-hidden
      >
        {icon}
      </span>
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700">
        {label}
      </h2>
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold tabular-nums tracking-tight text-slate-600">
        {count}
      </span>
    </div>
  );
}

export function IntegrationsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const q = searchParams.get("q")?.toLowerCase() ?? "";
  const category = (searchParams.get("category") ?? "all") as CategoryFilter;

  const [queryInput, setQueryInput] = useState(q);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const matchesCategory = (t: Tile) =>
      category === "all" ? true : t.category === category;
    const matchesQuery = (t: Tile) =>
      !needle ||
      t.name.toLowerCase().includes(needle) ||
      t.subcategory.toLowerCase().includes(needle);

    return {
      integrations: INTEGRATION_TILES.filter(
        (t) => matchesCategory(t) && matchesQuery(t)
      ),
      banks: BANK_TILES.filter((t) => matchesCategory(t) && matchesQuery(t)),
    };
  }, [q, category]);

  const pushParam = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    const s = next.toString();
    router.replace(s ? `?${s}` : "?", { scroll: false });
  };

  const handleSearchSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    pushParam({ q: queryInput.trim() || null });
  };

  const showIntegrations = filtered.integrations.length > 0;
  const showBanks = filtered.banks.length > 0;
  const nothingFound = !showIntegrations && !showBanks;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 p-4 md:p-6">
      <header className="flex flex-col gap-1 border-b border-slate-100 pb-5">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          Integrations
        </h1>
        <p className="text-xs text-muted-foreground">
          Connect Factora to the accounting, banking, and data tools your team
          already uses.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
        <aside className="lg:col-span-3">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SNAP_SPRING, delay: 0.04 }}
            className="sticky top-4 flex flex-col gap-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-14px_rgba(15,23,42,0.08)]"
          >
            <form onSubmit={handleSearchSubmit} className="space-y-2">
              <Label
                htmlFor="integrations-search"
                className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600"
              >
                Search
              </Label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400"
                  aria-hidden
                />
                <Input
                  id="integrations-search"
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  onBlur={() => pushParam({ q: queryInput.trim() || null })}
                  placeholder="Type"
                  className="h-9 rounded-lg border-slate-200 bg-white pl-8 text-xs"
                />
              </div>
            </form>

            <div className="space-y-2">
              <Label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                Filter by category
              </Label>
              <Select
                value={category}
                onValueChange={(v) =>
                  pushParam({ category: v === "all" ? null : v })
                }
              >
                <SelectTrigger className="h-9 rounded-lg border-slate-200 bg-white text-xs">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  <SelectItem value="integration">Integrations</SelectItem>
                  <SelectItem value="bank">Banks</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 opacity-60">
              <Label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                Filter by segment
              </Label>
              <Select disabled>
                <SelectTrigger className="h-9 rounded-lg border-slate-200 bg-white text-xs">
                  <SelectValue placeholder="Please select" />
                </SelectTrigger>
                <SelectContent />
              </Select>
            </div>

            <div className="space-y-2 opacity-60">
              <Label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                Filter by use case
              </Label>
              <Select disabled>
                <SelectTrigger className="h-9 rounded-lg border-slate-200 bg-white text-xs">
                  <SelectValue placeholder="Please select" />
                </SelectTrigger>
                <SelectContent />
              </Select>
            </div>
          </motion.div>
        </aside>

        <main className="space-y-8 lg:col-span-9">
          {showIntegrations ? (
            <section>
              <SectionHeader
                icon={<Blocks className="size-3.5" aria-hidden />}
                label="Integrations"
                count={filtered.integrations.length}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.integrations.map((tile, i) => (
                  <TileCard
                    key={tile.id}
                    tile={tile}
                    delay={0.06 + i * 0.03}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {showBanks ? (
            <section>
              <SectionHeader
                icon={<Building2 className="size-3.5" aria-hidden />}
                label="Banks"
                count={filtered.banks.length}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.banks.map((tile, i) => (
                  <TileCard
                    key={tile.id}
                    tile={tile}
                    delay={0.06 + i * 0.03}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {nothingFound ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
              <Layers className="size-8 text-slate-300" aria-hidden />
              <p className="text-sm font-medium text-slate-700">
                No integrations match “{q}”
              </p>
              <p className="max-w-sm text-xs text-muted-foreground">
                Try a different keyword or reset the category filter.
              </p>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
