"use client";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { useToken } from "@/lib/auth-context";
import { getInvoices } from "@/services/invoices.service";
import { date, money } from "@/lib/utils";
import type { Invoice } from "@/types/api";
const columns: Column<Invoice>[] = [{ label: "Invoice", render: x => <strong>{x.invoice_number}</strong> }, { label: "Customer", render: x => x.customer }, { label: "Issued", render: x => date(x.invoice_date) }, { label: "Due", render: x => date(x.due_date) }, { label: "Total", render: x => money(x.total) }, { label: "Paid", render: x => money(x.paid) }, { label: "Outstanding", render: x => money(x.outstanding) }, { label: "Status", render: x => x.status }, { label: "Risk", render: x => x.outstanding > 0 && x.days_overdue > 0 ? <Badge value={x.risk} /> : "—" }];
export function InvoicesView() { const token = useToken(); const q = useQuery({ queryKey: ["invoices"], queryFn: async () => getInvoices(await token()) }); return <><PageHeader title="Invoices" description="Outstanding balances and overdue exposure." />{q.isLoading ? <div className="empty">Loading invoices…</div> : q.isError ? <div className="empty">Could not load invoices.</div> : <DataTable items={q.data?.items ?? []} columns={columns} empty="No invoices imported yet." />}</>; }

