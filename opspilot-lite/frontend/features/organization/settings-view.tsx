"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Settings,
  Users,
  Sliders,
  Mail,
  Copy,
  Check,
  ShieldCheck,
  Server,
  Database,
  Cpu,
  Loader2,
  Lock,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { useToken } from "@/lib/auth-context";
import {
  getMembers,
  getOrganization,
  getRiskSettings,
  inviteMember,
  saveRiskSettings,
  updateMemberRole,
} from "@/services/organization.service";

const roles = ["ADMIN", "MANAGER", "STAFF", "VIEWER"];

export function SettingsView() {
  const token = useToken();
  const qc = useQueryClient();
  const [copiedToken, setCopiedToken] = useState(false);

  const org = useQuery({ queryKey: ["organization"], queryFn: async () => getOrganization(await token()) });
  const settings = useQuery({ queryKey: ["risk-settings"], queryFn: async () => getRiskSettings(await token()) });
  const members = useQuery({ queryKey: ["members"], queryFn: async () => getMembers(await token()) });

  const [days, setDays] = useState("");
  const [threshold, setThreshold] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("MANAGER");

  const canAdmin = ["OWNER", "ADMIN"].includes(org.data?.role ?? "");

  const save = useMutation({
    mutationFn: async () =>
      saveRiskSettings(await token(), {
        overstock_days: Number(days || settings.data?.overstock_days),
        high_value_threshold: threshold || settings.data?.high_value_threshold || "100000",
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["risk-settings"] });
    },
  });

  const invite = useMutation({
    mutationFn: async () => inviteMember(await token(), { email, role }),
    onSuccess: () => setEmail(""),
  });

  const changeRole = useMutation({
    mutationFn: async (x: { id: string; role: string }) => updateMemberRole(await token(), x.id, x.role),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["members"] });
    },
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2500);
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <PageHeader
        title="Settings & Workspace Governance"
        description="Configure operational risk thresholds, manage team authorization levels, and review architecture health."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Risk Thresholds Card */}
        <section className="lg:col-span-6 card p-6 rounded-2xl border border-slate-200/90 bg-white shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Risk & Anomaly Thresholds</h2>
              <p className="text-xs text-slate-500">Heuristics used by the 15-minute background worker</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                Overstock Threshold (Days of Coverage)
              </label>
              <input
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono font-medium text-slate-800 focus:bg-white focus:border-[#145f55] outline-none"
                type="number"
                min="30"
                max="365"
                value={days || settings.data?.overstock_days || ""}
                disabled={!canAdmin}
                onChange={(e) => setDays(e.target.value)}
              />
              <p className="text-[11px] text-slate-400">
                Products exceeding this many days of projected consumption trigger OVERSTOCK warnings.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                High Value Invoice Alert ({org.data?.currency || "INR"})
              </label>
              <input
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono font-medium text-slate-800 focus:bg-white focus:border-[#145f55] outline-none"
                type="number"
                min="0.01"
                step="0.01"
                value={threshold || settings.data?.high_value_threshold || ""}
                disabled={!canAdmin}
                onChange={(e) => setThreshold(e.target.value)}
              />
              <p className="text-[11px] text-slate-400">
                Unpaid invoices with balances exceeding this amount trigger HIGH_VALUE risk signals.
              </p>
            </div>

            {save.isError && (
              <p className="text-xs text-rose-600 font-medium">{save.error.message}</p>
            )}

            {save.isSuccess && (
              <p className="text-xs text-emerald-700 font-semibold bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                Threshold parameters saved successfully.
              </p>
            )}

            {canAdmin && (
              <button
                className="w-full h-10 rounded-xl bg-[#145f55] hover:bg-[#0e4d45] disabled:opacity-50 text-white font-semibold text-xs shadow-xs transition-all flex items-center justify-center gap-2"
                disabled={save.isPending}
                onClick={() => save.mutate()}
              >
                {save.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Save Threshold Parameters
              </button>
            )}
          </div>
        </section>

        {/* Member Management Card */}
        <section className="lg:col-span-6 card p-6 rounded-2xl border border-slate-200/90 bg-white shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Workspace Members & RBAC</h2>
              <p className="text-xs text-slate-500">Dual-approval governance requires at least 2 authorized members</p>
            </div>
          </div>

          {/* Members list */}
          <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
            {members.data?.items.map((x) => (
              <div key={x.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5 truncate">
                  <div className="font-bold text-slate-800 truncate">{x.email || x.name || x.id.slice(0, 8)}</div>
                  <div className="text-[11px] text-slate-400 font-semibold uppercase">{x.role}</div>
                </div>

                {canAdmin && x.role !== "OWNER" && x.id !== org.data?.user_id && (
                  <select
                    className="h-8 px-2 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 focus:border-[#145f55] outline-none"
                    value={x.role}
                    onChange={(e) => changeRole.mutate({ id: x.id, role: e.target.value })}
                  >
                    {roles.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>

          {/* Invite Section */}
          {canAdmin && (
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Generate Member Invitation Token
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2">
                  <input
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#145f55] outline-none"
                    type="email"
                    placeholder="teammate@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <select
                    className="w-full h-9 px-2 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 focus:border-[#145f55] outline-none"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    {roles.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </div>
              </div>

              {invite.isError && (
                <p className="text-xs text-rose-600 font-medium">{invite.error.message}</p>
              )}

              <button
                className="w-full h-9 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-xs shadow-2xs transition-all flex items-center justify-center gap-1.5"
                disabled={!email || invite.isPending}
                onClick={() => invite.mutate()}
              >
                {invite.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                Generate 7-Day Access Token
              </button>

              {invite.data && (
                <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-teal-900">One-Time Token Created</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(invite.data.token)}
                      className="text-xs font-semibold text-[#145f55] hover:underline flex items-center gap-1"
                    >
                      {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedToken ? "Copied Token!" : "Copy Token"}</span>
                    </button>
                  </div>
                  <code className="block p-2 rounded-lg bg-white border border-teal-100 font-mono text-[11px] text-slate-800 break-all select-all">
                    {invite.data.token}
                  </code>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* System Infrastructure Architecture Card */}
      <section className="card p-6 rounded-2xl border border-slate-200/90 bg-white shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Server className="w-4 h-4 text-emerald-700" />
          <span>Core Infrastructure Architecture</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-blue-600" /> PostgreSQL 16
            </div>
            <p className="text-[11px] text-slate-500">Atomic ledger, row-level isolation & audit hashing</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-rose-600" /> Redis 7
            </div>
            <p className="text-[11px] text-slate-500">Lease locking & high-speed anomaly signal cache</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-teal-600" /> MiMo V2.6 Pro
            </div>
            <p className="text-[11px] text-slate-500">Local SGLang inference with 120s reasoning timeout</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-600" /> Clerk Auth
            </div>
            <p className="text-[11px] text-slate-500">Cryptographic RS256 JWKS token verification</p>
          </div>
        </div>
      </section>
    </div>
  );
}
