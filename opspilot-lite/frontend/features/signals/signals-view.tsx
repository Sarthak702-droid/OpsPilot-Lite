"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Siren, RefreshCw, AlertTriangle, ShieldCheck, Filter } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { useToken } from "@/lib/auth-context";
import { getSignals } from "@/services/signals.service";
import { date } from "@/lib/utils";
import type { Signal } from "@/types/api";

const columns: Column<Signal>[] = [
  { label: "Severity", render: (x) => <Badge value={x.severity} /> },
  {
    label: "Signal",
    render: (x) => <strong className="text-slate-900 font-bold">{x.title}</strong>,
    searchKey: (x) => x.title,
  },
  {
    label: "Evidence",
    render: (x) => <span className="text-slate-600 text-xs">{x.description}</span>,
    searchKey: (x) => x.description,
  },
  {
    label: "Domain Area",
    render: (x) => (
      <span className="font-semibold text-emerald-800 text-[11px] bg-emerald-50 px-2 py-0.5 rounded-md">
        {x.signal_type.replaceAll("_", " ")}
      </span>
    ),
  },
  {
    label: "Detected",
    render: (x) => <span className="text-slate-400 font-mono text-[11px]">{date(x.created_at)}</span>,
  },
];

export function SignalsView() {
  const token = useToken();
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");

  const q = useQuery({
    queryKey: ["signals"],
    queryFn: async () => getSignals(await token()),
  });

  const items = useMemo(() => q.data?.items ?? [], [q.data?.items]);

  const filteredItems = useMemo(() => {
    if (severityFilter === "ALL") return items;
    return items.filter((s) => s.severity.toUpperCase() === severityFilter);
  }, [items, severityFilter]);

  const counts = useMemo(() => {
    return {
      critical: items.filter((s) => s.severity === "CRITICAL").length,
      high: items.filter((s) => s.severity === "HIGH").length,
      medium: items.filter((s) => s.severity === "MEDIUM").length,
      low: items.filter((s) => s.severity === "LOW" || s.severity === "INFO").length,
    };
  }, [items]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Signals & Anomaly Stream"
          description="Continuous deterministic risk detection across inventory, supplier lead times, and payment buffers."
        />

        <button
          onClick={() => q.refetch()}
          disabled={q.isFetching}
          className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-xs transition-all flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${q.isFetching ? "animate-spin text-emerald-600" : ""}`} />
          <span>Refresh Signals</span>
        </button>
      </div>

      {/* Metric summary counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Critical</div>
            <div className="text-xl font-black text-slate-900 mt-0.5">{counts.critical}</div>
          </div>
          <span className="p-2 rounded-lg bg-rose-50 text-rose-600 font-bold text-xs">🔴</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">High Risk</div>
            <div className="text-xl font-black text-slate-900 mt-0.5">{counts.high}</div>
          </div>
          <span className="p-2 rounded-lg bg-amber-50 text-amber-600 font-bold text-xs">🟠</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-yellow-600 uppercase tracking-wider">Medium Risk</div>
            <div className="text-xl font-black text-slate-900 mt-0.5">{counts.medium}</div>
          </div>
          <span className="p-2 rounded-lg bg-yellow-50 text-yellow-600 font-bold text-xs">🟡</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Low / Info</div>
            <div className="text-xl font-black text-slate-900 mt-0.5">{counts.low}</div>
          </div>
          <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600 font-bold text-xs">🟢</span>
        </div>
      </div>

      {/* Severity Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((level) => (
          <button
            key={level}
            onClick={() => setSeverityFilter(level)}
            className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
              severityFilter === level
                ? "bg-[#145f55] text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200/70 hover:bg-slate-50"
            }`}
          >
            {level === "ALL" ? "All Signals" : level}
          </button>
        ))}
      </div>

      {q.isLoading ? (
        <div className="card p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
          Scanning operational data for risk signals...
        </div>
      ) : q.isError ? (
        <div className="p-8 text-center text-xs text-rose-600 bg-rose-50/50 rounded-2xl border border-rose-200">
          Could not load signals. Ensure the background worker has refreshed the database.
        </div>
      ) : (
        <DataTable
          items={filteredItems}
          columns={columns}
          empty="No active signals detected in this category. The worker refreshes these every 15 minutes."
          searchPlaceholder="Search signals or evidence..."
        />
      )}
    </div>
  );
}
