"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuthSessionState } from "@/components/providers/auth-session-provider";

/**
 * Redirects unauthenticated users to /login after the session bootstrap
 * completes. Renders nothing until the bootstrap is done so there is no flash
 * of protected content.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { accessToken, bootstrapDone } = useAuthSessionState();
  const router = useRouter();

  useEffect(() => {
    if (bootstrapDone && !accessToken) {
      router.replace("/login");
    }
  }, [bootstrapDone, accessToken, router]);

  if (!bootstrapDone) {
    return null;
  }

  if (!accessToken) {
    return null;
  }

  return <>{children}</>;
}
