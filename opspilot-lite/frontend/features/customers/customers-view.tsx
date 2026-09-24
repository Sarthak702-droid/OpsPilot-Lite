"use client";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, type Column } from "@/components/ui/data-table";
import { useToken } from "@/lib/auth-context";
import { getCustomers } from "@/services/customers.service";
import { date, money } from "@/lib/utils";
import type { Customer } from "@/types/api";
const columns: Column<Customer>[] = [{ label: "Customer", render: x => <strong>{x.business_name || x.name}</strong> }, { label: "Customer ID", render: x => <code style={{fontSize:11}}>{x.id}</code> }, { label: "Contact", render: x => x.email || "—" }, { label: "Lifetime revenue", render: x => money(x.lifetime_revenue) }, { label: "Outstanding", render: x => money(x.outstanding) }, { label: "Last purchase", render: x => x.last_purchase ? date(x.last_purchase) : "—" }];
export function CustomersView() { const token = useToken(); const q = useQuery({ queryKey: ["customers"], queryFn: async () => getCustomers(await token()) }); return <><PageHeader title="Customers" description="Revenue and receivables by customer." />{q.isLoading ? <div className="empty">Loading customers…</div> : q.isError ? <div className="empty">Could not load customers.</div> : <DataTable items={q.data?.items ?? []} columns={columns} empty="No customers imported yet." />}</>; }
