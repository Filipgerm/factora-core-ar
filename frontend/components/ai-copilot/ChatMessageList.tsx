"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import type { ChatMessage } from "@/types/chat";
import { EntityCard } from "./EntityCard";
import { RiskResults } from "./RiskResults";
import { ReportTable } from "@/app/(dashboard)/ai-copilot/ReportTable";

// Lazy-load ForecastChart to avoid bundling recharts in main chunk
const ForecastChart = dynamic(
  () =>
    import("@/app/(dashboard)/ai-copilot/ForecastChart").then(
      (m) => m.ForecastChart
    ),
  { ssr: false }
);

interface ChatMessageListProps {
  messages: ChatMessage[];
  entitySelected: boolean;
  formatCurrentTimestamp: () => string;
  onEntityConfirm: (entity: { name: string; vat: string }) => void;
}

export function ChatMessageList({
  messages,
  entitySelected,
  formatCurrentTimestamp,
  onEntityConfirm,
}: ChatMessageListProps) {
  return (
    <>
      {messages.map((m, idx) => (
        <div
          key={idx}
          className={
            m.role === "assistant" ? "flex justify-start" : "flex justify-end"
          }
        >
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.28,
              ease: "easeOut",
              delay: Math.min(idx * 0.03, 0.2),
            }}
            className={`${m.role === "assistant"
              ? "bg-slate-100 text-foreground"
              : "bg-gradient-to-r from-brand-primary to-brand-grad-start text-white"
              } rounded-2xl px-4 py-3 max-w-[80%] text-sm leading-relaxed shadow break-words whitespace-pre-wrap`}
          >
            <div className="space-y-3">
              <div>{m.content}</div>

              {/* Entity card */}
              {m.entityCard && (
                <EntityCard
                  entityCard={m.entityCard}
                  entitySelected={entitySelected}
                  onConfirm={onEntityConfirm}
                />
              )}

              {/* Risk results card */}
              {m.riskResults && (
                <RiskResults
                  riskResults={m.riskResults}
                  formatCurrentTimestamp={formatCurrentTimestamp}
                />
              )}

              {/* Full report */}
              {"fullReport" in m && m.fullReport && (
                <div className="mt-4">
                  <ReportTable report={m.fullReport} />
                </div>
              )}

              {/* 13-week forecast chart */}
              {"chart" in m && m.chart && (
                <div className="mt-4">
                  <ForecastChart chart={m.chart} />
                </div>
              )}
            </div>
          </motion.div>
        </div>
      ))}
    </>
  );
}

