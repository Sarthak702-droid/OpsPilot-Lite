"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { useToken } from "@/lib/auth-context";
import { getMembers, getOrganization, getRiskSettings, inviteMember, saveRiskSettings, updateMemberRole } from "@/services/organization.service";

const roles = ["ADMIN", "MANAGER", "STAFF", "VIEWER"];
export function SettingsView() {
  const token = useToken(); const qc = useQueryClient();
  const org = useQuery({ queryKey: ["organization"], queryFn: async () => getOrganization(await token()) });
  const settings = useQuery({ queryKey: ["risk-settings"], queryFn: async () => getRiskSettings(await token()) });
  const members = useQuery({ queryKey: ["members"], queryFn: async () => getMembers(await token()) });
  const [days, setDays] = useState(""); const [threshold, setThreshold] = useState(""); const [email, setEmail] = useState(""); const [role, setRole] = useState("MANAGER");
  const canAdmin = ["OWNER", "ADMIN"].includes(org.data?.role ?? "");
  const save = useMutation({ mutationFn: async () => saveRiskSettings(await token(), { overstock_days: Number(days || settings.data?.overstock_days), high_value_threshold: threshold || settings.data?.high_value_threshold || "100000" }), onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["risk-settings"] }); } });
  const invite = useMutation({ mutationFn: async () => inviteMember(await token(), { email, role }), onSuccess: () => setEmail("") });
  const changeRole = useMutation({ mutationFn: async (x: { id: string; role: string }) => updateMemberRole(await token(), x.id, x.role), onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["members"] }); } });
  return <><PageHeader title="Settings" description="Risk thresholds, organization members, and service configuration." />
    <div className="section-grid" style={{ marginTop: 0 }}><section className="card section-card stack"><h2 className="section-title">Risk thresholds</h2><p>Overstock is flagged when stock coverage exceeds the set number of days. High value pending applies to unpaid invoices below their due date.</p><label>Overstock coverage days<input className="input" type="number" min="30" max="365" value={days || settings.data?.overstock_days || ""} disabled={!canAdmin} onChange={e => setDays(e.target.value)} /></label><label>High value outstanding threshold ({org.data?.currency || "workspace currency"})<input className="input" type="number" min="0.01" step="0.01" value={threshold || settings.data?.high_value_threshold || ""} disabled={!canAdmin} onChange={e => setThreshold(e.target.value)} /></label>{save.isError && <p role="alert">{save.error.message}</p>}{save.isSuccess && <p role="status">Thresholds saved.</p>}{canAdmin && <button className="button primary" disabled={save.isPending} onClick={() => save.mutate()}>Save thresholds</button>}</section>
    <section className="card section-card stack"><h2 className="section-title">Members</h2><p>Sending a purchase order requires approval from an authorized person other than its creator.</p>{members.data?.items.map(x => <div key={x.id} className="button-row" style={{ justifyContent: "space-between", borderBottom: "1px solid var(--line)", paddingBottom: 8 }}><span>{x.email || x.name || x.id.slice(0, 8)} · {x.role}</span>{canAdmin && x.role !== "OWNER" && x.id !== org.data?.user_id && <select className="input" style={{ width: 130 }} value={x.role} onChange={e => changeRole.mutate({ id: x.id, role: e.target.value })}>{roles.map(value => <option key={value}>{value}</option>)}</select>}</div>)}{canAdmin && <><h3 className="section-title">Invite member</h3><label>Email<input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} /></label><label>Role<select className="input" value={role} onChange={e => setRole(e.target.value)}>{roles.map(value => <option key={value}>{value}</option>)}</select></label>{invite.isError && <p role="alert">{invite.error.message}</p>}<button className="button primary" disabled={!email || invite.isPending} onClick={() => invite.mutate()}>Create invitation</button>{invite.data && <p role="status">Share this one-time invitation token securely with {invite.data.email}: <code style={{ overflowWrap: "anywhere" }}>{invite.data.token}</code></p>}</>}</section></div>
    <section className="card section-card" style={{ marginTop: 18 }}><h2 className="section-title">Service architecture</h2><p>Operational metrics and alerts are calculated by Go. MiMo inference runs separately through SGLang. Supplier email requires server-side SMTP configuration.</p></section>
  </>;
}
