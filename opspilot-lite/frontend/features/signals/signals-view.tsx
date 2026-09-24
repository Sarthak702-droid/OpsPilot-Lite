"use client";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { useToken } from "@/lib/auth-context";
import { getSignals } from "@/services/signals.service";
import { date } from "@/lib/utils";
import type { Signal } from "@/types/api";
const columns: Column<Signal>[] = [{ label: "Severity", render: x => <Badge value={x.severity} /> }, { label: "Signal", render: x => <strong>{x.title}</strong> }, { label: "Evidence", render: x => x.description }, { label: "Area", render: x => x.signal_type.replaceAll("_", " ") }, { label: "Detected", render: x => date(x.created_at) }];
export function SignalsView() { const token = useToken(); const q = useQuery({ queryKey: ["signals"], queryFn: async () => getSignals(await token()) }); return <><PageHeader title="Signals" description="Rule based alerts with inspectable evidence." />{q.isLoading ? <div className="empty">Loading signals…</div> : q.isError ? <div className="empty">Could not load signals.</div> : <DataTable items={q.data?.items ?? []} columns={columns} empty="No active signals. The worker refreshes these every 15 minutes." />}</>; }

