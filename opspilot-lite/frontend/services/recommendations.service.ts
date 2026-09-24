import { api } from "@/lib/api-client";
import type { ListResponse, SavedRecommendation } from "@/types/api";
export const getRecommendations = (token: string | null) => api<ListResponse<SavedRecommendation>>("/api/recommendations", token);

