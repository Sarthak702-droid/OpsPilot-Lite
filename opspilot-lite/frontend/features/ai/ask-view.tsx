"use client";
import { useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { AskInput } from "@/components/ai/ask-input";
import { AIResponse } from "@/components/ai/ai-response";
import { useToken } from "@/lib/auth-context";
import { askOpsPilot } from "@/services/ai.service";
export function AskView() { const token = useToken(); const ask = useMutation({ mutationFn: async (question: string) => askOpsPilot(await token(), question) }); return <><PageHeader title="Ask OpsPilot" description="Questions are answered from current business evidence. Simple retrieval stays deterministic." /><div style={{ maxWidth: 850 }}><AskInput onAsk={question => ask.mutate(question)} busy={ask.isPending} /><div style={{ marginTop: 12, color: "var(--muted)", fontSize: 12 }}>Try “What needs my attention today?” or “Explain why a supplier is high risk.”</div>{ask.isPending && <div className="empty">Analyzing evidence…</div>}{ask.isError && <div className="empty" role="alert">Could not answer this question.</div>}{ask.data && <AIResponse result={ask.data} />}</div></>; }

