"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, DollarSign, Clock, AlertTriangle, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, type Column } from "@/components/ui/data-table";
import { useToken } from "@/lib/auth-context";
import { getCustomers } from "@/services/customers.service";
import { date, money } from "@/lib/utils";
import type { Customer } from "@/types/api";

const columns: Column<Customer>[] = [
  {
    label: "Customer Account",
    render: (x) => (
      <div className="space-y-0.5">
        <div className="font-bold text-slate-900">{x.business_name || x.name}</div>
        <div className="text-[11px] text-slate-400">{x.email || "No email listed"}</div>
      </div>
    ),
    searchKey: (x) => `${x.business_name} ${x.name} ${x.email}`,
  },
  {
    label: "Account ID",
    render: (x) => <code className="text-[10px] font-mono text-slate-400">{x.id.slice(0, 8)}...</code>,
  },
  {
    label: "Lifetime Value",
    render: (x) => <span className="font-bold text-slate-900 font-mono">{money(x.lifetime_revenue)}</span>,
  },
  {
    label: "Outstanding",
    render: (x) => (
      <span className={`font-bold font-mono ${Number(x.outstanding) > 0 ? "text-amber-700" : "text-slate-600"}`}>
        {money(x.outstanding)}
      </span>
    ),
  },
  {
    label: "Overdue Invoices",
    render: (x) =>
      x.overdue_invoice_count > 0 ? (
        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200/60">
          {x.overdue_invoice_count} overdue
        </span>
      ) : (
        <span className="text-slate-400 text-xs">0</span>
      ),
  },
  {
    label: "Payment Delay",
    render: (x) =>
      x.average_payment_delay_days == null ? (
        <span className="text-slate-400">—</span>
      ) : (
        <span className={`font-semibold ${x.average_payment_delay_days > 7 ? "text-amber-600" : "text-slate-600"}`}>
          {x.average_payment_delay_days.toFixed(1)} days
        </span>
      ),
  },
  {
    label: "Last Activity",
    render: (x) => (
      <div className="text-[11px] text-slate-500 space-y-0.5">
        <div>Paid: {x.last_payment_date ? date(x.last_payment_date) : "—"}</div>
        <div className="text-slate-400">Order: {x.last_purchase ? date(x.last_purchase) : "—"}</div>
      </div>
    ),
  },
];

export function CustomersView() {
  const token = useToken();
  const q = useQuery({
    queryKey: ["customers"],
    queryFn: async () => getCustomers(await token()),
  });

  const items = useMemo(() => q.data?.items ?? [], [q.data?.items]);

  const totals = useMemo(() => {
    return {
      totalCustomers: items.length,
      totalOutstanding: items.reduce((acc, c) => acc + Number(c.outstanding || 0), 0),
      totalOverdueCount: items.reduce((acc, c) => acc + (c.overdue_invoice_count || 0), 0),
    };
  }, [items]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Accounts & Receivables"
        description="Monitor customer payment cadence, outstanding ledger balances, and collection risk signals."
      />

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Accounts</div>
            <div className="text-xl font-black text-slate-900 mt-0.5">{totals.totalCustomers}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Outstanding</div>
            <div className="text-xl font-black text-slate-900 mt-0.5 font-mono">{money(totals.totalOutstanding)}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Overdue Invoices</div>
            <div className="text-xl font-black text-rose-700 mt-0.5 font-mono">{totals.totalOverdueCount}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {q.isLoading ? (
        <div className="card p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
          Loading customer directory...
        </div>
      ) : q.isError ? (
        <div className="p-8 text-center text-xs text-rose-600 bg-rose-50/50 rounded-2xl border border-rose-200">
          Could not load customers.
        </div>
      ) : (
        <DataTable
          items={items}
          columns={columns}
          empty="No customer accounts found. Import customers via CSV or record your first sale."
          searchPlaceholder="Search customer names, emails..."
        />
      )}
    </div>
  );
}
