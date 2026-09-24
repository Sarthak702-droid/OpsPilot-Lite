import { env } from "@/lib/env";
import { ApiError } from "@/lib/api-client";
export type ImportKind = "products" | "customers" | "suppliers" | "invoices" | "inventory_transactions" | "purchase_orders" | "sales" | "payments";
export const requiredColumns: Record<ImportKind, string[]> = { products: ["sku", "name", "current_stock"], customers: ["name"], suppliers: ["name"], invoices: ["customer_id", "invoice_number", "invoice_date", "due_date", "total"], inventory_transactions: ["source_id","product_sku","transaction_type","quantity","timestamp"], purchase_orders: ["supplier_id","po_number","order_date","expected_delivery_date","status"], sales: ["source_id","customer_id","sale_date","total_amount"], payments: ["reference_number","invoice_number","payment_date","amount"] };
export async function importCSV(token: string | null, kind: ImportKind, file: File, mapping: Record<string, string>) { const form = new FormData(); form.set("type", kind); form.set("file", file); form.set("mapping", JSON.stringify(mapping)); const response = await fetch(`${env.apiUrl}/api/import`, { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form }); if (!response.ok) { const body = await response.json().catch(() => null) as { error?: { message?: string } } | null; throw new ApiError(response.status, body?.error?.message ?? response.statusText); } return response.json() as Promise<{ imported: number; type: string }>; }
export async function previewFile(token: string | null, file: File) { const form = new FormData(); form.set("file",file); const response = await fetch(`${env.apiUrl}/api/import/preview`, {method:"POST",headers:token?{Authorization:`Bearer ${token}`}:{},body:form}); if(!response.ok){throw new ApiError(response.status,"Could not read file headers")}; return response.json() as Promise<{headers:string[];sample:string[][]}>; }

export type DocumentType = "INVOICE" | "PURCHASE_ORDER" | "QUOTATION";
export type DocumentReview = { document_type: DocumentType; document_number: string; document_date: string; due_date: string; counterparty_name: string; counterparty_id: string; total_amount: string };
export type DocumentPreview = { source: "manual" | "mimo"; text_excerpt: string; extracted?: Omit<DocumentReview, "counterparty_id"> };

async function pdfRequest<T>(token: string | null, path: string, file: File, review?: DocumentReview): Promise<T> {
  const form = new FormData();
  form.set("file", file);
  if (review) {
    const payload: Partial<DocumentReview> = { ...review };
    if (review.document_type === "QUOTATION") delete payload.counterparty_id;
    form.set("review", JSON.stringify(payload));
  }
  const response = await fetch(`${env.apiUrl}${path}`, { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new ApiError(response.status, body?.error?.message ?? response.statusText);
  }
  return response.json() as Promise<T>;
}

export const previewPDF = (token: string | null, file: File) => pdfRequest<DocumentPreview>(token, "/api/import/pdf/preview", file);
export const commitPDF = (token: string | null, file: File, review: DocumentReview) => pdfRequest<{ id: string; status: string }>(token, "/api/import/pdf/commit", file, review);
