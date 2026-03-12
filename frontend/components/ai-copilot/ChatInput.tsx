"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowUp } from "lucide-react";
import { SUGGESTIONS } from "@/lib/utils/ai-copilot";

interface ChatInputProps {
  chatStarted: boolean;
  input: string;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onInputChange: (value: string) => void;
  onSend: (query?: string) => void;
}

export function ChatInput({
  chatStarted,
  input,
  textareaRef,
  onInputChange,
  onSend,
}: ChatInputProps) {
  return (
    <motion.div
      className="fixed w-full max-w-4xl bg-gradient-to-t from-slate-50 via-slate-50 to-transparent pt-8 pb-4"
      initial={{
        top: "50%",
        bottom: "auto",
        y: "-50%",
        opacity: 0,
      }}
      animate={{
        top: chatStarted ? "auto" : "50%",
        bottom: chatStarted ? "0" : "auto",
        y: chatStarted ? 0 : "-50%",
        opacity: 1,
      }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      {/* Title - fades out when chat starts */}
      <AnimatePresence>
        {!chatStarted && (
          <motion.h1
            className="text-3xl sm:text-4xl font-semibold text-foreground mb-8 text-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            What business are you interested in?
          </motion.h1>
        )}
      </AnimatePresence>

      {/* Suggestions bar - shows when chat started */}
      {chatStarted && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-3"
        >
          <div className="text-slate-600 text-sm font-medium mb-2">
            Try asking:
          </div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                className="text-sm px-3 py-1.5 rounded-full bg-white border border-slate-200 text-brand-grad-start hover:bg-slate-100 transition-colors shadow-sm"
                onClick={() => onSend(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Input area */}
      <div className="relative bg-white rounded-3xl shadow-lg border border-slate-200">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder="Search a business..."
          rows={1}
          className="w-full resize-none rounded-3xl px-6 py-4 pr-14 text-foreground focus:outline-none bg-transparent max-h-[200px] overflow-y-auto"
          style={{ minHeight: "56px" }}
        />
        <div className="absolute right-3 bottom-3">
          <Button
            onClick={() => onSend()}
            disabled={!input.trim()}
            className="h-10 w-10 rounded-full bg-brand-primary hover:bg-brand-primary-hover disabled:bg-slate-300 disabled:cursor-not-allowed p-0 flex items-center justify-center transition-colors"
          >
            <ArrowUp className="h-5 w-5 text-white" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

