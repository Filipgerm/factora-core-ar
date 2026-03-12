"use client";

import { ONBOARDING_LINK } from "@/lib/send-link";
import QuillEditor from "@/components/ui/quill-editor";
import { motion, AnimatePresence } from "framer-motion";

interface InteractiveEmailLaptopProps {
  recipientEmail: string;
  onRecipientChange?: (value: string) => void;
  subject: string;
  onSubjectChange?: (value: string) => void;
  content: string;
  onContentChange: (value: string) => void;
  isLoading?: boolean;
  viewMode?: "compose" | "preview";
  onViewModeChange?: (value: "compose" | "preview") => void;
  isTemplateActive?: boolean;
}

export function InteractiveEmailLaptop({
  recipientEmail,
  subject,
  content,
  onContentChange,
  viewMode = "compose",
  onViewModeChange,
  isTemplateActive = false,
}: InteractiveEmailLaptopProps) {
  const isPreview = viewMode === "preview";

  return (
    <div className="flex justify-center p-4 pt-16 lg:p-8 lg:pt-16 overflow-visible w-full">
      <div className="relative w-full max-w-[1100px] perspective-[2000px] group">

        {/* VIEW TOGGLE */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex bg-gray-200/50 p-1 rounded-lg z-50 shadow-sm border border-gray-200/50">
          <button
            type="button"
            onClick={() => onViewModeChange?.("compose")}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${!isPreview ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
          >
            Compose
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange?.("preview")}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${isPreview ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
          >
            Preview
          </button>
        </div>

        {/* 1. LID (Screen Housing) */}
        <div className="relative z-20 mx-auto bg-[#0d0d0d] rounded-[24px] p-[1.2%] shadow-2xl border-[1px] border-white/10">

          <div className="relative bg-white rounded-[10px] overflow-hidden aspect-[16/10] w-full flex flex-col z-20">

            {/* EMAIL CLIENT HEADER */}
            <div className="flex flex-col border-b border-gray-200 bg-[#f8f9fa] shrink-0">
              <div className="flex items-center px-4 py-2.5 border-b border-gray-200/60 bg-[#f1f1f1]">
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#FF5F57] border border-[#E0443E]" />
                  <div className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E] border border-[#D89E24]" />
                  <div className="h-2.5 w-2.5 rounded-full bg-[#28C840] border border-[#1AAB29]" />
                </div>
              </div>

              <div className="flex flex-col bg-white">
                <div className="flex items-center px-5 py-2 border-b border-gray-100 bg-gray-50/20">
                  <span className="text-[10px] font-bold text-gray-400 w-16 uppercase tracking-wider">To:</span>
                  <div className="flex-1 text-xs text-gray-900 font-medium h-6 flex items-center truncate">
                    {recipientEmail || "client@company.com"}
                  </div>
                </div>
                <div className="flex items-center px-5 py-2 bg-gray-50/20">
                  <span className="text-[10px] font-bold text-gray-400 w-16 uppercase tracking-wider">Subject:</span>
                  <div className="flex-1 text-xs text-gray-900 font-normal ml-3 h-6 flex items-center truncate">
                    {subject || "Invitation to Onboard"}
                  </div>
                </div>
              </div>
            </div>

            {/* TEMPLATE STATUS INDICATOR (Shared across both modes) */}
            <AnimatePresence>
              {isTemplateActive && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="absolute top-3 right-4 z-50 bg-brand-primary text-[10px] text-white px-2.5 py-1 rounded-full shadow-sm font-bold flex items-center gap-1.5"
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  TEMPLATE ACTIVE
                </motion.div>
              )}
            </AnimatePresence>

            {/* THE RETINA SCREEN - SCALABLE AREA */}
            <div className="flex-1 overflow-hidden relative bg-white">
              {/* MODIFIED: Adjusted scale to 0.9 and tightened padding to maximize vertical space */}
              <div
                className="w-full h-full origin-top transition-transform duration-500 p-4"
                style={{
                  transform: 'scale(0.9)',
                }}
              >
                {isPreview ? (
                  <div className="prose prose-sm max-w-none flex flex-col h-full">
                    <div
                      dangerouslySetInnerHTML={{ __html: content }}
                      className="text-gray-800 text-xs leading-relaxed flex-shrink"
                    />

                    {/* MODIFIED: Reduced margins (mt-4 pt-4) and shrunk the button (px-5 py-2 text-xs) */}
                    <div className="mt-4 pt-4 border-t border-gray-100 text-center shrink-0">
                      <p className="text-[10px] text-gray-500 mb-2">Link expires in 72 hours</p>
                      <div className="inline-block rounded-lg bg-brand-primary px-5 py-2 text-xs font-semibold text-white shadow-sm cursor-default">
                        Complete Your Onboarding
                      </div>
                      <p className="mt-3 text-center text-[9px] text-gray-400">
                        Secured by Factora Financial Systems
                      </p>
                    </div>
                  </div>
                ) : (
                  <QuillEditor
                    value={content}
                    onChange={onContentChange}
                  />
                )}
              </div>
            </div>

            {/* Screen Reflection overlay */}
            <div className="absolute top-0 right-0 w-3/5 h-full bg-gradient-to-l from-white/5 to-transparent pointer-events-none z-40 opacity-30"></div>
          </div>
        </div>

        {/* 4. BASE */}
        <div className="relative z-10 mx-auto w-[105%] -ml-[2.5%] mt-[-4px]">
          <div className="mx-auto w-[80%] h-4 bg-[#111] rounded-b-lg shadow-inner border-x border-[#333]"></div>
          <div className="h-[24px] bg-[#C7C8CA] rounded-b-[20px] shadow-2xl border-t border-[#888] bg-gradient-to-r from-[#B1B2B4] via-[#C7C8CA] to-[#B1B2B4]">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1.5 bg-[#A1A2A4] rounded-b-md"></div>
          </div>
        </div>
      </div>
    </div>
  );
}