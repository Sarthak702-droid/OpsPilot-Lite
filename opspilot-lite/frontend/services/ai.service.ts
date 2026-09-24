import { api } from "@/lib/api-client";
import type { AskResponse } from "@/types/api";
import { askSchema } from "@/lib/validators";
export const askOpsPilot = (token: string | null, question: string) => api<AskResponse>("/api/ai/ask", token, { method: "POST", body: JSON.stringify(askSchema.parse({question})) });
