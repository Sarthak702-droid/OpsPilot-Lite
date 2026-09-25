"use client";

import { motion } from "framer-motion";
import {
  TrendingUp,
  AlertTriangle,
  Clock,
  Package,
  Siren,
  CheckCircle2,
  DollarSign,
} from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string;
  note?: string;
  icon?: React.ReactNode;
}

function getIcon(label: string) {
  const l = label.toLowerCase();
  if (l.includes("revenue")) return <TrendingUp className="w-4 h-4 text-emerald-600" />;
  if (l.includes("outstanding")) return <DollarSign className="w-4 h-4 text-blue-600" />;
  if (l.includes("overdue")) return <Clock className="w-4 h-4 text-amber-600" />;
  if (l.includes("stock")) return <Package className="w-4 h-4 text-purple-600" />;
  if (l.includes("alert") || l.includes("critical")) return <Siren className="w-4 h-4 text-rose-600" />;
  if (l.includes("action") || l.includes("pending")) return <CheckCircle2 className="w-4 h-4 text-teal-600" />;
  return <TrendingUp className="w-4 h-4 text-emerald-600" />;
}

export function MetricCard({ label, value, note, icon }: MetricCardProps) {
  const displayIcon = icon ?? getIcon(label);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, scale: 1.01 }}
      transition={{ duration: 0.2 }}
      className="card p-4 rounded-xl border border-slate-200/80 bg-white shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 tracking-tight">{label}</span>
        <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100 group-hover:scale-110 transition-transform">
          {displayIcon}
        </div>
      </div>

      <div className="mt-3 text-2xl font-black text-slate-900 tracking-tight">{value}</div>

      {note && (
        <div className="mt-1.5 text-[11px] font-medium text-slate-400 flex items-center gap-1">
          {note}
        </div>
      )}
    </motion.div>
  );
}
