import { api } from "@/lib/api-client";
import type { Invoice, ListResponse } from "@/types/api";
export const getInvoices = (token: string | null) => api<ListResponse<Invoice>>("/api/invoices", token);
