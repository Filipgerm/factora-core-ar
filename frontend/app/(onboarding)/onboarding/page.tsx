"use client";
import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function OnboardingRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const isDemoMode = searchParams.get("demo") === "true";
    const query = searchParams.toString();
    const queryString = query ? `?${query}` : "";

    if (isDemoMode) {
      router.push(`/onboarding/demo-selector${queryString}`);
    } else {
      router.push(`/onboarding/phone${queryString}`);
    }
  }, [router, searchParams]);

  return null; // This component only handles redirects
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen">
          Loading...
        </div>
      }
    >
      <OnboardingRedirect />
    </Suspense>
  );
}
