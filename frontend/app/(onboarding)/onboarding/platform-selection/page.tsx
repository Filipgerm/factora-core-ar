"use client";
import PlatformSelectionForm from "./PlatformSelectionForm";
import { SuspenseWrapper } from "../SuspenseWrapper";

export default function PlatformSelectionPage() {
  return (
    <div className="flex h-full w-full flex-col">
      <SuspenseWrapper>
        <PlatformSelectionForm />
      </SuspenseWrapper>
    </div>
  );
}
