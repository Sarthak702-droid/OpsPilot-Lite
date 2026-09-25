"use client";

import { useState } from "react";
import { Sparkles, ArrowRight, Loader2, Lightbulb } from "lucide-react";

const suggestions = [
  "What needs attention today?",
  "Which products are near stockout?",
  "Explain why a supplier is high risk",
  "Summarize pending purchase orders",
];

export function AskInput({
  onAsk,
  busy,
}: {
  onAsk: (value: string) => void;
  busy: boolean;
}) {
  const [value, setValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim().length >= 3 && !busy) {
      onAsk(value.trim());
    }
  };

  const handleSuggestion = (prompt: string) => {
    setValue(prompt);
    onAsk(prompt);
  };

  return (
    <div className="space-y-3">
      <form
        onSubmit={handleSubmit}
        className="card p-2 rounded-2xl border border-slate-200/90 bg-white shadow-sm focus-within:border-[#145f55] focus-within:ring-4 focus-within:ring-[#145f55]/10 transition-all flex items-center gap-2"
      >
        <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
          <Sparkles className="w-5 h-5 animate-pulse" />
        </div>

        <input
          className="flex-1 h-11 bg-transparent border-0 outline-none text-sm font-medium text-slate-800 placeholder:text-slate-400 px-2"
          aria-label="Question for OpsPilot"
          placeholder="Ask anything about inventory, overdue invoices, or supplier risks..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={1000}
        />

        <button
          className="h-10 px-5 rounded-xl bg-[#145f55] hover:bg-[#0e4d45] disabled:opacity-50 text-white font-semibold text-xs shadow-xs hover:shadow-md transition-all flex items-center gap-2 shrink-0"
          type="submit"
          disabled={busy || value.trim().length < 3}
        >
          {busy ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <span>Ask AI</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Suggested prompts */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mr-1">
          <Lightbulb className="w-3 h-3 text-amber-500" /> Suggestions:
        </span>
        {suggestions.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => handleSuggestion(prompt)}
            disabled={busy}
            className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100/80 hover:bg-slate-200/70 text-slate-600 font-medium transition-colors border border-slate-200/60"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
