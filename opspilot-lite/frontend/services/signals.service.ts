import { api } from "@/lib/api-client";
import type { Signal, ListResponse } from "@/types/api";
export const getSignals = (token: string | null) => api<ListResponse<Signal>>("/api/signals", token);
