"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { isApiError } from "@/lib/api/types";
import {
  useCreateCounterpartyMutation,
} from "@/lib/hooks/api/use-organization";
import { useGemiSearchByAfmMutation } from "@/lib/hooks/api/use-gemi";
import type { GemiSearchItem } from "@/lib/schemas/gemi";

const counterpartyVatFormSchema = z.object({
  vat_number: z.string().min(3, "Enter VAT / AFM (min. 3 digits)"),
  name: z.string().min(1, "Legal name is required").max(255),
  country: z.string().length(2).default("GR"),
  address_street: z.string().max(255).optional().default(""),
  address_city: z.string().max(100).optional().default(""),
  address_postal_code: z.string().max(20).optional().default(""),
  address_region: z.string().max(100).optional().default(""),
});

export type CounterpartyVatFormValues = z.infer<typeof counterpartyVatFormSchema>;

function applyGemiItemToForm(
  item: GemiSearchItem
): Partial<CounterpartyVatFormValues> {
  const street = [item.street, item.street_number].filter(Boolean).join(" ").trim();
  return {
    vat_number: item.afm ?? "",
    name: item.company_name ?? "",
    country: "GR",
    address_street: street || "",
    address_city: item.city ?? "",
    address_postal_code: item.zip_code ?? "",
    address_region: item.municipality ?? item.gemi_office ?? "",
  };
}

export type CounterpartyVatDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Counterparty type for ``POST /v1/organization/counterparties``. */
  counterpartyType: "customer" | "vendor";
  title: string;
  description?: string;
};

export function CounterpartyVatDialog({
  open,
  onOpenChange,
  counterpartyType,
  title,
  description = "Look up a Greek VAT (AFM) via GEMI, review the fields, then save.",
}: CounterpartyVatDialogProps) {
  const { toast } = useToast();
  const gemiLookup = useGemiSearchByAfmMutation();
  const createCp = useCreateCounterpartyMutation();

  const form = useForm<CounterpartyVatFormValues>({
    resolver: zodResolver(counterpartyVatFormSchema),
    defaultValues: {
      vat_number: "",
      name: "",
      country: "GR",
      address_street: "",
      address_city: "",
      address_postal_code: "",
      address_region: "",
    },
  });

  function resetForm() {
    form.reset({
      vat_number: "",
      name: "",
      country: "GR",
      address_street: "",
      address_city: "",
      address_postal_code: "",
      address_region: "",
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetForm();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[min(90vh,640px)] overflow-y-auto border-slate-200 sm:max-w-lg dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            {description}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((values) => {
              const vat = values.vat_number.replace(/\s/g, "");
              createCp.mutate(
                {
                  name: values.name.trim(),
                  vat_number: vat.length ? vat : null,
                  country: values.country || "GR",
                  address_street: values.address_street?.trim() || null,
                  address_city: values.address_city?.trim() || null,
                  address_postal_code: values.address_postal_code?.trim() || null,
                  address_region: values.address_region?.trim() || null,
                  type: counterpartyType,
                },
                {
                  onSuccess: () => {
                    toast({
                      title:
                        counterpartyType === "customer"
                          ? "Customer created"
                          : "Vendor created",
                      description: values.name,
                    });
                    resetForm();
                    onOpenChange(false);
                  },
                  onError: (e) =>
                    toast({
                      variant: "destructive",
                      title: "Could not save",
                      description: isApiError(e) ? e.message : "Error",
                    }),
                }
              );
            })}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <FormField
                control={form.control}
                name="vat_number"
                render={({ field }) => (
                  <FormItem className="flex-1 space-y-2">
                    <FormLabel className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      VAT / AFM
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="h-10 rounded-lg font-mono text-sm tabular-nums"
                        placeholder="998888888"
                        autoComplete="off"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="secondary"
                className="h-10 shrink-0 rounded-lg transition-all duration-200"
                disabled={gemiLookup.isPending}
                onClick={() => {
                  const raw = form.getValues("vat_number");
                  gemiLookup.mutate(raw, {
                    onSuccess: (res) => {
                      if (!res.items.length) {
                        toast({
                          variant: "destructive",
                          title: "No company found",
                          description: "Try a different AFM or check GEMI availability.",
                        });
                        return;
                      }
                      const digits = raw.replace(/\D/g, "");
                      const exact =
                        res.items.find((i) => i.afm.replace(/\D/g, "") === digits) ??
                        res.items[0];
                      form.reset({
                        ...form.getValues(),
                        ...applyGemiItemToForm(exact),
                      });
                      toast({
                        title: "Registry data loaded",
                        description: exact.company_name,
                      });
                    },
                    onError: (e) =>
                      toast({
                        variant: "destructive",
                        title: "Lookup failed",
                        description:
                          e instanceof Error ? e.message : "Could not reach GEMI search",
                      }),
                  });
                }}
              >
                {gemiLookup.isPending ? "Searching…" : "Lookup"}
              </Button>
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Legal name
                  </FormLabel>
                  <FormControl>
                    <Input {...field} className="h-10 rounded-lg" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="address_street"
                render={({ field }) => (
                  <FormItem className="space-y-2 sm:col-span-2">
                    <FormLabel className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Street
                    </FormLabel>
                    <FormControl>
                      <Input {...field} className="h-10 rounded-lg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address_city"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      City
                    </FormLabel>
                    <FormControl>
                      <Input {...field} className="h-10 rounded-lg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address_postal_code"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Postal code
                    </FormLabel>
                    <FormControl>
                      <Input {...field} className="h-10 rounded-lg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address_region"
                render={({ field }) => (
                  <FormItem className="space-y-2 sm:col-span-2">
                    <FormLabel className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Region / office
                    </FormLabel>
                    <FormControl>
                      <Input {...field} className="h-10 rounded-lg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Country (ISO-2)
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="h-10 rounded-lg font-mono uppercase"
                        maxLength={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="gap-2 border-t border-slate-200 pt-4 dark:border-slate-800 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="rounded-lg transition-all duration-200"
                onClick={() => {
                  resetForm();
                  onOpenChange(false);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-lg bg-[var(--brand-primary)] text-white transition-all duration-200 hover:bg-[var(--brand-primary)]/90"
                disabled={createCp.isPending}
              >
                {createCp.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
