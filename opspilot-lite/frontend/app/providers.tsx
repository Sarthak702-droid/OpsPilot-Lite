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
  return <ClerkProvider publishableKey={env.clerkKey} appearance={{ theme: shadcn }}><QueryClientProvider client={queryClient}>{children}</QueryClientProvider></ClerkProvider>;
}
