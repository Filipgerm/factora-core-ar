"use client";
import BankSelectionForm from "./BankSelectionForm";
import { SuspenseWrapper } from "../SuspenseWrapper";

export default function BankSelectionPage() {
  return (
    <div className="flex h-full w-full flex-col">
      <SuspenseWrapper>
        <BankSelectionForm />
      </SuspenseWrapper>
    </div>
  );
}
