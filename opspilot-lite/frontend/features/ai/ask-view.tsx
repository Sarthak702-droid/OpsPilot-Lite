"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Bot, BrainCircuit, ShieldCheck, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { AskInput } from "@/components/ai/ask-input";
import { AIResponse } from "@/components/ai/ai-response";
import { useToken } from "@/lib/auth-context";
import { askOpsPilot } from "@/services/ai.service";
import type { AskResponse } from "@/types/api";

export function AskView() {
  const token = useToken();
  const [history, setHistory] = useState<{ query: string; response: AskResponse }[]>([]);

  const ask = useMutation({
    mutationFn: async (question: string) => {
      const res = await askOpsPilot(await token(), question);
      return { question, res };
    },
    onSuccess: ({ question, res }) => {
      setHistory((prev) => [{ query: question, response: res }, ...prev]);
    },
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Ask OpsPilot Copilot"
          description="Inquire in natural language across inventory exposure, supplier lead times, and cash collection risk."
        />

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/80">
          <BrainCircuit className="w-3.5 h-3.5 text-emerald-600" />
          <span>MiMo Reasoning Active</span>
        </div>
      </div>

      {/* Copilot Input Card */}
      <AskInput onAsk={(question) => ask.mutate(question)} busy={ask.isPending} />

      {/* Animated Thinking Indicator */}
      <AnimatePresence>
        {ask.isPending && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="card p-6 rounded-2xl border border-teal-200/80 bg-gradient-to-r from-emerald-50/50 to-teal-50/50 shadow-sm flex items-center justify-center space-x-3 text-xs text-teal-800 font-medium"
          >
            <Loader2 className="w-5 h-5 animate-spin text-[#145f55]" />
            <span>Retrieving signals & reasoning across database records with MiMo...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {ask.isError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
          Could not generate an answer. Please check if the inference model endpoint or backend is accessible.
        </div>
      )}

      {/* Answer History */}
      <div className="space-y-4">
        <AnimatePresence>
          {history.map((entry, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-2"
            >
              <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5 px-1">
                <span>Inquiry:</span>
                <span className="text-slate-800 italic font-medium">&ldquo;{entry.query}&rdquo;</span>
              </div>
              <AIResponse result={entry.response} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
