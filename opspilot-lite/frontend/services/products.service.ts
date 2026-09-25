import { api } from "@/lib/api-client";
import type { ListResponse, Product } from "@/types/api";
export const getProducts = (token: string | null) => api<ListResponse<Product>>("/api/products", token);
