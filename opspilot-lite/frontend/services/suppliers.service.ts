import { api } from "@/lib/api-client";
import type { Supplier, ListResponse } from "@/types/api";
export const getSuppliers = (token: string | null) => api<ListResponse<Supplier>>("/api/suppliers", token);
