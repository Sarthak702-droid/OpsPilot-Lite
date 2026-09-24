"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { useToken } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
export function OnboardingView() { const [name, setName] = useState(""); const [industry, setIndustry] = useState(""); const token = useToken(); const router = useRouter(); const qc = useQueryClient(); const create = useMutation({ mutationFn: async () => api("/api/organization", await token(), { method: "POST", body: JSON.stringify({ name, industry, currency: "INR", timezone: "Asia/Kolkata" }) }), onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["organization"] }); router.replace("/dashboard"); } }); return <><PageHeader title="Set up your workspace" description="Create the organization that will own your business data." /><form className="card section-card stack" style={{ maxWidth: 520 }} onSubmit={e => { e.preventDefault(); create.mutate(); }}><label>Organization name<input className="input" value={name} onChange={e => setName(e.target.value)} required minLength={2} maxLength={120} /></label><label>Industry<input className="input" value={industry} onChange={e => setIndustry(e.target.value)} maxLength={120} /></label><p style={{ color: "var(--muted)", fontSize: 12 }}>Currency: INR · Timezone: Asia/Kolkata. You can change these in a later release.</p>{create.isError && <p role="alert">Could not create organization.</p>}<button className="button primary" disabled={create.isPending || name.trim().length < 2}>Create workspace</button></form></>; }

