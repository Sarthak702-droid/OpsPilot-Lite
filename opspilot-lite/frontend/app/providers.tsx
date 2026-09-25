"use client";
import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { createQueryClient } from "@/lib/query-client";
import { env } from "@/lib/env";
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  if (!env.clerkKey) return <div className="empty">Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY to enable sign in.</div>;
  return (
    <ClerkProvider
      publishableKey={env.clerkKey}
      appearance={{
        theme: shadcn,
        variables: {
          colorPrimary: "#145f55",
          colorText: "#0f172a",
          colorTextSecondary: "#64748b",
          colorBackground: "#ffffff",
          colorInputBackground: "#ffffff",
          colorInputText: "#0f172a",
          borderRadius: "0.75rem",
          fontFamily: "inherit",
        },
        elements: {
          card: "shadow-2xl border border-slate-200/90 rounded-2xl bg-white/95 backdrop-blur-xl",
          headerTitle: "text-slate-900 font-extrabold tracking-tight text-xl",
          headerSubtitle: "text-slate-500 font-medium text-sm",
          formButtonPrimary: "bg-[#145f55] hover:bg-[#0e4d45] text-white font-semibold py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.99]",
          formFieldInput: "rounded-xl border-slate-200 bg-slate-50/50 hover:border-slate-300 focus:bg-white focus:border-[#145f55] focus:ring-4 focus:ring-[#145f55]/10 transition-all text-sm",
          formFieldLabel: "text-xs font-semibold uppercase tracking-wider text-slate-600",
          footerActionLink: "text-[#145f55] hover:text-[#0e4d45] font-semibold hover:underline",
          dividerLine: "bg-slate-200",
          dividerText: "text-slate-400 font-medium text-xs uppercase tracking-wider",
          socialButtonsBlockButton: "border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all rounded-xl font-medium",
        },
      }}
    >
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ClerkProvider>
  );
}
