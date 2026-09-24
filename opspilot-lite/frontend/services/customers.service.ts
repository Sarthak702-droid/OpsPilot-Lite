import { api } from "@/lib/api-client";
import type { Customer, ListResponse } from "@/types/api";
export const getCustomers = (token: string | null) => api<ListResponse<Customer>>("/api/customers", token);
