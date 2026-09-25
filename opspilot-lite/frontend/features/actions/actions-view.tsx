"use client";

import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ShieldCheck, AlertCircle, RefreshCw, Inbox } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ActionCard } from "@/components/actions/action-card";
import { useToken } from "@/lib/auth-context";
import { getActions, decideAction, executeAction } from "@/services/actions.service";

export function ActionsView() {
  const token = useToken();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("ALL");

  const q = useQuery({
    queryKey: ["actions"],
    queryFn: async () => getActions(await token()),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["actions"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const mutation = useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: "approve" | "reject" }) =>
      decideAction(await token(), id, decision),
    onSuccess: invalidate,
  });

  const execute = useMutation({
    mutationFn: async (id: string) => executeAction(await token(), id),
    onSuccess: invalidate,
    onError: () => qc.invalidateQueries({ queryKey: ["actions"] }),
  });

  const items = useMemo(() => q.data?.items ?? [], [q.data?.items]);

  const filteredItems = useMemo(() => {
    if (filter === "ALL") return items;
    if (filter === "PENDING") {
      return items.filter((x) => x.status === "AWAITING_APPROVAL" || x.status === "SUGGESTED");
    }
    if (filter === "APPROVED") {
      return items.filter((x) => x.status === "APPROVED");
    }
    if (filter === "EXECUTED") {
      return items.filter((x) => x.status === "EXECUTED");
    }
    if (filter === "REJECTED") {
      return items.filter((x) => x.status === "REJECTED" || x.status === "FAILED");
    }
    return items;
  }, [items, filter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Action Center"
          description="Review consequential decisions, dual-authorization purchase orders, and inventory rebalance proposals."
        />

        <button
          onClick={() => q.refetch()}
          disabled={q.isFetching}
          className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-xs transition-all flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${q.isFetching ? "animate-spin text-emerald-600" : ""}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Governance Banner */}
      <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-50/80 to-teal-50/60 border border-emerald-200/70 flex items-center justify-between text-xs text-emerald-950">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>
            <strong>Maker-Checker Enforcement:</strong> An action approved by one member requires an authorized user to trigger execution.
          </span>
        </div>
        <span className="text-[11px] font-bold text-emerald-800 bg-white/80 px-2.5 py-0.5 rounded-full border border-emerald-200 shrink-0">
          SOC2 Audit Active
        </span>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { key: "ALL", label: "All Actions" },
          { key: "PENDING", label: "Awaiting Approval" },
          { key: "APPROVED", label: "Ready to Execute" },
          { key: "EXECUTED", label: "Completed" },
          { key: "REJECTED", label: "Rejected / Failed" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
              filter === tab.key
                ? "bg-[#145f55] text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200/70 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {(mutation.isError || execute.isError) && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{execute.error?.message ?? mutation.error?.message ?? "Could not update action."}</span>
        </div>
      )}

      {q.isLoading ? (
        <div className="card p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
          Loading governance action queue...
        </div>
      ) : q.isError ? (
        <div className="p-8 text-center text-xs text-rose-600 bg-rose-50/50 rounded-2xl border border-rose-200">
          Could not load actions.
        </div>
      ) : filteredItems.length ? (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item) => (
              <ActionCard
                key={item.id}
                item={item}
                busy={mutation.isPending || execute.isPending}
                onDecision={(id, decision) => mutation.mutate({ id, decision })}
                onExecute={(id) => execute.mutate(id)}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="card p-12 text-center flex flex-col items-center justify-center space-y-2 bg-white rounded-2xl border border-slate-200 text-slate-400">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
            <Inbox className="w-5 h-5" />
          </div>
          <div className="text-xs font-semibold text-slate-600">
            {filter === "ALL" ? "No actions currently require review." : "No actions match this filter."}
          </div>
        </div>
      )}
    </div>
  );
}
