"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Database,
  FileCheck2,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { useToken } from "@/lib/auth-context";
import { importCSV, previewFile, requiredColumns, type ImportKind } from "@/services/imports.service";
import { PDFReview } from "@/features/imports/pdf-review";

const kinds: { value: ImportKind; label: string; icon: string }[] = [
  { value: "products", label: "Products", icon: "📦" },
  { value: "customers", label: "Customers", icon: "👥" },
  { value: "suppliers", label: "Suppliers", icon: "🚚" },
  { value: "invoices", label: "Invoices", icon: "📄" },
  { value: "inventory_transactions", label: "Inventory Logs", icon: "📊" },
  { value: "purchase_orders", label: "Purchase Orders", icon: "📋" },
  { value: "sales", label: "Sales Orders", icon: "🛒" },
  { value: "payments", label: "Payments", icon: "💳" },
];

export function ImportView() {
  const [kind, setKind] = useState<ImportKind>("products");
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewError, setPreviewError] = useState("");
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const token = useToken();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Choose a file");
      return importCSV(await token(), kind, file, mapping);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });

  async function choose(next: File | null) {
    setFile(next);
    setHeaders([]);
    setMapping({});
    setPreviewError("");
    if (!next) return;
    try {
      const preview = await previewFile(await token(), next);
      setHeaders(preview.headers);
    } catch {
      setPreviewError("Could not read file headers.");
    }
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        title="Import Data & Document Parser"
        description="Ingest commercial spreadsheets (CSV/XLSX) with schema mapping, or process PDF delivery challans with OCR."
      />

      {/* Main CSV / XLSX Importer Card */}
      <div className="card p-6 md:p-8 rounded-2xl border border-slate-200/90 bg-white shadow-sm space-y-6">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Spreadsheet Batch Ingestion</h2>
            <p className="text-xs text-slate-500">Atomic database transaction with row-level validation</p>
          </div>
        </div>

        {/* Target Entity Selector */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
            Target Dataset Schema
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {kinds.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  setKind(item.value);
                  setMapping({});
                }}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                  kind === item.value
                    ? "bg-[#145f55] text-white border-[#145f55] shadow-xs"
                    : "bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100"
                }`}
              >
                <span>{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Dropzone File Input */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
            Upload CSV or XLSX File
          </label>
          <div className="relative border-2 border-dashed border-slate-200 hover:border-emerald-600/50 bg-slate-50/50 hover:bg-emerald-50/30 rounded-2xl p-6 text-center transition-all cursor-pointer">
            <input
              type="file"
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => void choose(e.target.files?.[0] ?? null)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center space-y-2">
              <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs text-emerald-700">
                <Upload className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-slate-800">
                {file ? file.name : "Click to select or drag and drop spreadsheet"}
              </div>
              <p className="text-[11px] text-slate-400">
                {file ? `${(file.size / 1024).toFixed(1)} KB` : "Supports .csv and .xlsx up to 50MB"}
              </p>
            </div>
          </div>
        </div>

        {previewError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {previewError}
          </div>
        )}

        {/* Column Mapping Section */}
        {file && headers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 pt-2 border-t border-slate-100"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Field Mapping Verification
              </h3>
              <span className="text-[11px] text-slate-400">
                Map spreadsheet columns to system attributes
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {requiredColumns[kind].map((field) => (
                <div key={field} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <div className="text-[11px] font-bold text-slate-700 font-mono">{field}</div>
                  <select
                    className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:border-[#145f55] outline-none"
                    value={mapping[field] ?? field}
                    onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}
                  >
                    <option value={field}>Auto-mapped ({field})</option>
                    {headers
                      .filter((header) => header !== field)
                      .map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                  </select>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {["invoices", "sales", "purchase_orders"].includes(kind) && (
          <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
            Note: Customer and supplier records must already exist in this workspace. Import products, customers, and suppliers before transactional ledgers.
          </p>
        )}

        {mutation.isError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {mutation.error.message}
          </div>
        )}

        {mutation.data && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Successfully committed <strong>{mutation.data.imported}</strong> rows into the{" "}
              <strong>{mutation.data.type}</strong> database table.
            </span>
          </div>
        )}

        <button
          className="w-full h-11 rounded-xl bg-[#145f55] hover:bg-[#0e4d45] disabled:opacity-50 text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2"
          disabled={!file || !headers.length || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Validating & Committing Rows...</span>
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              <span>Commit & Ingest Data</span>
            </>
          )}
        </button>
      </div>

      {/* PDF OCR Intelligent Review */}
      <PDFReview />
    </div>
  );
}
