"use client";
import { useQuery } from "@tanstack/react-query";
import { useToken } from "@/lib/auth-context";
import { getInventory } from "@/services/inventory.service";
export function useInventory() { const token=useToken(); return useQuery({queryKey:["inventory"],queryFn:async()=>getInventory(await token())}); }

