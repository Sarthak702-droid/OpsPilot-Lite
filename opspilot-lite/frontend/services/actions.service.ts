import { api } from "@/lib/api-client";
import type { Action, ListResponse } from "@/types/api";
export const getActions = (token: string | null) => api<ListResponse<Action>>("/api/actions", token);
export const decideAction = (token: string | null, id: string, decision: "approve" | "reject") => api<{ id: string; status: string }>(`/api/actions/${id}/${decision}`, token, { method: "POST" });
export const executeAction = (token: string | null, id: string) => api<{ id: string; status: string }>(`/api/actions/${id}/execute`, token, { method: "POST" });
