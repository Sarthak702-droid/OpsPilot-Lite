"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  Zap,
  TrendingUp,
  AlertTriangle,
  Package,
  Activity,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { useToken } from "@/lib/auth-context";
import { getDashboard } from "@/services/dashboard.service";
import { getSignals } from "@/services/signals.service";
import { getRecommendations } from "@/services/recommendations.service";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PriorityList } from "@/components/dashboard/priority-list";
import { SignalSummary } from "@/components/dashboard/signal-summary";
import { PageHeader } from "@/components/layout/page-header";
import { money } from "@/lib/utils";

export function DashboardView() {
  const token = useToken();
  const dashboard = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => getDashboard(await token()),
  });
  const signals = useQuery({
    queryKey: ["signals"],
    queryFn: async () => getSignals(await token()),
  });
  const recommendations = useQuery({
    queryKey: ["recommendations"],
    queryFn: async () => getRecommendations(await token()),
  });

  if (dashboard.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Overview"
          description="Operational risks and decisions, updated from business data."
        />
        {/* Metric Skeletons */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-4 rounded-xl border border-slate-200/60 bg-white space-y-3">
              <div className="h-3 w-16 rounded auth-shimmer" />
              <div className="h-7 w-24 rounded-lg auth-shimmer" />
            </div>
          ))}
        </div>
        {/* Section Grid Skeleton */}
        <div className="section-grid">
          <div className="card p-6 rounded-2xl border border-slate-200/60 bg-white h-72 auth-shimmer" />
          <div className="card p-6 rounded-2xl border border-slate-200/60 bg-white h-72 auth-shimmer" />
        </div>
      </div>
    );
  }

  if (dashboard.isError || !dashboard.data) {
    return (
      <div className="p-12 text-center text-xs text-rose-600 bg-rose-50/50 rounded-2xl border border-rose-200">
        Could not load operational dashboard. Please ensure backend services are running.
      </div>
    );
  }

  const x = dashboard.data;

  return (
    <div className="space-y-6">
      {/* Top Header with live status badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Overview"
          description="Real-time operational health, inventory risks, and pending approval workflows."
        />

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href="/ask"
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#145f55] to-teal-700 hover:from-[#0e4d45] hover:to-teal-800 text-white font-semibold text-xs shadow-xs hover:shadow-md transition-all flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-200 animate-spin" style={{ animationDuration: "4s" }} />
            <span>Ask Copilot</span>
          </Link>
          <Link
            href="/actions"
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-2xs transition-all flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
            <span>Action Center ({x.pending_actions})</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3"
      >
        <MetricCard label="Revenue · 30 days" value={money(x.revenue_30d)} note="Settled invoices" />
        <MetricCard label="Outstanding" value={money(x.outstanding)} note="Receivable buffer" />
        <MetricCard label="Overdue" value={money(x.overdue)} note="Requires collection" />
        <MetricCard label="Low stock" value={String(x.low_stock)} note="Under lead time" />
        <MetricCard label="Critical alerts" value={String(x.critical_alerts)} note="Needs resolution" />
        <MetricCard label="Pending actions" value={String(x.pending_actions)} note="Maker-Checker queue" />
      </motion.div>

      {/* Main Two-column Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Today's Priorities */}
        <motion.section
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="lg:col-span-7 card p-5 md:p-6 rounded-2xl border border-slate-200/90 bg-white shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-700" />
              <h2 className="text-sm font-bold text-slate-900">Today&apos;s High-Priority Signals</h2>
            </div>
            <Link
              href="/signals"
              className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <PriorityList items={x.priorities} />
        </motion.section>

        {/* Risk Distribution Chart */}
        <motion.section
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="lg:col-span-5 card p-5 md:p-6 rounded-2xl border border-slate-200/90 bg-white shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Active Operational Exposure</h2>
            <span className="text-[11px] font-semibold text-slate-400">By Domain</span>
          </div>

          <SignalSummary signals={signals.data?.items ?? []} />
        </motion.section>
      </div>

      {/* Grounded AI Recommendations Bar */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="card p-5 md:p-6 rounded-2xl border border-slate-200/90 bg-white shadow-xs space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-600" />
            <h2 className="text-sm font-bold text-slate-900">Latest Grounded Recommendations</h2>
          </div>
          <Link
            href="/ask"
            className="text-[11px] font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1"
          >
            <span>Ask OpsPilot</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {recommendations.data?.items.length ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            {recommendations.data.items.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl border border-teal-100 bg-teal-50/40 hover:bg-teal-50/80 transition-colors space-y-1.5"
              >
                <div className="text-xs font-bold text-slate-900">{item.recommendation.title}</div>
                <div className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                  {item.recommendation.reason}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-500 flex items-center justify-between">
            <span>No AI recommendations generated yet. Query the Copilot to trigger grounded recommendations.</span>
            <Link
              href="/ask"
              className="text-xs font-semibold text-[#145f55] hover:underline shrink-0"
            >
              Start inquiry →
            </Link>
          </div>
        )}
      </motion.section>
    </div>
  );
}
