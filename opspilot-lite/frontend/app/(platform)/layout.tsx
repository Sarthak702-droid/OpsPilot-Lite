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
  if (!isLoaded || !isSignedIn || org.isLoading) return <div className="empty">Loading workspace…</div>;
  if (org.isError) return <div className="empty">Could not connect to the OpsPilot API. Check the backend and Clerk configuration.</div>;
  return <TokenProvider getToken={getToken}><div className="app-shell"><AppSidebar /><div className="main-area"><header className="topbar"><span className="topbar-breadcrumb">Workspace / {path.split("/")[1] || "dashboard"}</span><div style={{ display: "flex", alignItems: "center", gap: 14 }}><span style={{ color: "var(--muted)", fontSize: 12 }}>{org.data?.name ?? "Setup"}</span><UserButton /></div></header><MobileNav /><main className="page">{children}</main></div></div></TokenProvider>;
}

