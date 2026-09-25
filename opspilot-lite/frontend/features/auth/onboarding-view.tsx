"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { useToken } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { acceptInvitation } from "@/services/organization.service";

export function OnboardingView() {
  const [name, setName] = useState(""); const [industry, setIndustry] = useState(""); const [inviteToken, setInviteToken] = useState("");
  const token = useToken(); const router = useRouter(); const qc = useQueryClient();
  const finish = async () => { await qc.invalidateQueries({ queryKey: ["organization"] }); router.replace("/dashboard"); };
  const create = useMutation({ mutationFn: async () => api("/api/organization", await token(), { method: "POST", body: JSON.stringify({ name, industry, currency: "INR", timezone: "Asia/Kolkata" }) }), onSuccess: finish });
  const join = useMutation({ mutationFn: async () => acceptInvitation(await token(), inviteToken), onSuccess: finish });
  return <><PageHeader title="Set up your workspace" description="Create an organization or join one with an invitation." />
    <div className="section-grid" style={{ marginTop: 0 }}><form className="card section-card stack" onSubmit={e => { e.preventDefault(); create.mutate(); }}><h2 className="section-title">Create organization</h2><label>Organization name<input className="input" value={name} onChange={e => setName(e.target.value)} required minLength={2} maxLength={120} /></label><label>Industry<input className="input" value={industry} onChange={e => setIndustry(e.target.value)} maxLength={120} /></label><p style={{ color: "var(--muted)", fontSize: 12 }}>Currency: INR · Timezone: Asia/Kolkata.</p>{create.isError && <p role="alert">Could not create organization.</p>}<button className="button primary" disabled={create.isPending || name.trim().length < 2}>Create workspace</button></form>
      <form className="card section-card stack" onSubmit={e => { e.preventDefault(); join.mutate(); }}><h2 className="section-title">Join organization</h2><label>Invitation token<input className="input" value={inviteToken} onChange={e => setInviteToken(e.target.value.trim())} autoComplete="off" /></label><p style={{ color: "var(--muted)", fontSize: 12 }}>Ask your organization administrator for a one-time token. It expires after seven days.</p>{join.isError && <p role="alert">{join.error.message}</p>}<button className="button primary" disabled={join.isPending || inviteToken.length < 32}>Join workspace</button></form></div>
  </>;
}
