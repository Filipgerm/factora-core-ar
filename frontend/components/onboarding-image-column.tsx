"use client";

import Image from "next/image";

interface OnboardingImageColumnProps {
  stepImageSrc: string;
  altText: string;
}

export default function OnboardingImageColumn({
  stepImageSrc,
  altText,
}: OnboardingImageColumnProps) {
  return (
    <div className="relative h-full w-full bg-gray-50 overflow-hidden">
      {/* Background image - persistent across all steps */}
      <Image
        src="/images/onboarding/background.webp"
        alt=""
        fill
        priority
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 40vw"
        className="object-cover"
        aria-hidden="true"
      />
      {/* Step-specific center image overlay */}
      <div className="absolute inset-0 flex items-center justify-center p-8 md:p-12">
        <div className="relative h-full w-full max-h-[100%] max-w-[840px]">
          <Image
            src={stepImageSrc}
            alt={altText}
            fill
            className="object-contain"
            priority
          />
        </div>
      </div>
    </div>
  );
}
