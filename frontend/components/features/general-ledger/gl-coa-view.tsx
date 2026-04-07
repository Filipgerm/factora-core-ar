"use client";

import { useMemo, useState } from "react";
import { Link2, Lock, Pencil, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  useCreateGlAccountMutation,
  useGlAccountsQuery,
  usePatchGlAccountMutation,
} from "@/lib/hooks/api/use-general-ledger";
import type { GlAccount } from "@/lib/schemas/general-ledger";

const accountFormSchema = z.object({
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(255),
  account_type: z.enum([
    "asset",
    "liability",
    "equity",
    "revenue",
    "expense",
  ]),
  normal_balance: z.enum(["debit", "credit"]),
  subledger_kind: z.enum(["none", "ar", "ap"]),
  is_active: z.boolean(),
  is_control_account: z.boolean(),
});

type AccountForm = z.infer<typeof accountFormSchema>;

function accountDepth(
  byId: Record<string, GlAccount | undefined>,
  id: string
): number {
  let d = 0;
  let cur = byId[id];
  while (cur?.parent_account_id) {
    d += 1;
    cur = byId[cur.parent_account_id];
    if (d > 20) break;
  }
  return d;
}

export function GlCoaView() {
  const { data: accounts = [], isLoading } = useGlAccountsQuery();
  const createMut = useCreateGlAccountMutation();
  const patchMut = usePatchGlAccountMutation();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const byId = useMemo(
    () => Object.fromEntries(accounts.map((a) => [a.id, a])),
    [accounts]
  );
  const rows = useMemo(
    () => [...accounts].sort((a, b) => a.code.localeCompare(b.code)),
    [accounts]
  );

  const form = useForm<AccountForm>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      code: "",
      name: "",
      account_type: "expense",
      normal_balance: "debit",
      subledger_kind: "none",
      is_active: true,
      is_control_account: false,
    },
  });

  function openCreate() {
    setEditId(null);
    form.reset({
      code: "",
      name: "",
      account_type: "expense",
      normal_balance: "debit",
      subledger_kind: "none",
      is_active: true,
      is_control_account: false,
    });
    setOpen(true);
  }

  function openEdit(a: GlAccount) {
    setEditId(a.id);
    form.reset({
      code: a.code,
      name: a.name,
      account_type: a.account_type,
      normal_balance: a.normal_balance,
      subledger_kind: a.subledger_kind,
      is_active: a.is_active,
      is_control_account: a.is_control_account,
    });
    setOpen(true);
  }

  async function onSubmit(values: AccountForm) {
    if (editId) {
      await patchMut.mutateAsync({
        id: editId,
        body: {
          name: values.name,
          account_type: values.account_type,
          normal_balance: values.normal_balance,
          subledger_kind: values.subledger_kind,
          is_active: values.is_active,
          is_control_account: values.is_control_account,
        },
      });
    } else {
      await createMut.mutateAsync({
        code: values.code,
        name: values.name,
        account_type: values.account_type,
        normal_balance: values.normal_balance,
        subledger_kind: values.subledger_kind,
        is_active: values.is_active,
        is_control_account: values.is_control_account,
        sort_order: 0,
        parent_account_id: null,
      });
    }
    setOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <Button
            type="button"
            onClick={openCreate}
            className="gap-1.5 transition-all duration-200"
          >
            <Plus className="size-4" aria-hidden />
            New account
          </Button>
          <DialogContent className="max-w-md border-slate-100">
            <DialogHeader>
              <DialogTitle className="text-base">
                {editId ? "Edit account" : "Create account"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-3"
              >
                {!editId && (
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Code</FormLabel>
                        <FormControl>
                          <Input className="h-9" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Name</FormLabel>
                      <FormControl>
                        <Input className="h-9" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="account_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Type</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(
                            [
                              "asset",
                              "liability",
                              "equity",
                              "revenue",
                              "expense",
                            ] as const
                          ).map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="normal_balance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Normal balance</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="debit">Debit</SelectItem>
                          <SelectItem value="credit">Credit</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="subledger_kind"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Subledger</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="ar">AR</SelectItem>
                          <SelectItem value="ap">AP</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex items-center justify-between gap-4">
                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="transition-all duration-200"
                          />
                        </FormControl>
                        <FormLabel className="text-xs font-normal">
                          Active
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="is_control_account"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="transition-all duration-200"
                          />
                        </FormControl>
                        <FormLabel className="text-xs font-normal">
                          Control
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter className="gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                    className="transition-all duration-200"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMut.isPending || patchMut.isPending}
                    className="transition-all duration-200"
                  >
                    Save
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-100">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-100 bg-slate-50/80 hover:bg-slate-50/80">
              <TableHead className="text-xs">Account</TableHead>
              <TableHead className="text-xs">Type</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="w-24 text-right text-xs">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={4} className="text-xs text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                  No accounts. Create one or run demo seed.
                </TableCell>
              </TableRow>
            )}
            {rows.map((a) => {
              const depth = accountDepth(byId, a.id);
              return (
                <TableRow
                  key={a.id}
                  className="border-slate-100 transition-colors duration-200 hover:bg-slate-50/80"
                >
                  <TableCell className="text-xs">
                    <span
                      style={{ paddingLeft: `${Math.min(depth, 6) * 12}px` }}
                      className="inline-flex items-center gap-2"
                    >
                      {a.is_control_account ? (
                        <Lock
                          className="size-3.5 shrink-0 text-purple-600"
                          aria-label="Control account"
                        />
                      ) : (
                        <span className="inline-block w-3.5" />
                      )}
                      <span className="font-medium">{a.code}</span>
                      <span className="text-muted-foreground">{a.name}</span>
                      {a.subledger_kind !== "none" && (
                        <Badge
                          variant="secondary"
                          className="ml-1 text-[10px] uppercase"
                        >
                          <Link2 className="mr-0.5 size-3" aria-hidden />
                          {a.subledger_kind}
                        </Badge>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs capitalize">
                    {a.account_type}
                  </TableCell>
                  <TableCell className="text-xs">
                    {a.is_active ? (
                      <Badge variant="outline" className="text-[10px]">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 transition-all duration-200"
                      onClick={() => openEdit(a)}
                      aria-label="Edit account"
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
