"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { useToken } from "@/lib/auth-context";
import { importCSV, previewFile, requiredColumns, type ImportKind } from "@/services/imports.service";
import { PDFReview } from "@/features/imports/pdf-review";

const kinds: { value: ImportKind; label: string }[] = [
  { value: "products", label: "Products" },
  { value: "customers", label: "Customers" },
  { value: "suppliers", label: "Suppliers" },
  { value: "invoices", label: "Invoices" },
  { value: "inventory_transactions", label: "Inventory transactions" },
  { value: "purchase_orders", label: "Purchase orders" },
  { value: "sales", label: "Sales" },
  { value: "payments", label: "Payments" },
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
    onSuccess: () => { queryClient.invalidateQueries(); },
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

  return <>
    <PageHeader title="Import data" description="Map CSV or XLSX columns to business fields. Rows are validated before the transaction commits." />
    <div className="card section-card stack" style={{ maxWidth: 650 }}>
      <label>Data type
        <select className="input" value={kind} onChange={e => { setKind(e.target.value as ImportKind); setMapping({}); }}>
          {kinds.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </label>
      <label>CSV or XLSX file
        <input className="input" type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={e => void choose(e.target.files?.[0] ?? null)} />
      </label>
      {previewError && <p role="alert">{previewError}</p>}
      {file && headers.length > 0 && <>
        <h2 className="section-title" style={{ marginBottom: 0 }}>Column mapping</h2>
        {requiredColumns[kind].map(field => <label key={field}>{field}
          <select className="input" value={mapping[field] ?? field} onChange={e => setMapping({ ...mapping, [field]: e.target.value })}>
            <option value={field}>{field}</option>
            {headers.filter(header => header !== field).map(header => <option key={header} value={header}>{header}</option>)}
          </select>
        </label>)}
      </>}
      {["invoices", "sales", "purchase_orders"].includes(kind) && <p style={{ color: "var(--muted)", fontSize: 12 }}>Customer and supplier IDs must belong to this workspace. Import products, customers, and suppliers first.</p>}
      {mutation.isError && <p role="alert" style={{ color: "#a22b24" }}>{mutation.error.message}</p>}
      {mutation.data && <p role="status">Imported {mutation.data.imported} {mutation.data.type} rows.</p>}
      <button className="button primary" disabled={!file || !headers.length || mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? "Importing…" : "Import file"}</button>
    </div>
    <div style={{ height: 24 }} />
    <PDFReview />
  </>;
}
