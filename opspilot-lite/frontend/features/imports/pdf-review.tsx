"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToken } from "@/lib/auth-context";
import { commitPDF, previewPDF, type DocumentReview, type DocumentType, type DocumentPreview } from "@/services/imports.service";
import { getCustomers } from "@/services/customers.service";
import { getSuppliers } from "@/services/suppliers.service";

const blank: DocumentReview = { document_type: "INVOICE", document_number: "", document_date: "", due_date: "", counterparty_name: "", counterparty_id: "", total_amount: "" };

export function PDFReview() {
  const token = useToken();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<DocumentPreview | null>(null);
  const [review, setReview] = useState<DocumentReview>(blank);
  const customers = useQuery({ queryKey: ["customers"], queryFn: async () => getCustomers(await token()), enabled: !!preview && review.document_type === "INVOICE" });
  const suppliers = useQuery({ queryKey: ["suppliers"], queryFn: async () => getSuppliers(await token()), enabled: !!preview && review.document_type === "PURCHASE_ORDER" });

  function cleanAmount(val: string): string {
    return val.replace(/[^0-9.]/g, "");
  }

  const inspect = useMutation({
    mutationFn: async (next: File) => previewPDF(await token(), next),
    onSuccess: result => {
      const extracted = result.extracted
        ? {
            ...result.extracted,
            total_amount: cleanAmount(result.extracted.total_amount || ""),
          }
        : {};
      setPreview(result);
      setReview({ ...blank, ...extracted });
    },
  });
  const save = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Choose a PDF");
      const cleanedReview = {
        ...review,
        total_amount: cleanAmount(review.total_amount),
      };
      return commitPDF(await token(), file, cleanedReview);
    },
    onSuccess: () => { queryClient.invalidateQueries(); setFile(null); setPreview(null); setReview(blank); },
  });

  function update<K extends keyof DocumentReview>(key: K, value: DocumentReview[K]) {
    setReview(previous => ({ ...previous, [key]: value }));
  }

  return <div className="card section-card stack" style={{ maxWidth: 650 }}>
    <div><h2 className="section-title">Review a PDF document</h2><p style={{ color: "var(--muted)" }}>Text is extracted locally. MiMo may suggest fields when available; review every field before saving.</p></div>
    <label>PDF file<input className="input" type="file" accept="application/pdf,.pdf" onChange={event => {
      const next = event.target.files?.[0] ?? null;
      setFile(next); setPreview(null); setReview(blank); save.reset(); inspect.reset();
      if (next) inspect.mutate(next);
    }} /></label>
    {inspect.isPending && <p role="status">Reading document…</p>}
    {inspect.isError && <p role="alert" style={{ color: "#a22b24" }}>{inspect.error.message}</p>}
    {preview && <>
      <p style={{ color: "var(--muted)", fontSize: 13 }}>{preview.source === "mimo" ? "MiMo suggested fields. Verify them against the source." : "Fill fields from the source document."}</p>
      <div className="card" style={{ padding: 12, whiteSpace: "pre-wrap", maxHeight: 180, overflow: "auto", fontSize: 12 }} aria-label="Extracted PDF text">{preview.text_excerpt}</div>
      <label>Document type<select className="input" value={review.document_type} onChange={e => setReview(previous => ({ ...previous, document_type: e.target.value as DocumentType, counterparty_id: "" }))}><option value="INVOICE">Invoice</option><option value="PURCHASE_ORDER">Purchase order</option><option value="QUOTATION">Quotation</option></select></label>
      <label>Document number<input className="input" value={review.document_number} onChange={e => update("document_number", e.target.value)} /></label>
      <label>Document date<input className="input" type="date" value={review.document_date} onChange={e => update("document_date", e.target.value)} /></label>
      <label>{review.document_type === "INVOICE" ? "Due date" : "Expected delivery date (optional)"}<input className="input" type="date" value={review.due_date} onChange={e => update("due_date", e.target.value)} /></label>
      <label>Counterparty name from document<input className="input" value={review.counterparty_name} onChange={e => update("counterparty_name", e.target.value)} /></label>
      {review.document_type === "INVOICE" && <label>Customer<select className="input" value={review.counterparty_id} onChange={e => update("counterparty_id", e.target.value)}><option value="">Select customer</option>{customers.data?.items.map(item => <option key={item.id} value={item.id}>{item.business_name || item.name}</option>)}</select></label>}
      {review.document_type === "PURCHASE_ORDER" && <label>Supplier<select className="input" value={review.counterparty_id} onChange={e => update("counterparty_id", e.target.value)}><option value="">Select supplier</option>{suppliers.data?.items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
      <label>
        Total amount
        <input
          className="input"
          inputMode="decimal"
          value={review.total_amount}
          onChange={e => update("total_amount", e.target.value)}
          onBlur={e => update("total_amount", cleanAmount(e.target.value))}
          placeholder="e.g. 120000"
        />
        <span style={{ fontSize: 11, color: "var(--muted)", display: "block", marginTop: 2 }}>
          Numerical value only (e.g. 120000). Currency prefixes and commas are automatically stripped on save.
        </span>
      </label>
      <p style={{ color: "var(--muted)", fontSize: 12 }}>Saving creates an invoice or draft purchase order for the selected workspace. Quotations are stored as reviewed documents.</p>
      {save.isError && <p role="alert" style={{ color: "#a22b24" }}>{save.error.message}</p>}
      <button className="button primary" disabled={save.isPending || !review.document_number || !review.document_date || !review.total_amount || (review.document_type !== "QUOTATION" && !review.counterparty_id) || (review.document_type === "INVOICE" && !review.due_date)} onClick={() => save.mutate()}>{save.isPending ? "Saving…" : "Confirm and save document"}</button>
    </>}
    {save.data && <p role="status">Document saved and audited.</p>}
  </div>;
}
