"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  Plus,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Hash,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { useToken } from "@/lib/auth-context";
import { getInvoices } from "@/services/invoices.service";
import { getOrganization } from "@/services/organization.service";
import { getPayments, recordPayment, reversePayment } from "@/services/payments.service";
import { date, money } from "@/lib/utils";

export function PaymentsView() {
  const token = useToken();
  const qc = useQueryClient();
  const [showRecord, setShowRecord] = useState(false);
  const [invoice, setInvoice] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [method, setMethod] = useState("Bank Transfer");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [reversing, setReversing] = useState("");
  const [reason, setReason] = useState("");

  const org = useQuery({ queryKey: ["organization"], queryFn: async () => getOrganization(await token()) });
  const invoices = useQuery({ queryKey: ["invoices"], queryFn: async () => getInvoices(await token()) });
  const payments = useQuery({ queryKey: ["payments"], queryFn: async () => getPayments(await token()) });

  const canWrite = ["OWNER", "ADMIN", "MANAGER"].includes(org.data?.role ?? "");

  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["payments"] }),
      qc.invalidateQueries({ queryKey: ["invoices"] }),
      qc.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
  };

  const record = useMutation({
    mutationFn: async () =>
      recordPayment(await token(), {
        invoice_id: invoice,
        amount,
        payment_date: paymentDate,
        payment_method: method,
        reference_number: reference,
      }),
    onSuccess: async () => {
      setInvoice("");
      setAmount("");
      setReference("");
      setShowRecord(false);
      await refresh();
    },
  });

  const reverse = useMutation({
    mutationFn: async () => reversePayment(await token(), reversing, reason),
    onSuccess: async () => {
      setReversing("");
      setReason("");
      await refresh();
    },
  });

  const unpaidInvoices =
    invoices.data?.items.filter(
      (x) => x.outstanding > 0 && !["DRAFT", "CANCELLED"].includes(x.status)
    ) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Payment Receipts & Cash Settlements"
          description="Log incoming customer remittances, settle invoice balances, and audit transaction reversals."
        />

        {canWrite && (
          <button
            onClick={() => setShowRecord((v) => !v)}
            className="self-start sm:self-auto px-4 py-2 rounded-xl bg-[#145f55] hover:bg-[#0e4d45] text-white font-semibold text-xs shadow-xs hover:shadow-md transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{showRecord ? "Close Drawer" : "Record Remittance"}</span>
          </button>
        )}
      </div>

      {/* Record Payment Drawer */}
      <AnimatePresence>
        {showRecord && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="card p-6 rounded-2xl border border-emerald-900/10 bg-white shadow-md space-y-5 max-w-3xl">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Record Customer Remittance</h2>
                  <p className="text-xs text-slate-500">Allocates funds against an outstanding customer invoice</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Target Unpaid Invoice
                  </label>
                  <select
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 focus:bg-white focus:border-[#145f55] outline-none"
                    value={invoice}
                    onChange={(e) => {
                      setInvoice(e.target.value);
                      const sel = invoices.data?.items.find((x) => x.id === e.target.value);
                      setAmount(sel ? String(sel.outstanding) : "");
                    }}
                  >
                    <option value="">Select unpaid invoice ({unpaidInvoices.length} available)</option>
                    {unpaidInvoices.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.invoice_number} • {x.customer} • {money(x.outstanding)} outstanding
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Remittance Amount (₹)
                    </label>
                    <input
                      className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-mono"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Settlement Date
                    </label>
                    <input
                      className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-mono"
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Payment Mode
                    </label>
                    <input
                      className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs"
                      value={method}
                      onChange={(e) => setMethod(e.target.value)}
                      placeholder="e.g. NEFT, RTGS, UPI"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Transaction Reference / UTR
                    </label>
                    <input
                      className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-mono"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="e.g. UTR-982144"
                    />
                  </div>
                </div>

                {record.isError && (
                  <p className="text-xs text-rose-600 font-medium">{record.error.message}</p>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRecord(false)}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={record.isPending || !invoice || !amount || !reference}
                    onClick={() => record.mutate()}
                    className="px-4 py-1.5 rounded-xl bg-[#145f55] hover:bg-[#0e4d45] disabled:opacity-50 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
                  >
                    {record.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Confirm Settlement
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Payments Table */}
      <div className="card rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        <div className="p-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700">Remittance Log</span>
          <span className="text-[11px] font-semibold text-slate-400">
            {payments.data?.items.length ?? 0} transactions
          </span>
        </div>

        <div className="table-wrap">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Mode</th>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {payments.data?.items.map((x) => (
                <tr key={x.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">{date(x.payment_date)}</td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{x.invoice_number}</td>
                  <td className="py-3 px-4 font-mono font-bold text-emerald-700">{money(Number(x.amount))}</td>
                  <td className="py-3 px-4 text-slate-600">{x.payment_method || "Direct"}</td>
                  <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">{x.reference_number}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        x.reversed_at
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      }`}
                    >
                      {x.reversed_at ? "Reversed" : "Settled"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {canWrite && !x.reversed_at && (
                      <button
                        onClick={() => {
                          setReversing(x.id);
                          setReason("");
                        }}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-xs font-semibold transition-all inline-flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" /> Reverse
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!payments.isLoading && payments.data?.items.length === 0 && (
            <div className="p-12 text-center text-xs text-slate-400">No payment receipts recorded yet.</div>
          )}
        </div>
      </div>

      {/* Reversal Confirmation Modal Drawer */}
      <AnimatePresence>
        {reversing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-6 rounded-2xl border border-rose-200 bg-rose-50/40 space-y-4 max-w-xl"
          >
            <div className="flex items-center gap-2 text-rose-800 text-sm font-bold">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>Confirm Remittance Reversal</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Reversing this payment restores the invoice balance and creates an immutable reversal record in the PostgreSQL audit log.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Audited Reason for Reversal <span className="text-rose-500">*</span>
              </label>
              <input
                className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:border-rose-500 outline-none"
                placeholder="e.g. Bank chargeback / Bounced cheque"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                minLength={3}
                maxLength={500}
              />
            </div>

            {reverse.isError && (
              <p className="text-xs text-rose-600 font-medium">{reverse.error.message}</p>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setReversing("")}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={reverse.isPending || reason.trim().length < 3}
                onClick={() => reverse.mutate()}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs"
              >
                {reverse.isPending ? "Executing..." : "Confirm Reversal"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
