"use client";

import { motion } from "framer-motion";
import {
  ShieldAlert,
  Send,
  PackagePlus,
  CheckCircle2,
  XCircle,
  FileText,
  Loader2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import type { Action } from "@/types/api";
import { Badge } from "@/components/ui/badge";

export function ActionCard({
  item,
  busy,
  onDecision,
  onExecute,
}: {
  item: Action;
  busy: boolean;
  onDecision: (id: string, decision: "approve" | "reject") => void;
  onExecute: (id: string) => void;
}) {
  const sending = item.action_type === "SEND_PURCHASE_ORDER";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="card p-5 md:p-6 rounded-2xl border border-slate-200/90 bg-white shadow-xs hover:shadow-md transition-all space-y-4"
    >
      {/* Top Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={`p-2.5 rounded-xl border mt-0.5 ${
              sending
                ? "bg-teal-50 border-teal-200/80 text-teal-700"
                : "bg-emerald-50 border-emerald-200/80 text-emerald-700"
            }`}
          >
            {sending ? <Send className="w-5 h-5" /> : <PackagePlus className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-snug">
              {item.product_name
                ? `Reorder ${item.product_name}`
                : item.action_type.replaceAll("_", " ")}
            </h2>
            <div className="text-xs text-slate-400 mt-0.5">
              Initiated on {new Date(item.created_at).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </div>
          </div>
        </div>

        <Badge value={item.risk_level} />
      </div>

      {/* Reason Box */}
      <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/70 p-3 rounded-xl border border-slate-100">
        {item.reason}
      </p>

      {/* Quantities & Supplier Meta */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
        <div>
          <span className="text-slate-400 font-medium block text-[11px]">Proposed Quantity</span>
          <span className="font-bold text-slate-900 font-mono text-sm">
            {String(item.payload.quantity ?? "—")}
          </span>
        </div>
        <div>
          <span className="text-slate-400 font-medium block text-[11px]">Assigned Supplier</span>
          <span className="font-bold text-slate-900 truncate block">
            {item.supplier_name || "—"}
          </span>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <span className="text-slate-400 font-medium block text-[11px]">Execution Mode</span>
          <span className="font-semibold text-emerald-700">
            {sending ? "Direct STARTTLS" : "Automated PO Creation"}
          </span>
        </div>
      </div>

      {/* Evidence checklist */}
      {item.evidence.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Verified Supporting Evidence
          </span>
          <ul className="space-y-1 text-xs text-slate-600">
            {item.evidence.map((val, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>{val}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendation note */}
      {item.recommendation_id && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-teal-50/60 border border-teal-100 text-xs text-teal-800">
          <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
          <span>Grounded in validated MiMo recommendation with mathematical reorder formula.</span>
        </div>
      )}

      {item.status === "FAILED" && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            {sending
              ? "Email outcome needs manual review before another attempt."
              : "Inventory changed before execution. A fresh risk refresh can propose a new quantity."}
          </span>
        </div>
      )}

      {/* Decision / Execution Bar */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
        <Badge value={item.status} />

        {["SUGGESTED", "AWAITING_APPROVAL"].includes(item.status) && (
          <div className="flex items-center gap-2">
            <button
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-all flex items-center gap-1.5"
              disabled={busy}
              onClick={() => onDecision(item.id, "reject")}
            >
              <XCircle className="w-3.5 h-3.5 text-rose-500" />
              <span>Reject</span>
            </button>
            <button
              className="px-3.5 py-1.5 rounded-lg bg-[#145f55] hover:bg-[#0e4d45] text-white font-semibold text-xs shadow-xs hover:shadow-md transition-all flex items-center gap-1.5"
              disabled={busy}
              onClick={() => onDecision(item.id, "approve")}
            >
              {busy ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>Approve Action</span>
            </button>
          </div>
        )}

        {item.status === "APPROVED" && (
          <button
            className="px-4 py-1.5 rounded-lg bg-[#145f55] hover:bg-[#0e4d45] text-white font-semibold text-xs shadow-xs hover:shadow-md transition-all flex items-center gap-2"
            disabled={busy}
            onClick={() => onExecute(item.id)}
          >
            {busy ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>{sending ? "Dispatch to Supplier" : "Execute Reorder"}</span>
          </button>
        )}
      </div>
    </motion.div>
  );
}
