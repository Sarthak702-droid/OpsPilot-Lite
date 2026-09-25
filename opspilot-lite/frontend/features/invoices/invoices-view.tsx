"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, DollarSign, Clock, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { useToken } from "@/lib/auth-context";
import { getInvoices } from "@/services/invoices.service";
import { date, money } from "@/lib/utils";
import type { Invoice } from "@/types/api";

const columns: Column<Invoice>[] = [
  {
    label: "Invoice #",
    render: (x) => <span className="font-mono font-bold text-slate-900">{x.invoice_number}</span>,
    searchKey: (x) => `${x.invoice_number} ${x.customer}`,
  },
  {
    label: "Customer Account",
    render: (x) => <span className="font-semibold text-slate-800">{x.customer}</span>,
  },
  {
    label: "Issued Date",
    render: (x) => <span className="text-slate-500 font-mono text-[11px]">{date(x.invoice_date)}</span>,
  },
  {
    label: "Due Date",
    render: (x) => {
      const isPastDue = x.outstanding > 0 && new Date(x.due_date) < new Date();
      return (
        <span className={`font-mono text-[11px] ${isPastDue ? "text-rose-600 font-bold" : "text-slate-500"}`}>
          {date(x.due_date)}
        </span>
      );
    },
  },
  {
    label: "Billed Total",
    render: (x) => <span className="font-bold font-mono text-slate-900">{money(x.total)}</span>,
  },
  {
    label: "Settled",
    render: (x) => <span className="font-mono text-emerald-700 font-semibold">{money(x.paid)}</span>,
  },
  {
    label: "Outstanding",
    render: (x) => (
      <span className={`font-mono font-bold ${x.outstanding > 0 ? "text-amber-700" : "text-slate-400"}`}>
        {money(x.outstanding)}
      </span>
    ),
  },
  {
    label: "Invoice Status",
    render: (x) => <Badge value={x.status} />,
  },
  {
    label: "Collection Risk",
    render: (x) => (x.outstanding > 0 && x.days_overdue > 0 ? <Badge value={x.risk} /> : <span className="text-slate-400 text-xs">—</span>),
  },
];

export function InvoicesView() {
  const token = useToken();
  const [filter, setFilter] = useState<string>("ALL");

  const q = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => getInvoices(await token()),
  });

  const items = useMemo(() => q.data?.items ?? [], [q.data?.items]);

  const filteredItems = useMemo(() => {
    if (filter === "ALL") return items;
    if (filter === "PAID") return items.filter((x) => x.status === "PAID");
    if (filter === "PENDING") return items.filter((x) => x.status === "PENDING" || x.status === "PARTIAL");
    if (filter === "OVERDUE") return items.filter((x) => x.outstanding > 0 && x.days_overdue > 0);
    return items;
  }, [items, filter]);

  const totals = useMemo(() => {
    return {
      totalBilled: items.reduce((acc, x) => acc + x.total, 0),
      totalPaid: items.reduce((acc, x) => acc + x.paid, 0),
      totalOutstanding: items.reduce((acc, x) => acc + x.outstanding, 0),
    };
  }, [items]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices & Receivables Ledger"
        description="Track commercial customer invoices, payment allocations, and overdue collection exposure."
      />

      {/* KPI Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Billed</div>
            <div className="text-xl font-black text-slate-900 mt-0.5 font-mono">{money(totals.totalBilled)}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Collected Revenue</div>
            <div className="text-xl font-black text-emerald-700 mt-0.5 font-mono">{money(totals.totalPaid)}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Ledger</div>
            <div className="text-xl font-black text-amber-700 mt-0.5 font-mono">{money(totals.totalOutstanding)}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { key: "ALL", label: "All Invoices" },
          { key: "PENDING", label: "Pending Collection" },
          { key: "OVERDUE", label: "Overdue" },
          { key: "PAID", label: "Settled / Paid" },
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

      {q.isLoading ? (
        <div className="card p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
          Loading commercial invoices...
        </div>
      ) : q.isError ? (
        <div className="p-8 text-center text-xs text-rose-600 bg-rose-50/50 rounded-2xl border border-rose-200">
          Could not load invoices.
        </div>
      ) : (
        <DataTable
          items={filteredItems}
          columns={columns}
          empty="No invoice records found matching criteria."
          searchPlaceholder="Search invoice numbers, customer names..."
        />
      )}
    </div>
  );
}
