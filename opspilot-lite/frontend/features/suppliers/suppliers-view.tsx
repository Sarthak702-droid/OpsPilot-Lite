"use client";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { useToken } from "@/lib/auth-context";
import { getSuppliers } from "@/services/suppliers.service";
import type { Supplier } from "@/types/api";
const columns: Column<Supplier>[] = [{ label: "Supplier", render: x => <strong>{x.name}</strong> }, { label: "Supplier ID", render: x => <code style={{fontSize:11}}>{x.id}</code> }, { label: "Orders", render: x => x.orders }, { label: "Lead time", render: x => `${x.lead_time_days.toFixed(1)} days` }, { label: "On-time", render: x => x.delivered ? `${x.on_time_rate.toFixed(0)}%` : "—" }, { label: "Delayed", render: x => x.late }, { label: "Reliability", render: x => x.risk === "INSUFFICIENT_DATA" ? "Insufficient data" : <Badge value={x.risk} /> }];
export function SuppliersView() { const token = useToken(); const q = useQuery({ queryKey: ["suppliers"], queryFn: async () => getSuppliers(await token()) }); return <><PageHeader title="Suppliers" description="Delivery history and reliability based on purchase orders." />{q.isLoading ? <div className="empty">Loading suppliers…</div> : q.isError ? <div className="empty">Could not load suppliers.</div> : <DataTable items={q.data?.items ?? []} columns={columns} empty="No suppliers imported yet." />}</>; }
