"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ClerkLoaded, ClerkLoading } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Lock,
  Boxes,
  Activity,
  Bot,
  CheckCircle2,
  Cpu,
  ArrowRight,
  Database,
  KeyRound,
  FileCheck2,
} from "lucide-react";
import { AuthLoading } from "./auth-loading";

interface AuthShellProps {
  children: React.ReactNode;
  mode: "sign-in" | "sign-up" | "login";
}

export function AuthShell({ children, mode }: AuthShellProps) {
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    {
      icon: <Activity className="w-4 h-4 text-emerald-600" />,
      title: "Real-time Signal Engine",
      description: "Continuous warehouse inventory monitoring with automated reorder signals.",
      metric: "99.98% accuracy",
    },
    {
      icon: <FileCheck2 className="w-4 h-4 text-teal-600" />,
      title: "Dual-Approval PO Governance",
      description: "Maker-Checker authorization ensures zero accidental purchase order dispatches.",
      metric: "SOC2 compliant",
    },
    {
      icon: <Bot className="w-4 h-4 text-emerald-500" />,
      title: "Embedded MiMo AI Copilot",
      description: "Instant natural language insights across inventory, suppliers, and customer drift.",
      metric: "120s deep reasoning",
    },
  ];

  return (
    <div className="relative min-h-screen w-full overflow-hidden auth-bg-gradient flex flex-col justify-between selection:bg-[#145f55]/10 selection:text-[#145f55]">
      {/* Background ambient decorative glowing orbs */}
      <div className="pointer-events-none absolute inset-0 auth-grid-overlay opacity-60" />
      
      <div 
        className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-emerald-500/15 to-teal-400/10 blur-3xl animate-auth-pulse" 
      />
      <div 
        className="pointer-events-none absolute -bottom-40 -right-40 h-[550px] w-[550px] rounded-full bg-gradient-to-bl from-teal-500/15 to-emerald-600/10 blur-3xl animate-auth-pulse" 
        style={{ animationDelay: "2.5s" }}
      />
      <div 
        className="pointer-events-none absolute top-1/2 left-1/3 -translate-y-1/2 h-80 w-80 rounded-full bg-cyan-400/5 blur-3xl" 
      />

      {/* Top Header Bar */}
      <header className="relative z-10 w-full border-b border-slate-200/60 bg-white/60 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/login" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#145f55] to-[#0e4d45] flex items-center justify-center text-white font-extrabold text-lg shadow-md shadow-[#145f55]/20 group-hover:scale-105 transition-transform duration-200">
              O
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 text-base tracking-tight flex items-center gap-2">
                OpsPilot Lite
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200/60">
                  v1.0
                </span>
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 border border-slate-200/80 shadow-xs text-xs font-medium text-slate-600">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Services Operational</span>
            </div>

            <nav className="flex items-center gap-2 text-xs font-semibold">
              <Link 
                href="/sign-in" 
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  mode === "sign-in" 
                    ? "bg-[#145f55] text-white shadow-xs" 
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
                }`}
              >
                Sign In
              </Link>
              <Link 
                href="/sign-up" 
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  mode === "sign-up" 
                    ? "bg-[#145f55] text-white shadow-xs" 
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
                }`}
              >
                Create Account
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-6 py-8 md:py-12 flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center w-full">
          
          {/* Left Hero Panel (Value & Interactive Feature Hub) */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="lg:col-span-6 flex flex-col justify-center space-y-8"
          >
            {/* Pill & Title */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50/80 border border-emerald-200/80 text-emerald-800 text-xs font-semibold shadow-xs">
                <Boxes className="w-3.5 h-3.5 text-emerald-600" />
                <span>Next-Gen Enterprise Supply Intelligence</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
                Intelligent operations with{" "}
                <span className="bg-gradient-to-r from-[#145f55] via-[#1b796d] to-[#0e4d45] bg-clip-text text-transparent">
                  instant decision loops.
                </span>
              </h1>

              <p className="text-base text-slate-600 max-w-lg leading-relaxed">
                Connect your inventory, dual-approval purchase orders, and supplier receipts with unified audit logging and private LLM reasoning.
              </p>
            </div>

            {/* Interactive Feature Cards */}
            <div className="space-y-3">
              {features.map((feat, i) => (
                <motion.div
                  key={i}
                  whileHover={{ scale: 1.01, x: 4 }}
                  onClick={() => setActiveFeature(i)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    activeFeature === i
                      ? "bg-white border-emerald-200 shadow-md shadow-emerald-900/5 ring-1 ring-emerald-500/10"
                      : "bg-white/60 border-slate-200/70 hover:bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-100/80 mt-0.5">
                      {feat.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-800">{feat.title}</h4>
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                          {feat.metric}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-normal">{feat.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Live Operations Simulator Box */}
            <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-md p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-emerald-700" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    OpsEngine Live State
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold bg-emerald-50/80 px-2 py-0.5 rounded-full border border-emerald-200/60">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  Active Worker Lease
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-[11px] font-medium text-slate-500">API Port</div>
                  <div className="text-sm font-extrabold text-slate-900 mt-0.5 font-mono">18080</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-[11px] font-medium text-slate-500">Auth Engine</div>
                  <div className="text-sm font-extrabold text-emerald-700 mt-0.5">Clerk JWKS</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-[11px] font-medium text-slate-500">Audit Status</div>
                  <div className="text-sm font-extrabold text-slate-900 mt-0.5">Signed</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column (Clerk Auth Card Container with Animated Loading and Transitions) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
            className="lg:col-span-6 flex flex-col items-center justify-center"
          >
            <div className="w-full max-w-[460px] relative">
              
              {/* Decorative Card Glow behind the auth box */}
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-emerald-600/20 blur-xl opacity-75 group-hover:opacity-100 transition duration-1000 -z-10" />

              {/* Top Card Badge / Status */}
              <div className="flex items-center justify-between mb-3 px-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Secure Enterprise Gateway</span>
                </div>
                <div className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
                  Dual-Tenant Ready
                </div>
              </div>

              {/* Clerk Auth Card with Framer Motion and Loading State */}
              <div className="w-full">
                <ClerkLoading>
                  <AuthLoading mode={mode === "login" ? "sign-in" : mode} />
                </ClerkLoading>

                <ClerkLoaded>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="w-full flex justify-center"
                  >
                    {children}
                  </motion.div>
                </ClerkLoaded>
              </div>

              {/* Trust & Compliance Footer Badges */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-slate-500">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>256-Bit SSL/TLS</span>
                </div>
                <span className="text-slate-300">•</span>
                <div className="flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-teal-600" />
                  <span>Zero-Leak Isolation</span>
                </div>
                <span className="text-slate-300">•</span>
                <div className="flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-emerald-600" />
                  <span>RBAC & MFA</span>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </main>

      {/* Subtle Footer */}
      <footer className="relative z-10 w-full border-t border-slate-200/50 bg-white/40 backdrop-blur-xs py-4">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <p>© {new Date().getFullYear()} OpsPilot Lite. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-800 cursor-pointer transition-colors">Privacy Policy</span>
            <span>•</span>
            <span className="hover:text-slate-800 cursor-pointer transition-colors">Security Protocol</span>
            <span>•</span>
            <span className="hover:text-slate-800 cursor-pointer transition-colors">Audit Compliance</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
