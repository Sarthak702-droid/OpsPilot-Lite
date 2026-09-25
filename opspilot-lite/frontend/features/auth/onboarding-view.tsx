"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  KeyRound,
  Sparkles,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Briefcase,
  Globe2,
  Clock,
  ShieldCheck,
  Copy,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { useToken } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { acceptInvitation } from "@/services/organization.service";

const industryPresets = [
  { label: "Wholesale & Distribution", icon: "📦" },
  { label: "Manufacturing & Supply", icon: "🏭" },
  { label: "E-Commerce & Retail", icon: "🛒" },
  { label: "Logistics & Fleet", icon: "🚚" },
  { label: "B2B Hardware & Components", icon: "⚙️" },
];

export function OnboardingView() {
  const [activeTab, setActiveTab] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const token = useToken();
  const router = useRouter();
  const qc = useQueryClient();

  const finish = async () => {
    await qc.invalidateQueries({ queryKey: ["organization"] });
    router.replace("/dashboard");
  };

  const create = useMutation({
    mutationFn: async () =>
      api("/api/organization", await token(), {
        method: "POST",
        body: JSON.stringify({ name, industry, currency: "INR", timezone: "Asia/Kolkata" }),
      }),
    onSuccess: finish,
  });

  const join = useMutation({
    mutationFn: async () => acceptInvitation(await token(), inviteToken),
    onSuccess: finish,
  });

  const handlePasteToken = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setInviteToken(text.trim());
    } catch {
      // fallback
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title="Set up your workspace"
        description="Initialize your tenant organization or join an existing operations hub with an administrator token."
      />

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 p-1 bg-slate-200/60 rounded-xl max-w-xs border border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("create")}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "create"
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Building2 className="w-3.5 h-3.5 text-emerald-700" />
          <span>New Workspace</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("join")}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "join"
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <KeyRound className="w-3.5 h-3.5 text-teal-700" />
          <span>Join Existing</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "create" ? (
          <motion.div
            key="create-form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
          >
            {/* Main Create Card */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                create.mutate();
              }}
              className="lg:col-span-7 card p-6 md:p-8 space-y-6 shadow-md border border-slate-200/90 rounded-2xl bg-white"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-700">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Create organization</h2>
                    <p className="text-xs text-slate-500">Configure your initial operational tenant</p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
                  Role: OWNER
                </span>
              </div>

              {/* Organization Name Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Organization Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:border-slate-300 focus:bg-white focus:border-[#145f55] focus:ring-4 focus:ring-[#145f55]/10 outline-none text-sm transition-all font-medium text-slate-900"
                    placeholder="e.g. Apex Global Logistics"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    minLength={2}
                    maxLength={120}
                  />
                </div>
              </div>

              {/* Industry Field & Quick Presets */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Industry Segment</span>
                  <span className="text-[11px] font-normal text-slate-400">Click a preset or type</span>
                </label>

                <input
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:border-slate-300 focus:bg-white focus:border-[#145f55] focus:ring-4 focus:ring-[#145f55]/10 outline-none text-sm transition-all font-medium text-slate-900"
                  placeholder="e.g. Industrial Automation"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  maxLength={120}
                />

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {industryPresets.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setIndustry(preset.label)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                        industry === preset.label
                          ? "bg-[#145f55] text-white border-[#145f55] font-semibold"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <span>{preset.icon}</span>
                      <span>{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Immutable Configuration Note */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Globe2 className="w-4 h-4 text-emerald-700" />
                  <span>Currency: <strong>INR (₹)</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-teal-700" />
                  <span>Timezone: <strong>Asia/Kolkata</strong></span>
                </div>
              </div>

              {create.isError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                  {create.error instanceof Error ? create.error.message : "Could not create organization."}
                </div>
              )}

              <button
                type="submit"
                disabled={create.isPending || name.trim().length < 2}
                className="w-full h-11 rounded-xl bg-[#145f55] hover:bg-[#0e4d45] disabled:opacity-50 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {create.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Configuring Workspace...</span>
                  </>
                ) : (
                  <>
                    <span>Create Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Live Preview / Explainer Card */}
            <div className="lg:col-span-5 space-y-4">
              <div className="card p-6 border border-emerald-900/10 rounded-2xl bg-gradient-to-br from-emerald-50/60 to-white shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Workspace Architecture</span>
                </div>

                <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                  <p>
                    Creating an organization provisions a private tenant in PostgreSQL with dedicated row-level tenant keys and audit logs.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>Maker-Checker Engine:</strong> High-value purchase orders will require dual approval.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>15-Minute Anomaly Worker:</strong> Inventory signals and supplier drift scans activate instantly.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>Local MiMo Copilot:</strong> Query order status and supplier risks anytime in natural language.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="join-form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="max-w-2xl"
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                join.mutate();
              }}
              className="card p-6 md:p-8 space-y-6 shadow-md border border-slate-200/90 rounded-2xl bg-white"
            >
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
                <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200/60 flex items-center justify-center text-teal-700">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Join organization</h2>
                  <p className="text-xs text-slate-500">Enter a one-time invitation token issued by an administrator</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Invitation Token</span>
                  <button
                    type="button"
                    onClick={handlePasteToken}
                    className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" /> Paste
                  </button>
                </label>

                <input
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:border-slate-300 focus:bg-white focus:border-[#145f55] focus:ring-4 focus:ring-[#145f55]/10 outline-none text-sm font-mono text-slate-900 transition-all"
                  placeholder="Paste your 32+ character invitation token..."
                  value={inviteToken}
                  onChange={(e) => setInviteToken(e.target.value.trim())}
                  autoComplete="off"
                  required
                />
                <p className="text-[11px] text-slate-400">
                  Tokens expire after 7 days from generation. Once accepted, your Clerk account will be granted member access.
                </p>
              </div>

              {join.isError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                  {join.error instanceof Error ? join.error.message : "Invalid or expired token."}
                </div>
              )}

              <button
                type="submit"
                disabled={join.isPending || inviteToken.length < 32}
                className="w-full h-11 rounded-xl bg-[#145f55] hover:bg-[#0e4d45] disabled:opacity-50 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {join.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Token...</span>
                  </>
                ) : (
                  <>
                    <span>Join Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
