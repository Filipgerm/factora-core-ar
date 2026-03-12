"use client";
import ERPSelectionForm from "./ERPSelectionForm";
import { SuspenseWrapper } from "../SuspenseWrapper";

export default function ERPSelectionPage() {
  return (
    <div className="flex h-full w-full flex-col">
      <SuspenseWrapper>
        <ERPSelectionForm />
      </SuspenseWrapper>
    </div>
  );
}
