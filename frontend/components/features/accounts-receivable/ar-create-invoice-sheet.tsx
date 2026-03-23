"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { isApiError } from "@/lib/api/types";
import { useCreateManualInvoiceMutation } from "@/lib/hooks/api/use-invoices";
import {
  manualInvoiceCreateFromSheet,
  manualInvoiceSheetFormSchema,
  type ManualInvoiceSheetFormValues,
} from "@/lib/schemas/invoices";

type ArCreateInvoiceSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ArCreateInvoiceSheet({
  open,
  onOpenChange,
}: ArCreateInvoiceSheetProps) {
  const { toast } = useToast();
  const createMut = useCreateManualInvoiceMutation();

  const form = useForm<ManualInvoiceSheetFormValues>({
    resolver: zodResolver(manualInvoiceSheetFormSchema),
    defaultValues: {
      customer_name: "",
      amount: "",
      issue_date: format(new Date(), "yyyy-MM-dd"),
      currency: "EUR",
    },
  });

  function resetDefaults() {
    form.reset({
      customer_name: "",
      amount: "",
      issue_date: format(new Date(), "yyyy-MM-dd"),
      currency: "EUR",
    });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) resetDefaults();
        onOpenChange(next);
      }}
    >
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-slate-200 bg-background sm:max-w-md dark:border-slate-800"
      >
        <SheetHeader className="space-y-1 border-b border-slate-200 px-1 pb-4 text-left dark:border-slate-800">
          <SheetTitle className="text-lg font-semibold tracking-tight">
            New invoice
          </SheetTitle>
          <SheetDescription className="text-xs leading-relaxed text-muted-foreground">
            Creates a manual draft for your organization. myDATA transmission is not
            included yet — this row appears in your AR list as a manual entry.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            className="mt-6 flex flex-1 flex-col gap-5 px-1"
            onSubmit={form.handleSubmit((values) => {
              const body = manualInvoiceCreateFromSheet(values);
              createMut.mutate(body, {
                onSuccess: () => {
                  toast({
                    title: "Invoice saved",
                    description: `${body.customer_name} · ${body.amount} ${body.currency}`,
                  });
                  resetDefaults();
                  onOpenChange(false);
                },
                onError: (e) =>
                  toast({
                    variant: "destructive",
                    title: "Could not save invoice",
                    description: isApiError(e) ? e.message : "Something went wrong",
                  }),
              });
            })}
          >
            <FormField
              control={form.control}
              name="customer_name"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Customer name
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      autoComplete="organization"
                      className="h-10 rounded-lg"
                      placeholder="Acme IKE"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Amount (EUR)
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        inputMode="decimal"
                        className="h-10 rounded-lg font-mono tabular-nums"
                        placeholder="1200.00"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="issue_date"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Issue date
                    </FormLabel>
                    <FormControl>
                      <Input {...field} type="date" className="h-10 rounded-lg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="mt-auto flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                className="rounded-lg transition-all duration-200"
                onClick={() => {
                  resetDefaults();
                  onOpenChange(false);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-lg bg-[var(--brand-primary)] text-white transition-all duration-200 hover:bg-[var(--brand-primary)]/90"
                disabled={createMut.isPending}
              >
                {createMut.isPending ? "Saving…" : "Save invoice"}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
