"use client";

import { Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { addIntegration } from "@/lib/integrations";

function RedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Add myDATA ERP integration using the unified storage logic
    addIntegration("erp", "mydata", "myDATA");
    // Navigate to platform-selection step after myDATA authentication
    const params = new URLSearchParams(searchParams.toString());
    params.set("erp", "myDATA");
    router.push(`/onboarding/erp-success?${params.toString()}`);
  };

  // Check if bank is Piraeus to determine background color
  // If no bank parameter or bank is Piraeus, use gray background
  // Otherwise, use blue gradient for other banks
  const bankParam = searchParams.get("bank");
  const isPiraeusBank =
    !bankParam || (bankParam && bankParam.toLowerCase().includes("piraeus"));
  const backgroundClass = isPiraeusBank
    ? "bg-[#dfdfdf]"
    : "bg-gradient-to-br from-brand-page-bg-start to-brand-page-bg-end";

  return (
    <div className={`flex h-dvh w-dvw flex-col justify-end ${backgroundClass}`}>
      <main className="flex h-full w-full flex-col items-center justify-start p-[60px]">
        <form
          onSubmit={handleSubmit}
          className="mb-10 h-[500px] w-[638px] bg-[#f5f5f5] shadow-xl/20"
        >
          <Image
            src="/images/myDATA/header.png"
            width={638}
            height={102}
            alt="eu"
          />

          <div className="flex flex-col space-y-10 p-6 pt-12">
            <div className="relative">
              <input
                type="text"
                className="peer w-full border-b border-gray-300 px-0 py-2 text-black focus:border-blue-500 focus:outline-none"
                autoComplete="off"
                placeholder=" "
              />
              <label className="absolute top-2 left-0 text-sm font-bold text-black transition-all duration-200 peer-placeholder-shown:top-2 peer-focus:-top-4 peer-focus:text-xs peer-focus:text-blue-500 peer-[&:not(:placeholder-shown)]:-top-4 peer-[&:not(:placeholder-shown)]:text-xs">
                Όνομα χρήστη
              </label>
            </div>
            <div className="relative">
              <input
                type="password"
                className="peer w-full border-b border-gray-300 px-0 py-2 text-black focus:border-blue-500 focus:outline-none"
                autoComplete="off"
                placeholder=" "
              />
              <label className="absolute top-2 left-0 text-sm font-bold text-black transition-all duration-200 peer-placeholder-shown:top-2 peer-focus:-top-4 peer-focus:text-xs peer-focus:text-blue-500 peer-[&:not(:placeholder-shown)]:-top-4 peer-[&:not(:placeholder-shown)]:text-xs">
                Κωδικός πρόσβασης
              </label>
            </div>
            <div className="flex flex-row justify-between">
              <button
                type="submit"
                className="h-[54px] w-[127px] rounded-xs bg-[#046ec5] px-[11.25px] font-bold text-white shadow-lg"
              >
                ΣΥΝΔΕΣΗ
              </button>
              <Image
                src="/images/myDATA/gsis_logo.png"
                width={220}
                height={70}
                alt="eu"
              />
            </div>
            <p className="text-center text-sm font-bold text-neutral-400">
              Απαγορεύεται η μη εξουσιοδοτημένη χρήση αυτής της τοποθεσίας, η
              οποία μπορεί να επιφέρει αστική και ποινική δίωξη.
            </p>
          </div>
        </form>
      </main>
      <footer>
        <div className="m-[12.5px] text-center">
          <p className="text-xs text-black">
            &quot;Το έργο συγχρηματοδοτείται από το Ευρωπαϊκό Ταμείο
            Περιφερειακής Ανάπτυξης (ΕΤΠΑ) και από Εθνικούς πόρους.&quot;
          </p>
        </div>
        <div className="mx-auto mb-6 flex w-4/5 items-center justify-center space-x-16">
          <div className="flex w-[200px] items-center justify-center">
            <Image
              className="h-20 w-auto object-contain"
              src="/images/myDATA/eu.png"
              alt="eu"
              width={100}
              height={80}
            />
          </div>
          <div className="flex w-[200px] items-center justify-center">
            <Image
              className="h-20 w-auto object-contain"
              src="/images/myDATA/diggr.png"
              alt="diggr"
              width={150}
              height={80}
            />
          </div>
          <div className="flex w-[200px] items-center justify-center">
            <Image
              className="h-20 w-auto object-contain"
              src="/images/myDATA/espa.png"
              alt="espa"
              width={130}
              height={80}
            />
          </div>
        </div>
        <div className="justify-left mx-auto flex h-[50px] items-center bg-neutral-300 p-[10px] text-left">
          <div className="text-xs text-black">
            © 2020 Γενική Γραμματεία Πληροφοριακών Συστημάτων Δημόσιας Διοίκησης
          </div>
        </div>
      </footer>
    </div>
  );
}

function RedirectFallback() {
  return (
    <div className="flex h-dvh w-dvw flex-col justify-end bg-[#dfdfdf]">
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-black">Loading...</div>
      </div>
    </div>
  );
}

export default function RedirectPage() {
  return (
    <Suspense fallback={<RedirectFallback />}>
      <RedirectContent />
    </Suspense>
  );
}
