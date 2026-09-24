"use client";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { useToken } from "@/lib/auth-context";
import { getInventory } from "@/services/inventory.service";
export function InventoryView() { const token = useToken(); const query = useQuery({ queryKey: ["inventory"], queryFn: async () => getInventory(await token()) }); return <><PageHeader title="Inventory" description="Coverage, reorder points, and stockout exposure calculated from transactions." />{query.isLoading ? <div className="empty">Loading inventory…</div> : query.isError ? <div className="empty">Could not load inventory.</div> : <InventoryTable items={query.data?.items ?? []} />}</>; }

