import { api } from "@/lib/api-client";
import type { ListResponse, Sale } from "@/types/api";
export type SaleInput = { customer_id: string; sale_date: string; tax: string; discount: string; items: { product_id: string; quantity: string; unit_price: string; discount: string }[] };
export const getSales = (token: string | null) => api<ListResponse<Sale>>("/api/sales", token);
export const getSale = (token: string | null, id: string) => api<Sale>(`/api/sales/${id}`, token);
export const saveSale = (token: string | null, input: SaleInput, id?: string) => api<{ id: string; status: string }>(id ? `/api/sales/${id}` : "/api/sales", token, { method: id ? "PATCH" : "POST", body: JSON.stringify(input) });
export const completeSale = (token: string | null, id: string) => api<{ id: string; status: string }>(`/api/sales/${id}/complete`, token, { method: "POST" });
