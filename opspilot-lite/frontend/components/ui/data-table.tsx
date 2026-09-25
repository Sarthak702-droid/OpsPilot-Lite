"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Inbox, Filter } from "lucide-react";

export type Column<T> = {
  label: string;
  render: (item: T) => React.ReactNode;
  searchKey?: (item: T) => string;
};

interface DataTableProps<T extends { id: string }> {
  items: T[];
  columns: Column<T>[];
  empty: string;
  searchPlaceholder?: string;
  enableSearch?: boolean;
}

export function DataTable<T extends { id: string }>({
  items,
  columns,
  empty,
  searchPlaceholder = "Filter records...",
  enableSearch = true,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const query = search.toLowerCase();
    return items.filter((item) => {
      // Check column search keys or stringified fields
      for (const col of columns) {
        if (col.searchKey) {
          if (col.searchKey(item).toLowerCase().includes(query)) return true;
        }
      }
      return JSON.stringify(item).toLowerCase().includes(query);
    });
  }, [items, columns, search]);

  return (
    <div className="card rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden space-y-0">
      {/* Table Toolbar if enableSearch or count */}
      {items.length > 0 && enableSearch && (
        <div className="p-3.5 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/50">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-8 pl-8 pr-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#145f55] focus:ring-2 focus:ring-[#145f55]/10 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px]">
              {filteredItems.length} of {items.length} records
            </span>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="table-wrap">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {columns.map((c) => (
                <th key={c.label} className="py-3 px-4">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item, index) => (
                <motion.tr
                  key={item.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15, delay: Math.min(index * 0.02, 0.25) }}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  {columns.map((c) => (
                    <td key={c.label} className="py-3.5 px-4 whitespace-nowrap">
                      {c.render(item)}
                    </td>
                  ))}
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>

        {filteredItems.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-12 text-center flex flex-col items-center justify-center space-y-2 text-slate-400"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
              <Inbox className="w-5 h-5" />
            </div>
            <div className="text-xs font-medium text-slate-600">
              {search ? "No matching records found." : empty}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
