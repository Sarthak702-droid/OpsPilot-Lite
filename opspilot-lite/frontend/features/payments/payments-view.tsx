"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { useToken } from "@/lib/auth-context";
import { getInvoices } from "@/services/invoices.service";
import { getOrganization } from "@/services/organization.service";
import { getPayments, recordPayment, reversePayment } from "@/services/payments.service";
import { date, money } from "@/lib/utils";

export function PaymentsView() {
  const token = useToken(); const qc = useQueryClient();
  const [invoice, setInvoice] = useState(""); const [amount, setAmount] = useState(""); const [reference, setReference] = useState(""); const [method, setMethod] = useState(""); const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [reversing, setReversing] = useState(""); const [reason, setReason] = useState("");
  const org = useQuery({ queryKey: ["organization"], queryFn: async () => getOrganization(await token()) });
  const invoices = useQuery({ queryKey: ["invoices"], queryFn: async () => getInvoices(await token()) });
  const payments = useQuery({ queryKey: ["payments"], queryFn: async () => getPayments(await token()) });
  const canWrite = ["OWNER", "ADMIN", "MANAGER"].includes(org.data?.role ?? "");
  const refresh = async () => { await Promise.all([qc.invalidateQueries({ queryKey: ["payments"] }), qc.invalidateQueries({ queryKey: ["invoices"] }), qc.invalidateQueries({ queryKey: ["dashboard"] })]); };
  const record = useMutation({ mutationFn: async () => recordPayment(await token(), { invoice_id: invoice, amount, payment_date: paymentDate, payment_method: method, reference_number: reference }), onSuccess: async () => { setInvoice(""); setAmount(""); setReference(""); await refresh(); } });
  const reverse = useMutation({ mutationFn: async () => reversePayment(await token(), reversing, reason), onSuccess: async () => { setReversing(""); setReason(""); await refresh(); } });
  return <><PageHeader title="Payments" description="Record invoice payments and reverse errors with an audit trail." />
    {canWrite && <section className="card section-card stack" style={{ maxWidth: 800, marginBottom: 18 }}><h2 className="section-title">Record payment</h2><label>Invoice<select className="input" value={invoice} onChange={e => { setInvoice(e.target.value); const selected = invoices.data?.items.find(x => x.id === e.target.value); setAmount(selected ? String(selected.outstanding) : ""); }}><option value="">Select unpaid invoice</option>{invoices.data?.items.filter(x => x.outstanding > 0 && !["DRAFT", "CANCELLED"].includes(x.status)).map(x => <option key={x.id} value={x.id}>{x.invoice_number} · {x.customer} · {money(x.outstanding)} outstanding</option>)}</select></label><div className="form-grid"><label>Amount<input className="input" type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} /></label><label>Date<input className="input" type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} /></label><label>Method<input className="input" value={method} onChange={e => setMethod(e.target.value)} placeholder="Bank transfer" /></label><label>Unique reference<input className="input" value={reference} onChange={e => setReference(e.target.value)} /></label></div>{record.isError && <p role="alert">{record.error.message}</p>}{record.isSuccess && <p role="status">Payment recorded.</p>}<button className="button primary" disabled={record.isPending || !invoice || !amount || !reference} onClick={() => record.mutate()}>Record payment</button></section>}
    <section className="card table-wrap"><table><thead><tr><th>Date</th><th>Invoice</th><th>Amount</th><th>Reference</th><th>Status</th><th>Action</th></tr></thead><tbody>{payments.data?.items.map(x => <tr key={x.id}><td>{date(x.payment_date)}</td><td>{x.invoice_number}</td><td>{money(Number(x.amount))}</td><td>{x.reference_number}</td><td>{x.reversed_at ? "Reversed" : "Recorded"}</td><td>{canWrite && !x.reversed_at && <button className="button" onClick={() => { setReversing(x.id); setReason(""); }}>Reverse</button>}</td></tr>)}</tbody></table>{!payments.isLoading && payments.data?.items.length === 0 && <div className="empty">No payments recorded yet.</div>}</section>
    {payments.isError && <p role="alert">Could not load payments.</p>}
    {reversing && <section className="card section-card stack" style={{ maxWidth: 600, marginTop: 18 }}><h2 className="section-title">Reverse payment</h2><p>This restores the invoice balance and keeps the original payment in the audit trail.</p><label>Reason<input className="input" value={reason} onChange={e => setReason(e.target.value)} minLength={3} maxLength={500} /></label>{reverse.isError && <p role="alert">{reverse.error.message}</p>}<div className="button-row"><button className="button" onClick={() => setReversing("")}>Cancel</button><button className="button primary" disabled={reverse.isPending || reason.trim().length < 3} onClick={() => reverse.mutate()}>Confirm reversal</button></div></section>}
  </>;
}
