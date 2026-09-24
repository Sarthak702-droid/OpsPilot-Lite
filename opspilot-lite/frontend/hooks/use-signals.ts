"use client";
import { useQuery } from "@tanstack/react-query";
import { useToken } from "@/lib/auth-context";
import { getSignals } from "@/services/signals.service";
export function useSignals() { const token=useToken(); return useQuery({queryKey:["signals"],queryFn:async()=>getSignals(await token())}); }

