import { api } from "@/lib/api-client";
import type { Dashboard } from "@/types/api";
export const getDashboard = (token: string | null) => api<Dashboard>("/api/dashboard", token);
