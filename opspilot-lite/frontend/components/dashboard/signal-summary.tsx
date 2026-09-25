"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import type { Signal } from "@/types/api";

export function SignalSummary({ signals }: { signals: Signal[] }) {
  const groups = [
    { name: "Inventory", types: ["STOCKOUT_RISK", "OVERSTOCK"], color: "#10b981" },
    { name: "Receivables", types: ["PAYMENT_OVERDUE", "HIGH_VALUE_PAYMENT_PENDING"], color: "#0ea5e9" },
    { name: "Suppliers", types: ["SUPPLIER_DELAY"], color: "#f59e0b" },
  ];

  const data = groups.map((g) => ({
    name: g.name,
    count: signals.filter((s) => g.types.includes(s.signal_type)).length,
    color: g.color,
  }));

  const totalRisks = data.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Active categorized risks</span>
        <span className="font-bold text-slate-900">{totalRisks} active signals</span>
      </div>

      <div className="h-[210px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -25 }}>
            <CartesianGrid stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#64748b", fontSize: 11, fontWeight: 500 }}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#94a3b8", fontSize: 11 }}
            />
            <Tooltip
              cursor={{ fill: "rgba(241, 245, 249, 0.6)" }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div className="p-2.5 rounded-lg bg-slate-900 text-white shadow-xl text-xs space-y-1">
                      <div className="font-bold">{item.name}</div>
                      <div className="text-emerald-400 font-mono">{item.count} risk signals</div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
