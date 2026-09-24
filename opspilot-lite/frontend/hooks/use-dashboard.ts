"use client";
import { useQuery } from "@tanstack/react-query";
import { useToken } from "@/lib/auth-context";
import { getDashboard } from "@/services/dashboard.service";
export function useDashboard() { const token=useToken(); return useQuery({queryKey:["dashboard"],queryFn:async()=>getDashboard(await token())}); }

