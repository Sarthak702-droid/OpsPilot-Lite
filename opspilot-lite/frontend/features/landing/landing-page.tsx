"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, useUser, SignInButton, UserButton } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import {
  Terminal,
  ShieldCheck,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  Server,
  Key,
  Shield,
  Search,
  ExternalLink,
  Cpu,
  Fingerprint,
  Mail,
  Building,
  CheckCircle2,
  X,
  Layers,
  Sparkles,
  Zap,
} from "lucide-react";

interface LogEntry {
  id: string;
  type: string;
  message: string;
  hash: string;
  time: string;
}

const INITIAL_LOGS: LogEntry[] = [
  {
    id: "1",
    type: "STREAM_INVENTORY_DELTA",
    message: "node-ord-09 payload signed, hash:",
    hash: "0x8f2a...c01e",
    time: "just now",
  },
  {
    id: "2",
    type: "PO_DUAL_AUTH_CHECK",
    message: "Ed25519 signer 2/2 validated for PO-8902:",
    hash: "0x4b71...e99d",
    time: "4s ago",
  },
  {
    id: "3",
    type: "CRDT_STATE_SYNC",
    message: "mesh-us-east-1 converged with 42 edge nodes:",
    hash: "0xd138...7f20",
    time: "12s ago",
  },
  {
    id: "4",
    type: "MIMO_INFERENCE_TICK",
    message: "local LLM inference tick latency 92ms, token trace:",
    hash: "0xaa42...10fe",
    time: "18s ago",
  },
];

export function LandingPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  // Tab State: 'sso' | 'creds'
  const [activeTab, setActiveTab] = useState<"sso" | "creds">("sso");

  // Input states
  const [ssoEmail, setSsoEmail] = useState("");
  const [credEmail, setCredEmail] = useState("");
  const [credPassword, setCredPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(true);

  // Command palette state
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Live Terminal Ingress Stream
  const [logIndex, setLogIndex] = useState(0);
  const [logs] = useState<LogEntry[]>(INITIAL_LOGS);

  // Automatically route to /dashboard as soon as authentication succeeds
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace("/dashboard");
    }
  }, [isLoaded, isSignedIn, router]);

  // Rotate simulated stream items periodically
  useEffect(() => {
    const timer = setInterval(() => {
      setLogIndex((prev) => (prev + 1) % INITIAL_LOGS.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  // Keyboard shortcut listener for ⌘K and ⌘G
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "g") {
        e.preventDefault();
        router.push("/sign-in");
      }
      if (e.key === "Escape") {
        setIsCommandOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  const currentLog = logs[logIndex];

  // Quick navigation items for Command Palette
  const quickLinks = [
    { label: "Operations Dashboard", path: "/dashboard", icon: Layers, tag: "Console" },
    { label: "Inventory & Stock Levels", path: "/inventory", icon: Zap, tag: "Warehouse" },
    { label: "Purchase Orders Pipeline", path: "/purchase-orders", icon: ShieldCheck, tag: "Governance" },
    { label: "Signals & Anomaly Stream", path: "/signals", icon: Sparkles, tag: "Real-time" },
    { label: "OpsPilot Copilot (AI)", path: "/ai", icon: Cpu, tag: "Private LLM" },
    { label: "Action Center (Maker-Checker)", path: "/actions", icon: Key, tag: "Audit" },
    { label: "Workspace & Organization Settings", path: "/settings", icon: Building, tag: "Config" },
  ].filter((item) => item.label.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#121316] text-[#e3e2e6] font-['Geist',-apple-system,BlinkMacSystemFont,sans-serif] selection:bg-[#10b981] selection:text-[#003824] relative overflow-x-hidden antialiased">
      {/* ========================================================================= */}
      {/* BACKGROUND ATMOSPHERE: Ambient Radial Glow & Dot Matrix                   */}
      {/* ========================================================================= */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden select-none -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[450px] bg-gradient-to-b from-[#10b981]/15 via-[#4edea3]/5 to-transparent blur-[140px] rounded-full" />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, #e3e2e6 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      {/* ========================================================================= */}
      {/* HEADER: Sticky Telemetry Navigation Bar (Spacious 64px)                   */}
      {/* ========================================================================= */}
      <header className="fixed top-0 w-full z-50 bg-[#0d0e11]/90 backdrop-blur-xl border-b border-white/[0.06] shadow-[0_1px_12px_rgba(0,0,0,0.4)]">
        <div className="h-16 w-full max-w-[1480px] xl:max-w-[1560px] mx-auto px-6 sm:px-10 lg:px-12 flex items-center justify-between gap-6">
          {/* Left Brand & Edge Telemetry */}
          <div className="flex items-center gap-5">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-7 h-7 rounded-md bg-[#10b981] flex items-center justify-center text-[#003824] shadow-xs group-hover:scale-105 transition-transform">
                <Terminal className="w-4 h-4 stroke-[2.5]" />
              </div>
              <span className="text-[15px] font-semibold tracking-tight text-[#e3e2e6]">
                OpsPilot<span className="text-[#4edea3] font-normal ml-0.5">Lite</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-[#1f1f23] text-[11px] text-[#bbcabf] font-mono border border-white/[0.06]">
                v1.4.3
              </span>
            </Link>

            <div className="h-4 w-px bg-white/[0.1] hidden xl:block" />

            <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded bg-[#1b1b1f] text-xs text-[#bbcabf] border border-white/[0.06] font-mono">
              <Server className="w-3.5 h-3.5 text-[#4cd7f6]" />
              <span>mesh-us-east-1 // edge-04</span>
            </div>

            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded bg-[#1b1b1f] text-xs text-[#4edea3] border border-[#10b981]/25 font-mono">
              <span className="w-2 h-2 rounded-full bg-[#4edea3] animate-pulse" />
              <span>8ms</span>
            </div>
          </div>

          {/* Center Nav Links */}
          <nav className="hidden md:flex items-center gap-2">
            <Link
              href="/"
              className="px-3.5 py-1.5 rounded-md text-xs font-medium bg-[#292a2d] text-[#e3e2e6] border border-white/[0.08] transition-colors shadow-xs"
            >
              Gateway
            </Link>
            <Link
              href="/signals"
              className="px-3.5 py-1.5 rounded-md text-xs text-[#bbcabf] hover:text-[#e3e2e6] hover:bg-[#1b1b1f] transition-colors"
            >
              Observability
            </Link>
            <Link
              href="/purchase-orders"
              className="px-3.5 py-1.5 rounded-md text-xs text-[#bbcabf] hover:text-[#e3e2e6] hover:bg-[#1b1b1f] transition-colors"
            >
              Pipelines
            </Link>
            <Link
              href="/settings"
              className="px-3.5 py-1.5 rounded-md text-xs text-[#bbcabf] hover:text-[#e3e2e6] hover:bg-[#1b1b1f] transition-colors"
            >
              Security
            </Link>
            <Link
              href="/settings"
              className="px-3.5 py-1.5 rounded-md text-xs text-[#bbcabf] hover:text-[#e3e2e6] hover:bg-[#1b1b1f] transition-colors"
            >
              Docs
            </Link>
          </nav>

          {/* Right Search Bar & User Session Button */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsCommandOpen(true)}
              className="relative flex items-center bg-[#1b1b1f] hover:bg-[#1f1f23] px-3.5 py-1.5 rounded-md border border-white/[0.07] text-xs text-[#bbcabf] transition-all cursor-pointer group"
            >
              <Search className="w-3.5 h-3.5 text-[#86948a] mr-2.5 group-hover:text-[#e3e2e6] transition-colors" />
              <span className="text-xs text-[#bbcabf] pr-5 hidden sm:inline">Quick search...</span>
              <kbd className="px-1.5 py-0.5 rounded bg-[#343538] text-[10px] text-[#bbcabf] font-mono shadow-xs">
                ⌘K
              </kbd>
            </button>

            {isLoaded && isSignedIn ? (
              <div className="flex items-center gap-3 pl-1">
                <Link
                  href="/dashboard"
                  className="hidden sm:inline-flex px-3 py-1.5 rounded-md bg-[#10b981]/20 hover:bg-[#10b981]/30 text-[#4edea3] text-xs font-mono font-medium border border-[#10b981]/30 transition-all"
                >
                  Console →
                </Link>
                <div className="p-0.5 rounded-full border border-[#4edea3]/40">
                  <UserButton afterSignOutUrl="/" />
                </div>
              </div>
            ) : (
              <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                <button className="w-8 h-8 rounded-full bg-[#4edea3] hover:bg-[#6ffbbe] text-[#003824] flex items-center justify-center font-bold shadow-[0_0_12px_rgba(78,222,163,0.3)] transition-all cursor-pointer">
                  <span className="text-xs font-bold font-mono">O</span>
                </button>
              </SignInButton>
            )}
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MAIN VIEWPORT: Spacious 2-Column Responsive Layout                        */}
      {/* ========================================================================= */}
      <main className="w-full pt-24 sm:pt-28 pb-20 min-h-[calc(100vh-3.5rem)]">
        <div className="w-full max-w-[1480px] xl:max-w-[1560px] mx-auto px-6 sm:px-10 lg:px-12 flex flex-col gap-12">
          {/* Main 12-column grid with generous gap */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 xl:gap-14 items-start">
            
            {/* =================================================================== */}
            {/* LEFT COLUMN: Proposition & Real-Time Telemetry (7 cols)            */}
            {/* =================================================================== */}
            <div className="lg:col-span-7 flex flex-col gap-8 sm:gap-9">
              
              {/* Enterprise Verification Badges Banner */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#292a2d]/85 text-[#bbcabf] text-xs font-mono shadow-xs backdrop-blur-md border border-white/[0.08]">
                  <span className="w-2 h-2 rounded-full bg-[#4edea3] animate-pulse shadow-[0_0_8px_rgba(78,222,163,0.8)]" />
                  <span className="tracking-wider text-[#e3e2e6] uppercase">v1.4.3 Enterprise Gateway</span>
                </div>
                <span className="text-[#3c4a42] font-mono text-xs">/</span>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#1b1b1f] text-[#bbcabf] text-xs font-mono border border-white/[0.06]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#4cd7f6]" />
                  <span>SOC-2 TYPE II</span>
                </div>
                <span className="text-[#3c4a42] font-mono text-xs hidden sm:inline">/</span>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#1b1b1f] text-[#bbcabf] text-xs font-mono border border-white/[0.06]">
                  <Lock className="w-3.5 h-3.5 text-[#4edea3]" />
                  <span>ZERO-TRUST INGRESS</span>
                </div>
              </div>

              {/* High-Impact Typographic Headline & Proposition */}
              <div className="flex flex-col gap-4 max-w-2xl">
                <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight text-[#e3e2e6] leading-[1.2]">
                  Intelligent operations with{" "}
                  <span className="bg-gradient-to-r from-[#4edea3] via-[#38e8a7] to-[#4cd7f6] bg-clip-text text-transparent font-extrabold">
                    instant decision loops
                  </span>
                  .
                </h1>
                <p className="text-sm sm:text-base text-[#bbcabf] leading-relaxed max-w-xl">
                  Synchronize live multi-warehouse inventory, automate maker-checker purchase order pipelines, and orchestrate private LLM reasoning with cryptographic audit logging.
                </p>
              </div>

              {/* Telemetry Cards Metric Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-5 pt-1">
                {/* Card 1: Signal Engine */}
                <div className="flex flex-col justify-between p-5 rounded-lg bg-[#1b1b1f] hover:bg-[#1f1f23] transition-all group relative overflow-hidden border border-white/[0.07] shadow-sm min-h-[142px]">
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#4edea3]/40 to-transparent" />
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="text-[11px] text-[#bbcabf] uppercase tracking-wider font-mono">Signal Engine</span>
                    <span className="px-2 py-0.5 rounded bg-[#10b981]/20 text-[#4edea3] text-[11px] font-mono font-medium">
                      99.999% SLA
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between my-1">
                    <span className="text-[28px] font-bold font-mono text-[#e3e2e6] tracking-tight">
                      0.38<span className="text-xs font-mono font-normal text-[#bbcabf] ml-1">ms</span>
                    </span>
                    {/* Micro Sparkline */}
                    <svg className="w-18 h-7 text-[#4edea3] stroke-current fill-none overflow-visible" viewBox="0 0 64 24">
                      <path
                        d="M0,18 L12,14 L24,19 L36,8 L48,11 L64,4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.75"
                      />
                      <circle className="fill-[#4edea3] animate-ping" cx="64" cy="4" opacity="0.75" r="2" />
                      <circle className="fill-[#4edea3]" cx="64" cy="4" r="2" />
                    </svg>
                  </div>
                  <span className="text-[11px] text-[#86948a] font-mono mt-2">Dispatch tick • p99 latency</span>
                </div>

                {/* Card 2: PO Governance */}
                <div className="flex flex-col justify-between p-5 rounded-lg bg-[#1b1b1f] hover:bg-[#1f1f23] transition-all group relative overflow-hidden border border-white/[0.07] shadow-sm min-h-[142px]">
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#4cd7f6]/40 to-transparent" />
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="text-[11px] text-[#bbcabf] uppercase tracking-wider font-mono">PO Governance</span>
                    <span className="px-2 py-0.5 rounded bg-[#292a2d] text-[#4cd7f6] text-[11px] font-mono flex items-center gap-1.5 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4cd7f6]" />
                      Dual-Sign
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between my-1">
                    <span className="text-xl font-bold font-mono text-[#e3e2e6] tracking-tight">Ed25519</span>
                    <Shield className="w-5 h-5 text-[#4cd7f6]" />
                  </div>
                  <span className="text-[11px] text-[#86948a] font-mono mt-2">Hardware enclave ledger</span>
                </div>

                {/* Card 3: MIMO LLM Copilot */}
                <div className="flex flex-col justify-between p-5 rounded-lg bg-[#1b1b1f] hover:bg-[#1f1f23] transition-all group relative overflow-hidden border border-white/[0.07] shadow-sm min-h-[142px]">
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#4edea3]/40 to-transparent" />
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="text-[11px] text-[#bbcabf] uppercase tracking-wider font-mono">MIMO Copilot</span>
                    <span className="px-2 py-0.5 rounded bg-[#10b981]/20 text-[#4edea3] text-[11px] font-mono font-medium">
                      Zero Drift
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between my-1">
                    <span className="text-[28px] font-bold font-mono text-[#e3e2e6] tracking-tight">
                      &lt;120<span className="text-xs font-mono font-normal text-[#bbcabf] ml-1">ms</span>
                    </span>
                    <Cpu className="w-5 h-5 text-[#4edea3]" />
                  </div>
                  <span className="text-[11px] text-[#86948a] font-mono mt-2">Localized inference node</span>
                </div>
              </div>

              {/* Live Monospace Terminal Ingress Stream Box */}
              <div className="rounded-xl bg-[#0d0e11] border border-white/[0.09] shadow-lg overflow-hidden relative">
                {/* Top Specular Highlight */}
                <div className="h-[1.5px] w-full bg-gradient-to-r from-transparent via-white/[0.2] to-transparent" />
                
                {/* Terminal Title Bar */}
                <div className="px-5 py-3.5 bg-[#1b1b1f] border-b border-white/[0.07] flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-[#ffb4ab]/85" />
                      <span className="w-3 h-3 rounded-full bg-[#4cd7f6]/85" />
                      <span className="w-3 h-3 rounded-full bg-[#4edea3]/85" />
                    </div>
                    <span className="text-xs font-mono text-[#e3e2e6] flex items-center gap-2">
                      <span>mesh-edge-us-east-1</span>
                      <span className="text-white/40">::</span>
                      <span className="text-[#4edea3] font-semibold">Active Primary</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="px-2 py-0.5 rounded bg-[#1f1f23] text-[#bbcabf] text-[11px] font-mono border border-white/[0.06]">
                      TLS 1.3
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#10b981]/20 text-[#4edea3] text-[11px] font-mono flex items-center gap-1.5 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-ping" />
                      LIVE INGRESS
                    </span>
                  </div>
                </div>

                {/* Monospace Telemetry Metrics Sub-grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 p-5 sm:p-6 gap-6 sm:gap-8 bg-[#0d0e11]/90 font-mono text-xs border-b border-white/[0.05]">
                  <div className="flex flex-col">
                    <span className="text-[11px] text-[#86948a]">GATEWAY PORT</span>
                    <span className="text-sm text-[#e3e2e6] font-semibold mt-1">:18080 (gRPC/h2)</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] text-[#86948a]">AUTH HANDSHAKE</span>
                    <span className="text-sm text-[#4edea3] font-semibold mt-1">JWKS Validated ✓</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] text-[#86948a]">RSS MEMORY</span>
                    <span className="text-sm text-[#e3e2e6] font-semibold mt-1">16.2 MB (0.01%)</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] text-[#86948a]">AUDIT LEDGER</span>
                    <span className="text-sm text-[#4cd7f6] font-semibold mt-1">SHA-256 Sig OK</span>
                  </div>
                </div>

                {/* Live Log Ingress Line */}
                <div className="px-5 py-3.5 bg-[#141720] flex items-center justify-between text-xs font-mono overflow-x-auto whitespace-nowrap">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[#4edea3] font-bold">&gt;&gt;</span>
                    <span className="text-[#e3e2e6] font-medium">{currentLog.type}:</span>
                    <span className="text-[#bbcabf]">{currentLog.message}</span>
                    <span className="text-[#4cd7f6] bg-[#4cd7f6]/10 px-1.5 py-0.5 rounded border border-[#4cd7f6]/25">
                      {currentLog.hash}
                    </span>
                  </div>
                  <span className="text-[#86948a] text-[11px] ml-4">{currentLog.time}</span>
                </div>
              </div>

              {/* Dual Architecture Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-5 pt-1">
                <div className="flex items-start gap-4 p-5 rounded-lg bg-[#1b1b1f]/80 border border-white/[0.06]">
                  <div className="w-9 h-9 rounded-lg bg-[#292a2d] flex items-center justify-center shrink-0 text-[#4edea3] border border-white/[0.08]">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-[#e3e2e6]">Cryptographic Isolation</span>
                    <span className="text-xs text-[#bbcabf] mt-1.5 leading-relaxed">
                      Hardware-enforced Ed25519 signing keys within isolated Intel SGX ring-0 enclaves.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-5 rounded-lg bg-[#1b1b1f]/80 border border-white/[0.06]">
                  <div className="w-9 h-9 rounded-lg bg-[#292a2d] flex items-center justify-center shrink-0 text-[#4cd7f6] border border-white/[0.08]">
                    <Server className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-[#e3e2e6]">Deterministic Edge Mesh</span>
                    <span className="text-xs text-[#bbcabf] mt-1.5 leading-relaxed">
                      Sub-millisecond CRDT delta synchronization guaranteed across 42 global AZ instances.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* =================================================================== */}
            {/* RIGHT COLUMN: Enterprise Auth & Gateway Module (5 cols)            */}
            {/* =================================================================== */}
            <div className="lg:col-span-5 w-full">
              <div className="rounded-2xl bg-[#1b1b1f] border border-white/[0.08] shadow-2xl relative overflow-hidden p-7 sm:p-8 flex flex-col gap-7">
                {/* Specular Top Rim Gradient */}
                <div className="absolute inset-x-0 top-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#4edea3]/65 to-transparent" />

                {/* Card Header & Status */}
                <div className="flex items-center justify-between pb-1">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#292a2d] text-[#e3e2e6] text-xs font-mono border border-white/[0.07]">
                    <span className="w-2 h-2 rounded-full bg-[#4edea3] shadow-[0_0_8px_rgba(78,222,163,0.8)]" />
                    <span>GATEWAY INGRESS</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#bbcabf] font-mono">
                    <Key className="w-4 h-4 text-[#4cd7f6]" />
                    <span>FIDO2 / WebAuthn</span>
                  </div>
                </div>

                {/* If User is already signed in with Clerk */}
                {isLoaded && isSignedIn ? (
                  <div className="flex flex-col gap-5 py-2">
                    <div className="flex items-center gap-4 p-5 rounded-xl bg-[#141720] border border-[#10b981]/35">
                      <div className="w-12 h-12 rounded-full bg-[#10b981]/20 flex items-center justify-center text-[#4edea3] font-bold text-base border border-[#10b981]/40">
                        {user?.firstName?.[0] || user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() || "U"}
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-white truncate">
                            {user?.fullName || user?.primaryEmailAddress?.emailAddress}
                          </span>
                          <CheckCircle2 className="w-4 h-4 text-[#4edea3] shrink-0" />
                        </div>
                        <span className="text-xs text-[#4edea3] font-mono mt-0.5">Identity Verified • Session Active</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <button
                        onClick={() => router.push("/dashboard")}
                        className="w-full h-12 rounded-lg font-medium text-sm text-[#003824] bg-[#4edea3] hover:bg-[#6ffbbe] transition-all shadow-[0_0_20px_rgba(78,222,163,0.35)] hover:shadow-[0_0_28px_rgba(78,222,163,0.5)] flex items-center justify-center gap-2 cursor-pointer font-sans"
                      >
                        <span>Launch Workspace Console</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => router.push("/onboarding")}
                        className="w-full h-11 rounded-lg font-medium text-xs text-[#bbcabf] hover:text-white bg-[#292a2d] hover:bg-[#343538] border border-white/[0.07] transition-all flex items-center justify-center gap-2 cursor-pointer font-sans"
                      >
                        <span>Switch Workspace / Onboarding</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Header Titles */}
                    <div className="flex flex-col gap-1.5">
                      <h2 className="text-2xl sm:text-[26px] font-bold text-[#e3e2e6] tracking-tight">
                        Sign in to OpsPilot
                      </h2>
                      <p className="text-xs sm:text-sm text-[#bbcabf] leading-relaxed">
                        Select your organization&apos;s verified identity provider.
                      </p>
                    </div>

                    {/* Segmented Pill Tabs Navigation */}
                    <div className="p-1.5 rounded-lg bg-[#0d0e11] grid grid-cols-2 gap-2 text-xs border border-white/[0.06]">
                      <button
                        type="button"
                        onClick={() => setActiveTab("sso")}
                        className={`py-2 px-3.5 rounded-md font-medium text-center transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          activeTab === "sso"
                            ? "bg-[#292a2d] text-[#e3e2e6] shadow-sm border border-white/[0.08]"
                            : "text-[#bbcabf] hover:text-[#e3e2e6]"
                        }`}
                      >
                        <Shield className={`w-4 h-4 ${activeTab === "sso" ? "text-[#4edea3]" : ""}`} />
                        <span>Enterprise SSO</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab("creds")}
                        className={`py-2 px-3.5 rounded-md font-medium text-center transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          activeTab === "creds"
                            ? "bg-[#292a2d] text-[#e3e2e6] shadow-sm border border-white/[0.08]"
                            : "text-[#bbcabf] hover:text-[#e3e2e6]"
                        }`}
                      >
                        <Key className={`w-4 h-4 ${activeTab === "creds" ? "text-[#4edea3]" : ""}`} />
                        <span>Work Credentials</span>
                      </button>
                    </div>

                    {/* TAB 1 CONTENT: Enterprise SSO Panel */}
                    {activeTab === "sso" && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col gap-4"
                      >
                        {/* GitHub Enterprise Ingress Button */}
                        <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                          <button
                            type="button"
                            className="w-full flex items-center justify-between p-4 rounded-xl bg-[#141720] hover:bg-[#1d2230] border border-white/[0.07] hover:border-white/[0.14] transition-colors group cursor-pointer"
                          >
                            <div className="flex items-center gap-3.5">
                              {/* GitHub Vector Icon */}
                              <div className="w-8 h-8 rounded-lg bg-[#292a2d] flex items-center justify-center text-[#e3e2e6]">
                                <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 24 24">
                                  <path
                                    fillRule="evenodd"
                                    clipRule="evenodd"
                                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                                  />
                                </svg>
                              </div>
                              <div className="flex flex-col text-left">
                                <span className="text-sm font-semibold text-[#e3e2e6] leading-none">
                                  GitHub Enterprise Cloud
                                </span>
                                <span className="text-[11px] text-[#86948a] font-mono mt-1">
                                  Single sign-on via SAML mapping
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-[#10b981]/20 text-[#4edea3] text-[10px] font-mono font-medium">
                                RECENT
                              </span>
                              <kbd className="px-2 py-0.5 rounded bg-[#0d0e11] text-[#bbcabf] text-[11px] font-mono shadow-xs border border-white/[0.06]">
                                ⌘G
                              </kbd>
                            </div>
                          </button>
                        </SignInButton>

                        {/* Okta / SAML 2.0 Ingress Button */}
                        <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                          <button
                            type="button"
                            className="w-full flex items-center justify-between p-4 rounded-xl bg-[#141720] hover:bg-[#1d2230] border border-white/[0.07] hover:border-white/[0.14] transition-colors group cursor-pointer"
                          >
                            <div className="flex items-center gap-3.5">
                              <div className="w-8 h-8 rounded-lg bg-[#292a2d] flex items-center justify-center text-[#4cd7f6]">
                                <ShieldCheck className="w-4.5 h-4.5" />
                              </div>
                              <div className="flex flex-col text-left">
                                <span className="text-sm font-semibold text-[#e3e2e6] leading-none">
                                  Okta / SAML 2.0 Ingress
                                </span>
                                <span className="text-[11px] text-[#86948a] font-mono mt-1">
                                  Direct corporate identity provider
                                </span>
                              </div>
                            </div>
                            <ArrowRight className="w-4.5 h-4.5 text-[#86948a] group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        </SignInButton>

                        {/* Monochromatic Divider */}
                        <div className="relative flex items-center my-2 py-1">
                          <div className="w-full h-px bg-white/[0.08]" />
                          <span className="absolute left-1/2 -translate-x-1/2 bg-[#1b1b1f] px-3 text-[11px] font-mono text-[#86948a] uppercase tracking-wider whitespace-nowrap">
                            Or Enterprise Work Email
                          </span>
                        </div>

                        {/* Email Input Field */}
                        <div className="flex flex-col gap-2">
                          <label
                            className="text-[11px] text-[#bbcabf] font-mono flex items-center justify-between"
                            htmlFor="sso-email"
                          >
                            <span>IDENTITY PRINCIPAL IDENTIFIER</span>
                            <span className="text-[#4edea3] font-mono text-[10px]">VERIFIED ROUTE</span>
                          </label>
                          <div className="relative flex items-center">
                            <Building className="absolute left-3.5 w-4 h-4 text-[#86948a]" />
                            <input
                              id="sso-email"
                              type="email"
                              value={ssoEmail}
                              onChange={(e) => setSsoEmail(e.target.value)}
                              placeholder="alex.chen@sovereign-logistics.com"
                              className="w-full h-12 pl-10 pr-4 rounded-lg bg-[#0d0e11] text-[#e3e2e6] placeholder:text-[#86948a]/60 font-mono text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-[#4edea3] border border-white/[0.08] shadow-inner"
                            />
                          </div>
                        </div>

                        {/* Primary Action CTA Button */}
                        <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                          <button
                            type="button"
                            className="w-full h-12 rounded-lg font-medium text-sm text-[#003824] bg-[#4edea3] hover:bg-[#6ffbbe] transition-all shadow-[0_0_18px_rgba(78,222,163,0.35)] hover:shadow-[0_0_26px_rgba(78,222,163,0.5)] flex items-center justify-center gap-2 cursor-pointer group active:scale-[0.99] font-sans mt-1"
                          >
                            <span>Authenticate &amp; Route to Gateway</span>
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        </SignInButton>
                      </motion.div>
                    )}

                    {/* TAB 2 CONTENT: Work Credentials Panel */}
                    {activeTab === "creds" && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col gap-4"
                      >
                        {/* Work Email Input */}
                        <div className="flex flex-col gap-2">
                          <label className="text-[11px] text-[#bbcabf] font-mono" htmlFor="cred-email">
                            WORK ACCOUNT EMAIL
                          </label>
                          <div className="relative flex items-center">
                            <Mail className="absolute left-3.5 w-4 h-4 text-[#86948a]" />
                            <input
                              id="cred-email"
                              type="email"
                              value={credEmail}
                              onChange={(e) => setCredEmail(e.target.value)}
                              placeholder="operator@datacenter.net"
                              className="w-full h-12 pl-10 pr-4 rounded-lg bg-[#0d0e11] text-[#e3e2e6] placeholder:text-[#86948a]/60 font-mono text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-[#4edea3] border border-white/[0.08] shadow-inner"
                            />
                          </div>
                        </div>

                        {/* Password Input with Toggle */}
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <label className="text-[#bbcabf] font-mono" htmlFor="cred-password">
                              HARDWARE-BOUND PASSWORD
                            </label>
                            <button
                              type="button"
                              onClick={() => router.push("/sign-in")}
                              className="text-[#4edea3] hover:underline font-mono"
                            >
                              Forgot token?
                            </button>
                          </div>
                          <div className="relative flex items-center">
                            <Lock className="absolute left-3.5 w-4 h-4 text-[#86948a]" />
                            <input
                              id="cred-password"
                              type={showPassword ? "text" : "password"}
                              value={credPassword}
                              onChange={(e) => setCredPassword(e.target.value)}
                              placeholder="••••••••••••••••••••"
                              className="w-full h-12 pl-10 pr-10 rounded-lg bg-[#0d0e11] text-[#e3e2e6] placeholder:text-[#86948a]/60 font-mono text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-[#4edea3] border border-white/[0.08] shadow-inner"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3.5 text-[#86948a] hover:text-[#e3e2e6] cursor-pointer"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Security Options Row */}
                        <div className="flex items-center justify-between pt-1 text-xs">
                          <label className="flex items-center gap-2.5 text-[#bbcabf] cursor-pointer select-none text-xs">
                            <input
                              type="checkbox"
                              checked={rememberSession}
                              onChange={(e) => setRememberSession(e.target.checked)}
                              className="w-4 h-4 rounded bg-[#0d0e11] accent-[#10b981] border-white/20 cursor-pointer"
                            />
                            <span>Remember session for 30 days</span>
                          </label>
                          <span className="text-[11px] text-[#4cd7f6] font-mono font-medium">YubiKey Ready</span>
                        </div>

                        {/* Authorize CTA Button */}
                        <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                          <button
                            type="button"
                            className="w-full h-12 rounded-lg font-medium text-sm text-[#003824] bg-[#4edea3] hover:bg-[#6ffbbe] transition-all shadow-[0_0_18px_rgba(78,222,163,0.35)] hover:shadow-[0_0_26px_rgba(78,222,163,0.5)] flex items-center justify-center gap-2 cursor-pointer group active:scale-[0.99] font-sans mt-1"
                          >
                            <span>Authorize Credentials</span>
                            <Key className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        </SignInButton>
                      </motion.div>
                    )}
                  </>
                )}

                {/* Trust & Cryptographic Badges Footer */}
                <div className="pt-4 flex flex-col gap-4 border-t border-white/[0.08]">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#bbcabf]/80 font-mono">
                    <div className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-[#4edea3]" />
                      <span>TLS 1.3 / AES-256-GCM</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-[#4cd7f6]" />
                      <span>Confidential Enclave</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Fingerprint className="w-3.5 h-3.5 text-[#4edea3]" />
                      <span>FIDO2 WebAuthn</span>
                    </div>
                  </div>

                  <div className="text-center text-xs text-[#86948a] leading-relaxed">
                    Need help setting up automated API service principal tokens?
                    <Link
                      href="/settings"
                      className="text-[#4edea3] hover:underline font-mono ml-1.5 inline-flex items-center gap-1"
                    >
                      Setup Guide <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* GLOBAL FOOTER: SLA Metrics & Cryptographic Audit Standards                */}
      {/* ========================================================================= */}
      <footer className="w-full bg-[#0d0e11]/85 backdrop-blur-md border-t border-white/[0.06]">
        <div className="h-14 w-full max-w-[1480px] xl:max-w-[1560px] mx-auto px-6 sm:px-10 lg:px-12 flex items-center justify-between text-xs text-[#bbcabf] font-mono">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-[#4edea3]">
              <span className="w-2 h-2 rounded-full bg-[#4edea3]" />
              <span>99.995% SLA operational</span>
            </div>
            <div className="hidden md:flex items-center gap-2.5 text-[#86948a]">
              <span>ECDSA-P256 verified</span>
              <span>•</span>
              <span>TLS 1.3</span>
              <span>•</span>
              <span>SOC-2 Type II</span>
            </div>
          </div>

          <div className="flex items-center gap-5 text-xs font-sans">
            <Link href="/settings" className="hover:text-white transition-colors">
              API Reference
            </Link>
            <Link href="/signals" className="hover:text-white transition-colors">
              System Status
            </Link>
            <Link href="/dashboard" className="hover:text-white transition-colors">
              Changelog
            </Link>
          </div>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* COMMAND PALETTE (⌘K MODAL)                                               */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isCommandOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#141720] border border-white/[0.12] rounded-xl shadow-2xl overflow-hidden"
            >
              {/* Search input */}
              <div className="flex items-center px-4 py-3.5 border-b border-white/[0.08] gap-3">
                <Search className="w-4 h-4 text-[#86948a]" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Jump to telemetry service or view..."
                  className="w-full bg-transparent text-sm text-[#e3e2e6] placeholder:text-[#86948a] focus:outline-none font-sans"
                />
                <button
                  onClick={() => setIsCommandOpen(false)}
                  className="p-1 rounded hover:bg-white/[0.06] text-[#86948a] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Suggestions */}
              <div className="p-2.5 max-h-80 overflow-y-auto space-y-1">
                {quickLinks.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#86948a]">No matching navigation routes found.</div>
                ) : (
                  quickLinks.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => {
                        setIsCommandOpen(false);
                        router.push(item.path);
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-[#1f1f23] transition-colors text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="w-4 h-4 text-[#4edea3]" />
                        <span className="text-xs font-medium text-[#e3e2e6] group-hover:text-white">
                          {item.label}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-[#292a2d] text-[10px] font-mono text-[#bbcabf]">
                        {item.tag}
                      </span>
                    </button>
                  ))
                )}
              </div>

              {/* Command Footer */}
              <div className="px-4 py-2.5 bg-[#0d0e11] border-t border-white/[0.06] flex items-center justify-between text-[11px] text-[#86948a] font-mono">
                <span>Navigation Shortcut</span>
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 rounded bg-[#1f1f23] text-[10px]">Esc</kbd> to close
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
