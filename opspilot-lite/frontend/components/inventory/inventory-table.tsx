"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Package, AlertTriangle, ArrowUpDown, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { InventoryItem } from "@/types/api";

export function InventoryTable({ items }: { items: InventoryItem[] }) {
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<string>("ALL");

  const filteredItems = useMemo(() => {
    return items.filter((x) => {
      const matchesSearch =
        x.name.toLowerCase().includes(search.toLowerCase()) ||
        x.sku.toLowerCase().includes(search.toLowerCase());

      const matchesRisk =
        riskFilter === "ALL" ||
        (riskFilter === "CRITICAL" && (x.risk === "CRITICAL" || x.risk === "HIGH")) ||
        (riskFilter === "LOW_STOCK" && x.metrics.StockDaysRemaining <= x.metrics.SupplierLeadTime) ||
        (riskFilter === "HEALTHY" && (x.risk === "LOW" || x.risk === "INFO"));

      return matchesSearch && matchesRisk;
    });
  }, [items, search, riskFilter]);

  return (
    <div className="card rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden space-y-0">
      {/* Interactive Toolbar */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search products or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-8 pl-8 pr-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#145f55] focus:ring-2 focus:ring-[#145f55]/10 transition-all"
          />
        </div>

        {/* Quick Filter Tabs */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto w-full sm:w-auto">
          {["ALL", "CRITICAL", "LOW_STOCK", "HEALTHY"].map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setRiskFilter(tag)}
              className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-all ${
                riskFilter === tag
                  ? "bg-[#145f55] text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200/70 hover:bg-slate-100/70"
              }`}
            >
              {tag.replace("_", " ")}
            </button>
          ))}
          <span className="text-[11px] text-slate-400 font-semibold ml-2">
            ({filteredItems.length})
          </span>
        </div>
      </div>

      {/* Main Table */}
      <div className="table-wrap">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">Product</th>
              <th className="py-3 px-4">SKU</th>
              <th className="py-3 px-4">Stock</th>
              <th className="py-3 px-4">7D Sales</th>
              <th className="py-3 px-4">Coverage</th>
              <th className="py-3 px-4">Lead Time</th>
              <th className="py-3 px-4">Reorder Pt</th>
              <th className="py-3 px-4">Rec. Order</th>
              <th className="py-3 px-4">Risk Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            <AnimatePresence mode="popLayout">
              {filteredItems.map((x, index) => {
                const daysLeft =
                  x.metrics.AverageDailySales7D > 0
                    ? x.metrics.StockDaysRemaining.toFixed(1)
                    : "—";
                const isUnderLeadTime =
                  x.metrics.AverageDailySales7D > 0 &&
                  x.metrics.StockDaysRemaining <= x.metrics.SupplierLeadTime;

                return (
                  <motion.tr
                    key={x.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15, delay: Math.min(index * 0.02, 0.25) }}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-bold text-slate-900">{x.name}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">{x.sku}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-800 font-mono">
                      {x.metrics.Stock}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{x.metrics.Sales7D}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-semibold ${
                          isUnderLeadTime ? "text-rose-600 font-bold" : "text-slate-700"
                        }`}
                      >
                        {daysLeft} {daysLeft !== "—" ? "days" : ""}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {x.metrics.SupplierLeadTime.toFixed(0)}d
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {x.metrics.ReorderPoint.toFixed(0)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-700 font-mono">
                      {x.metrics.RecommendedOrderQuantity.toFixed(0)}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge value={x.risk} />
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>

        {filteredItems.length === 0 && (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-2 text-slate-400">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
              <Package className="w-5 h-5" />
            </div>
            <div className="text-xs font-medium text-slate-600">
              {search || riskFilter !== "ALL"
                ? "No matching inventory items found."
                : "No products imported yet."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
