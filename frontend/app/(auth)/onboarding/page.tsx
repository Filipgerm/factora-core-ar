"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AuthFormError } from "@/components/features/auth/auth-form-error";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <div className="flex min-h-[80vh] items-center justify-center p-6">
      <Card className="w-full max-w-md border-slate-200 shadow-sm transition-all duration-200">
        <CardHeader>
          <CardTitle className="text-xl tracking-tight">Create your company</CardTitle>
          <CardDescription>
            Set up your organization to use Factora. You need a legal name, VAT number, and
            country code (ISO 3166-1 alpha-2, e.g. GR).
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <CardContent className="space-y-4">
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
                        className="transition-all duration-200"
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
                      <Input {...field} className="transition-all duration-200" />
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
                        className="uppercase transition-all duration-200"
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button
                type="submit"
                disabled={createOrg.isPending}
                className="w-full transition-all duration-200 sm:w-auto"
              >
                {createOrg.isPending ? "Creating…" : "Continue"}
              </Button>
              <p className="text-center text-sm text-slate-600 dark:text-slate-400">
                <Link
                  href="/login"
                  className="font-medium text-slate-900 underline-offset-4 transition-colors duration-200 hover:underline dark:text-slate-100"
                >
                  Back to sign in
                </Link>
              </p>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
