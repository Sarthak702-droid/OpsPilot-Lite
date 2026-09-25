"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, AlertCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Signal } from "@/types/api";

export function PriorityList({ items }: { items: Signal[] }) {
  if (items.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
        <CheckCircleIcon className="w-5 h-5 mx-auto mb-2 text-emerald-500" />
        No critical priorities. Automated signals scan every 15 minutes.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2, delay: index * 0.05 }}
          className="group p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-slate-200 hover:shadow-xs transition-all flex items-start justify-between gap-3"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <Badge value={item.severity} />
            </div>
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-slate-900 group-hover:text-[#145f55] transition-colors flex items-center gap-1.5">
                {item.title}
              </div>
              <div className="text-[11px] text-slate-500 leading-normal line-clamp-2">
                {item.description}
              </div>
            </div>
          </div>

          <Link
            href="/signals"
            className="shrink-0 p-1.5 rounded-lg text-slate-400 group-hover:text-[#145f55] group-hover:bg-emerald-50 transition-colors"
            title="Inspect Signal"
          >
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </motion.div>
      ))}
    </div>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}
