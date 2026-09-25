"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Truck, Clock, Award, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { useToken } from "@/lib/auth-context";
import { getSuppliers } from "@/services/suppliers.service";
import type { Supplier } from "@/types/api";

const columns: Column<Supplier>[] = [
  {
    label: "Vendor / Supplier",
    render: (x) => (
      <div className="space-y-0.5">
        <strong className="text-slate-900 font-bold block">{x.name}</strong>
        <code className="text-[10px] text-slate-400 font-mono">{x.id.slice(0, 8)}...</code>
      </div>
    ),
    searchKey: (x) => x.name,
  },
  {
    label: "Fulfilled Orders",
    render: (x) => <span className="font-bold text-slate-800 font-mono">{x.orders}</span>,
  },
  {
    label: "Lead Time",
    render: (x) => <span className="font-medium text-slate-700">{x.lead_time_days.toFixed(1)} days</span>,
  },
  {
    label: "On-Time Rate",
    render: (x) => {
      if (!x.delivered) return <span className="text-slate-400">—</span>;
      const isGood = x.on_time_rate >= 90;
      return (
        <span className={`font-bold font-mono ${isGood ? "text-emerald-700" : "text-amber-700"}`}>
          {x.on_time_rate.toFixed(0)}%
        </span>
      );
    },
  },
  {
    label: "Avg. Delivery",
    render: (x) =>
      x.average_delivery_days == null ? (
        <span className="text-slate-400">—</span>
      ) : (
        <span className="text-slate-600 font-mono">{x.average_delivery_days.toFixed(1)}d</span>
      ),
  },
  {
    label: "Avg. Delay",
    render: (x) =>
      x.average_delay_days == null ? (
        <span className="text-slate-400">—</span>
      ) : (
        <span className={`font-mono ${x.average_delay_days > 2 ? "text-rose-600 font-bold" : "text-slate-600"}`}>
          +{x.average_delay_days.toFixed(1)}d
        </span>
      ),
  },
  {
    label: "Completion",
    render: (x) =>
      x.orders ? (
        <span className="text-slate-700 font-semibold">{x.order_completion_rate.toFixed(0)}%</span>
      ) : (
        <span className="text-slate-400">—</span>
      ),
  },
  {
    label: "Price Variance",
    render: (x) =>
      x.price_variance == null ? (
        <span className="text-slate-400">—</span>
      ) : (
        <span className={`font-mono ${x.price_variance > 5 ? "text-amber-700" : "text-slate-600"}`}>
          {x.price_variance.toFixed(1)}%
        </span>
      ),
  },
  {
    label: "Reliability Risk",
    render: (x) =>
      x.risk === "INSUFFICIENT_DATA" ? (
        <span className="text-[11px] text-slate-400 italic">Evaluating</span>
      ) : (
        <Badge value={x.risk} />
      ),
  },
];

export function SuppliersView() {
  const token = useToken();
  const q = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => getSuppliers(await token()),
  });

  const items = useMemo(() => q.data?.items ?? [], [q.data?.items]);

  const metrics = useMemo(() => {
    const withDelivery = items.filter((x) => x.delivered > 0);
    const avgOnTime =
      withDelivery.length > 0
        ? withDelivery.reduce((acc, x) => acc + x.on_time_rate, 0) / withDelivery.length
        : 0;
    const avgLeadTime =
      items.length > 0 ? items.reduce((acc, x) => acc + x.lead_time_days, 0) / items.length : 0;

    return {
      count: items.length,
      avgOnTime,
      avgLeadTime,
    };
  }, [items]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suppliers & Vendor Reliability"
        description="Historical procurement fulfillment data, delivery lead times, and SLA variance tracking."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Vendors</div>
            <div className="text-xl font-black text-slate-900 mt-0.5">{metrics.count}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Average On-Time Rate</div>
            <div className="text-xl font-black text-emerald-700 mt-0.5 font-mono">
              {metrics.avgOnTime > 0 ? `${metrics.avgOnTime.toFixed(0)}%` : "—"}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-teal-50 text-teal-700">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Average Lead Time</div>
            <div className="text-xl font-black text-slate-900 mt-0.5 font-mono">
              {metrics.avgLeadTime.toFixed(1)} days
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {q.isLoading ? (
        <div className="card p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
          Loading supplier reliability metrics...
        </div>
      ) : q.isError ? (
        <div className="p-8 text-center text-xs text-rose-600 bg-rose-50/50 rounded-2xl border border-rose-200">
          Could not load suppliers.
        </div>
      ) : (
        <DataTable
          items={items}
          columns={columns}
          empty="No supplier records found. Import suppliers or issue your first purchase order."
          searchPlaceholder="Search vendor names..."
        />
      )}
    </div>
  );
}
