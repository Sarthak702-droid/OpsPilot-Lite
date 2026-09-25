"use client";

import Link from "next/link";
import { SignInButton, SignUpButton, UserButton, useAuth } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth/auth-shell";
import { ArrowRight, Loader2, Sparkles, Building2, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export default function Login() {
  const { isLoaded, isSignedIn } = useAuth();

  return (
    <AuthShell mode="login">
      <div className="w-full max-w-[440px] rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-xl p-8 shadow-2xl text-center space-y-6">
        
        {/* Animated Brand Header */}
        <div className="flex flex-col items-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#145f55] to-[#0e4d45] flex items-center justify-center text-white font-black text-xl shadow-lg shadow-[#145f55]/25">
            O
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Welcome to OpsPilot
          </h2>
          <p className="text-xs text-slate-500 max-w-xs">
            Authenticate to access your organization dashboard, live inventory metrics, and PO execution queue.
          </p>
        </div>

        {/* Action States */}
        {!isLoaded && (
          <div className="flex flex-col items-center justify-center py-6 space-y-3">
            <Loader2 className="w-7 h-7 text-[#145f55] animate-spin" />
            <span className="text-xs text-slate-400 font-medium">Verifying authentication state...</span>
          </div>
        )}

        {isLoaded && !isSignedIn && (
          <div className="space-y-3 pt-2">
            <SignInButton mode="redirect" forceRedirectUrl="/dashboard">
              <button className="w-full h-11 rounded-xl bg-[#145f55] hover:bg-[#0e4d45] text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 group">
                <span>Sign in with Clerk</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </SignInButton>

            <SignUpButton mode="redirect" forceRedirectUrl="/onboarding">
              <button className="w-full h-11 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2">
                <span>Create new account</span>
              </button>
            </SignUpButton>
          </div>
        )}

        {isLoaded && isSignedIn && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-xl bg-emerald-50/80 border border-emerald-200/80 p-5 space-y-4"
          >
            <div className="flex items-center justify-center gap-3">
              <div className="p-1 rounded-full bg-white shadow-xs border border-emerald-200">
                <UserButton afterSignOutUrl="/login" />
              </div>
              <div className="text-left">
                <div className="text-xs font-semibold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Authenticated Session
                </div>
                <div className="text-[11px] text-emerald-700">Ready to enter operations console</div>
              </div>
            </div>

            <Link 
              href="/dashboard"
              className="w-full h-11 rounded-xl bg-[#145f55] hover:bg-[#0e4d45] text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              <span>Open Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        )}

        {/* Feature Pills Footer */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-around text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-emerald-700" /> Multi-Tenant
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-teal-700" /> AI Insights
          </span>
          <span>•</span>
          <span>Role RBAC</span>
        </div>
      </div>
    </AuthShell>
  );
}
