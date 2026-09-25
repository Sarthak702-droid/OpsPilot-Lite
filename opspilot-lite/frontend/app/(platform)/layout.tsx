"use client";
import { useAuth, UserButton } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppSidebar, MobileNav } from "@/components/layout/app-sidebar";
import { TokenProvider } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import type { Organization } from "@/types/api";
export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useAuth(); const router = useRouter(); const path = usePathname();
  const org = useQuery({ queryKey: ["organization"], queryFn: async () => api<Organization>("/api/organization/me", await getToken()), enabled: !!isSignedIn });
  useEffect(() => { if (isLoaded && !isSignedIn) router.replace("/login"); else if (org.data && !org.data.onboarded && path !== "/onboarding") router.replace("/onboarding"); else if (org.data?.onboarded && path === "/onboarding") router.replace("/dashboard"); }, [isLoaded, isSignedIn, org.data, path, router]);
  if (!isLoaded || !isSignedIn || org.isLoading) {
    return (
      <div className="min-h-screen w-full auth-bg-gradient flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#145f55] to-[#0e4d45] flex items-center justify-center text-white font-black text-xl shadow-lg shadow-[#145f55]/25 animate-pulse">
            O
          </div>
          <p className="text-sm font-semibold text-slate-700">Connecting to OpsPilot workspace...</p>
          <div className="w-40 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#145f55] rounded-full auth-shimmer w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (org.isError) {
    const errorMsg = org.error instanceof Error ? org.error.message : "Failed to authenticate session with API";
    return (
      <div className="min-h-screen w-full auth-bg-gradient flex items-center justify-center p-6">
        <div className="w-full max-w-[460px] rounded-2xl border border-rose-200/80 bg-white/95 backdrop-blur-xl p-8 shadow-2xl text-center space-y-5">
          <div className="w-12 h-12 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto text-xl font-bold">
            !
          </div>

          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-slate-900">API Connection Required</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Could not authenticate with the OpsPilot API server at <code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[11px] text-slate-800">http://localhost:18080</code>.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-left space-y-1">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Diagnostic Reason</div>
            <div className="text-xs font-mono text-rose-700 break-all">{errorMsg}</div>
          </div>

          <div className="space-y-2 pt-1">
            <button 
              onClick={() => org.refetch()} 
              className="w-full h-10 rounded-xl bg-[#145f55] hover:bg-[#0e4d45] text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2"
            >
              Retry Connection
            </button>
            <div className="flex items-center justify-center gap-2 pt-2">
              <span className="text-xs text-slate-500">Need to switch account?</span>
              <UserButton />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TokenProvider getToken={getToken}>
      <div className="app-shell">
        <AppSidebar />
        <div className="main-area">
          <header className="topbar">
            <span className="topbar-breadcrumb">Workspace / {path.split("/")[1] || "dashboard"}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ color: "var(--muted)", fontSize: 12 }}>{org.data?.name ?? "Setup"}</span>
              <UserButton />
            </div>
          </header>
          <MobileNav />
          <main className="page">{children}</main>
        </div>
      </div>
    </TokenProvider>
  );
}

