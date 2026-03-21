"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { BarChart3, FileText, Search, Upload } from "lucide-react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

const NAV = [
  {
    id: "inc",
    label: "Go to Income Statement",
    href: "/reporting/income-statement",
    icon: BarChart3,
  },
  {
    id: "inv",
    label: "Search Invoices",
    href: "/accounts-receivable/invoices",
    icon: Search,
  },
  {
    id: "up",
    label: "Upload Document",
    href: "/reporting",
    icon: Upload,
  },
  {
    id: "led",
    label: "Smart Ledger",
    href: "/ledger",
    icon: FileText,
  },
] as const;

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const run = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="gap-0 overflow-hidden p-0 sm:max-w-lg"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <DialogDescription className="sr-only">
          Search navigation and quick actions. Press Escape to close.
        </DialogDescription>
        <Command className="rounded-none border-0 shadow-none">
          <CommandInput placeholder="Search or jump to…" />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup heading="Quick navigation">
              {NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.id}
                    value={`${item.label} ${item.href}`}
                    onSelect={() => run(item.href)}
                  >
                    <Icon className="size-4 shrink-0 opacity-70" aria-hidden />
                    {item.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
