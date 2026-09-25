"use client";

import { Loader2, ShieldCheck, Sparkles } from "lucide-react";

export function AuthLoading({ mode = "sign-in" }: { mode?: "sign-in" | "sign-up" | "missing-fields" }) {
  return (
    <div className="w-full max-w-[440px] mx-auto rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-xl p-8 shadow-2xl transition-all duration-300">
      {/* Top Header Placeholder */}
      <div className="flex flex-col items-center text-center space-y-3 mb-8">
        <div className="relative">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#145f55] to-[#1e8275] flex items-center justify-center text-white shadow-lg shadow-[#145f55]/20 animate-pulse">
            <Sparkles className="w-6 h-6 animate-spin text-emerald-200" style={{ animationDuration: "3s" }} />
          </div>
          <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white"></span>
          </span>
        </div>

        <div className="space-y-1.5 w-full flex flex-col items-center">
          <div className="h-6 w-44 rounded-lg auth-shimmer" />
          <div className="h-4 w-60 rounded-md auth-shimmer" />
        </div>
      </div>

      {/* Simulated Form Field Skeleton */}
      <div className="space-y-4 mb-6">
        <div className="space-y-1.5">
          <div className="h-3.5 w-20 rounded auth-shimmer" />
          <div className="h-11 w-full rounded-xl auth-shimmer border border-slate-200/60" />
        </div>

        {mode === "sign-up" && (
          <div className="space-y-1.5">
            <div className="h-3.5 w-24 rounded auth-shimmer" />
            <div className="h-11 w-full rounded-xl auth-shimmer border border-slate-200/60" />
          </div>
        )}

        <div className="space-y-1.5">
          <div className="h-3.5 w-16 rounded auth-shimmer" />
          <div className="h-11 w-full rounded-xl auth-shimmer border border-slate-200/60" />
        </div>

        <div className="pt-2">
          <div className="h-11 w-full rounded-xl bg-gradient-to-r from-[#145f55] to-[#1a7367] flex items-center justify-center text-white/90 font-medium text-sm gap-2 shadow-md shadow-[#145f55]/20">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Securing session...</span>
          </div>
        </div>
      </div>

      {/* Footer / Trust note */}
      <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400">
        <ShieldCheck className="w-4 h-4 text-emerald-600" />
        <span>256-bit encrypted authentication</span>
      </div>
    </div>
  );
}
