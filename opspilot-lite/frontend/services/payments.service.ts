import { api } from "@/lib/api-client";
import type { ListResponse, Payment } from "@/types/api";
export const getPayments = (token: string | null) => api<ListResponse<Payment>>("/api/payments", token);
export const recordPayment = (token: string | null, input: { invoice_id: string; amount: string; payment_date: string; payment_method: string; reference_number: string }) => api<{ id: string }>("/api/payments", token, { method: "POST", body: JSON.stringify(input) });
export const reversePayment = (token: string | null, id: string, reason: string) => api<{ id: string; status: string }>(`/api/payments/${id}/reverse`, token, { method: "POST", body: JSON.stringify({ reason }) });
