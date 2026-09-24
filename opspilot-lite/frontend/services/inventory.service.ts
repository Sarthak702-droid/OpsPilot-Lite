import { api } from "@/lib/api-client";
import type { InventoryItem, ListResponse } from "@/types/api";
export const getInventory = (token: string | null) => api<ListResponse<InventoryItem>>("/api/inventory", token);
