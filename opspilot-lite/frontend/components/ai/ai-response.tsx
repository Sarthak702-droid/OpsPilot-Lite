"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Sparkles,
  CheckCircle2,
  Cpu,
  ArrowRight,
  ShieldCheck,
  FileCheck2,
  Bot,
} from "lucide-react";
import type { AskResponse } from "@/types/api";
import { Badge } from "@/components/ui/badge";

export function AIResponse({ result }: { result: AskResponse }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="card p-6 rounded-2xl border border-slate-200/90 bg-white shadow-md space-y-5 mt-4"
    >
      {/* Top Source Banner */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-200/60 flex items-center justify-center text-teal-700">
            <Bot className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold text-slate-900">OpsPilot AI Intelligence</span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
          <span>
            {result.source === "mimo"
              ? "MiMo Deep Reasoning"
              : result.source === "fallback"
              ? "Deterministic Fallback"
              : "Live Signals Engine"}
          </span>
        </div>
      </div>

      {/* Main Answer or Grounded Recommendation */}
      {result.recommendation ? (
        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50/70 to-teal-50/40 border border-emerald-200/70 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Strategic Recommendation
            </span>
            <Badge value={result.recommendation.priority} />
          </div>

          <h3 className="text-base font-bold text-slate-900">
            {result.recommendation.title}
          </h3>

          <p className="text-xs text-slate-700 leading-relaxed">
            {result.recommendation.reason}
          </p>

          <div className="p-3 rounded-lg bg-white/90 border border-emerald-100 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">
              Suggested: <strong className="text-slate-900">{result.recommendation.recommended_action.replaceAll("_", " ")}</strong>
              {result.recommendation.recommended_quantity != null && (
                <span className="font-mono text-emerald-700 font-bold ml-1.5">
                  (Qty: {result.recommendation.recommended_quantity})
                </span>
              )}
            </span>

            <Link
              href="/actions"
              className="px-3 py-1 rounded-lg bg-[#145f55] hover:bg-[#0e4d45] text-white font-semibold text-xs transition-all flex items-center gap-1"
            >
              <span>Review Action</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-800 leading-relaxed font-normal">
          {result.answer}
        </div>
      )}

      {/* Supporting Evidence List */}
      {result.evidence && result.evidence.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Grounded Source Evidence</span>
          </div>

          <ul className="space-y-1 text-xs text-slate-600">
            {result.evidence.map((item, i) => (
              <li key={i} className="flex items-start gap-2 bg-slate-50/60 p-2 rounded-lg border border-slate-100">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.section>
  );
}
