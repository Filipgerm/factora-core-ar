"use client";

import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { downloadStoredFile } from "@/lib/api/files";
import { isApiError } from "@/lib/api/types";
import { useGemiFetchDocumentsMutation, useGemiSearchQuery } from "@/lib/hooks/api/use-gemi";
import type { SaltEdgeConnection } from "@/lib/schemas/saltedge/connections";
import type { SaltEdgeCustomer } from "@/lib/schemas/saltedge/customers";
import {
  useSaltEdgeConnectionsQuery,
  useSaltEdgeCustomersQuery,
  useSaltEdgeRefreshMutation,
  useResolvedSaltEdgeCustomerId,
} from "@/lib/hooks/api/use-saltedge";

export function IntegrationsPageClient() {
  const { toast } = useToast();
  const { customerId, ambiguous, source } = useResolvedSaltEdgeCustomerId();
  const customers = useSaltEdgeCustomersQuery();
  const connections = useSaltEdgeConnectionsQuery(customerId);
  const refreshConn = useSaltEdgeRefreshMutation();

  const [gemiQ, setGemiQ] = useState("");
  const gemiSearch = useGemiSearchQuery(gemiQ.replace(/\D/g, ""), "afm");
  const gemiFetch = useGemiFetchDocumentsMutation();

  const [fileName, setFileName] = useState("");

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-sm transition-all duration-200">
        <CardHeader>
          <CardTitle>SaltEdge banking</CardTitle>
          <CardDescription>
            Connections for the resolved SaltEdge customer id
            {source ? ` (source: ${source})` : ""}.
            {ambiguous ? (
              <span className="mt-1 block text-amber-700 dark:text-amber-400">
                Multiple customers returned — set{" "}
                <code className="text-xs">NEXT_PUBLIC_SALTEDGE_CUSTOMER_ID</code>{" "}
                to disambiguate.
              </span>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {customers.isLoading ? (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Loading SaltEdge customers…
            </p>
          ) : customers.isError ? (
            <p className="text-destructive">
              {isApiError(customers.error)
                ? customers.error.message
                : "Failed to load customers"}
            </p>
          ) : (
            <div>
              <p className="font-medium text-foreground">Customers</p>
              <ul className="mt-2 list-inside list-disc text-muted-foreground">
                {(customers.data?.data ?? []).map((c: SaltEdgeCustomer, i: number) => (
                  <li
                    key={
                      c.customer_id ??
                      c.identifier ??
                      `customer-row-${i}`
                    }
                  >
                    {c.customer_id ?? "—"} {c.identifier ? `(${c.identifier})` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!customerId ? (
            <p className="text-muted-foreground">
              No SaltEdge customer id available — complete org setup and create a
              SaltEdge customer, or set{" "}
              <code className="text-xs">NEXT_PUBLIC_SALTEDGE_CUSTOMER_ID</code>.
            </p>
          ) : connections.isLoading ? (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Loading connections…
            </p>
          ) : connections.isError ? (
            <p className="text-destructive">
              {isApiError(connections.error)
                ? connections.error.message
                : "Failed to load connections"}
            </p>
          ) : (
            <div className="space-y-3">
              <p className="font-medium text-foreground">Connections</p>
              <ul className="space-y-2">
                {(connections.data?.data ?? []).map((conn: SaltEdgeConnection) => (
                  <li
                    key={conn.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/30"
                  >
                    <div>
                      <p className="font-medium">{conn.provider_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {conn.status} · {conn.id}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={refreshConn.isPending}
                      onClick={() =>
                        refreshConn.mutate(conn.id, {
                          onSuccess: () =>
                            toast({ title: "Refresh started", description: conn.id }),
                          onError: (e) =>
                            toast({
                              title: "Refresh failed",
                              description: isApiError(e) ? e.message : "Error",
                              variant: "destructive",
                            }),
                        })
                      }
                    >
                      {refreshConn.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <RefreshCw className="size-4" />
                      )}
                      <span className="sr-only">Refresh connection</span>
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm transition-all duration-200">
        <CardHeader>
          <CardTitle>GEMI lookup</CardTitle>
          <CardDescription>
            Live company search (AFM mode, ≥3 digits). Document fetch calls the
            backend storage pipeline.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gemi-q">AFM / digits</Label>
            <Input
              id="gemi-q"
              value={gemiQ}
              onChange={(e) => setGemiQ(e.target.value)}
              placeholder="e.g. 998888888"
            />
          </div>
          {gemiSearch.isFetching ? (
            <p className="text-sm text-muted-foreground">Searching…</p>
          ) : gemiSearch.data?.items.length ? (
            <ul className="space-y-2 text-sm">
              {gemiSearch.data.items.map((item) => (
                <li
                  key={`${item.afm}-${item.ar_gemi}`}
                  className="rounded-md border border-slate-100 p-2"
                >
                  <p className="font-medium">{item.company_name}</p>
                  <p className="text-xs text-muted-foreground">
                    AFM {item.afm} · GEMI {item.ar_gemi}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="mt-2"
                    disabled={gemiFetch.isPending || !item.afm}
                    onClick={() =>
                      gemiFetch.mutate(item.afm, {
                        onSuccess: (r) =>
                          toast({ title: r.message, description: r.company }),
                        onError: (e) =>
                          toast({
                            title: "GEMI fetch failed",
                            description: isApiError(e) ? e.message : "Error",
                            variant: "destructive",
                          }),
                      })
                    }
                  >
                    Fetch documents
                  </Button>
                </li>
              ))}
            </ul>
          ) : gemiSearch.isSuccess ? (
            <p className="text-sm text-muted-foreground">No matches.</p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm transition-all duration-200">
        <CardHeader>
          <CardTitle>myDATA</CardTitle>
          <CardDescription>
            {/* TODO: Phase 2 Backend/UI — expose AADE mark & date range in a guided form; hook is useMydataDocsQuery({ mark, ... }). */}
            Document sync requires a valid <code className="text-xs">mark</code>{" "}
            query parameter per the myDATA API. Use{" "}
            <code className="text-xs">useMydataDocsQuery</code> from{" "}
            <code className="text-xs">@/lib/hooks/api/use-mydata</code> once you
            have marks from operations.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="border-slate-200 shadow-sm transition-all duration-200">
        <CardHeader>
          <CardTitle>Stored files</CardTitle>
          <CardDescription>
            Download a file by storage key (same as{" "}
            <code className="text-xs">GET /v1/files/{"{filename}"}</code>).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-2">
          <div className="min-w-[200px] flex-1 space-y-2">
            <Label htmlFor="file-key">Filename / key</Label>
            <Input
              id="file-key"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="stored filename"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={!fileName.trim()}
            onClick={async () => {
              try {
                const blob = await downloadStoredFile(fileName.trim());
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = fileName.trim();
                a.click();
                URL.revokeObjectURL(url);
                toast({ title: "Download started" });
              } catch (e) {
                toast({
                  title: "Download failed",
                  description: isApiError(e) ? e.message : "Error",
                  variant: "destructive",
                });
              }
            }}
          >
            Download
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
