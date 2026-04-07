"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AuthFormError } from "@/components/features/auth/auth-form-error";
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
import { useToast } from "@/hooks/use-toast";
import { useCreateOrganizationMutation } from "@/lib/hooks/api/use-organizations";
import { isApiError } from "@/lib/api/types";
import {
  organizationSetupRequestSchema,
  type OrganizationSetupRequest,
} from "@/lib/schemas/organization";
import { useForm } from "react-hook-form";

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const createOrg = useCreateOrganizationMutation();

  const form = useForm<OrganizationSetupRequest>({
    resolver: zodResolver(organizationSetupRequestSchema),
    defaultValues: {
      name: "",
      vat_number: "",
      country: "",
    },
  });

  async function onSubmit(values: OrganizationSetupRequest) {
    try {
      await createOrg.mutateAsync(values);
      toast({ title: "Company created" });
      router.replace("/home");
      router.refresh();
    } catch (err) {
      const message = isApiError(err)
        ? err.message
        : "Could not create your company. Try again.";
      form.setError("root", { message });
    }
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2 text-center sm:text-left">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          Organization
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          Create your company
        </h2>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Legal name, VAT number, and country code (ISO 3166-1 alpha-2, e.g. GR).
        </p>
      </header>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {form.formState.errors.root ? (
            <AuthFormError
              title="Something went wrong"
              description={form.formState.errors.root.message ?? ""}
            />
          ) : null}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    autoComplete="organization"
                    className="h-11 border-slate-200/90 bg-white/80 transition-all duration-200 focus-visible:ring-[var(--brand-primary)]/30 dark:border-slate-700 dark:bg-slate-950/40"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="vat_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>VAT number</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className="h-11 border-slate-200/90 bg-white/80 transition-all duration-200 focus-visible:ring-[var(--brand-primary)]/30 dark:border-slate-700 dark:bg-slate-950/40"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country code</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="GR"
                    maxLength={2}
                    className="h-11 border-slate-200/90 bg-white/80 uppercase transition-all duration-200 focus-visible:ring-[var(--brand-primary)]/30 dark:border-slate-700 dark:bg-slate-950/40"
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex flex-col gap-3 pt-1">
            <Button
              type="submit"
              disabled={createOrg.isPending}
              size="lg"
              className="h-11 w-full rounded-xl bg-[var(--brand-primary)] text-white shadow-md transition-all duration-200 hover:bg-[var(--brand-primary)]/90"
            >
              {createOrg.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span
                    className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                    aria-hidden
                  />
                  Creating…
                </span>
              ) : (
                "Continue"
              )}
            </Button>
            <p className="text-center text-sm text-slate-600 dark:text-slate-400">
              <Link
                href="/login"
                className="font-semibold text-primary underline-offset-4 transition-colors duration-200 hover:underline hover:text-primary/90"
              >
                Back to sign in
              </Link>
            </p>
          </div>
        </form>
      </Form>
    </div>
  );
}
