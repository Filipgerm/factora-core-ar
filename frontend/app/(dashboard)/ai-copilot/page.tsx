"use client";

import { Suspense } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

import { useAIChat } from "@/hooks/use-ai-chat";
import { ChatMessageList } from "@/components/ai-copilot/ChatMessageList";
import { ChatInput } from "@/components/ai-copilot/ChatInput";

function BusinessAICopilotPageInner() {
  const router = useRouter();
  const {
    chatStarted,
    messages,
    input,
    setInput,
    endRef,
    textareaRef,
    isThinking,
    entitySelected,
    formatCurrentTimestamp,
    handleEntityConfirm,
    handleSend,
  } = useAIChat();

  function handleIssueInvoice() {
    router.push("/ai-copilot/finance-invoices");
  }

  return (
    <main className="relative flex justify-center items-start bg-slate-50 min-h-screen overflow-y-auto">
      {/* Messages Area - Always present */}
      <div className="w-full max-w-4xl flex-1 overflow-y-auto pt-12 pb-48 space-y-6">
        <ChatMessageList
          messages={messages}
          entitySelected={entitySelected}
          formatCurrentTimestamp={formatCurrentTimestamp}
          onEntityConfirm={handleEntityConfirm}
        />

        {isThinking && (
          <div className="flex justify-start">
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-slate-100 text-foreground rounded-2xl px-4 py-3 max-w-[80%] text-sm leading-relaxed shadow"
              aria-live="polite"
            >
              <div className="flex items-center gap-1.5">
                <span className="sr-only">Assistant is typing</span>
                <span
                  className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </motion.div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Floating Input Wrapper */}
      <ChatInput
        chatStarted={chatStarted}
        input={input}
        textareaRef={textareaRef}
        onInputChange={setInput}
        onSend={handleSend}
      />
    </main>
  );
}

export default function BusinessAICopilotPage() {
  return (
    <Suspense
      fallback={
        <main className="flex-1 overflow-hidden bg-slate-50 p-6 min-h-screen">
          <div className="max-w-4xl mx-auto space-y-6">Loading…</div>
        </main>
      }
    >
      <BusinessAICopilotPageInner />
    </Suspense>
  );
}
