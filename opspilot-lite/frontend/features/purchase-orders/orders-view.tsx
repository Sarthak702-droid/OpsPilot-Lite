"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList,
  Plus,
  Trash2,
  Send,
  CheckCircle2,
  XCircle,
  Truck,
  Edit2,
  PackageCheck,
  AlertTriangle,
  Loader2,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { useToken } from "@/lib/auth-context";
import { getOrganization } from "@/services/organization.service";
import { getProducts } from "@/services/products.service";
import { getSuppliers } from "@/services/suppliers.service";
import {
  cancelOrder,
  getOrder,
  getOrders,
  receiveOrder,
  requestOrderSend,
  resolveOrderSend,
  saveOrder,
  type OrderInput,
} from "@/services/purchase-orders.service";
import { date, money } from "@/lib/utils";

const fresh = (): OrderInput => ({
  supplier_id: "",
  po_number: `PO-${Date.now().toString().slice(-6)}`,
  order_date: new Date().toISOString().slice(0, 10),
  expected_delivery_date: "",
  items: [{ product_id: "", quantity: "1", unit_cost: "0" }],
});

export function OrdersView() {
  const token = useToken();
  const qc = useQueryClient();
  const [selected, setSelected] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<OrderInput>(fresh);
  const [receipt, setReceipt] = useState<Record<string, { quantity: string; reference: string }>>({});

  const org = useQuery({ queryKey: ["organization"], queryFn: async () => getOrganization(await token()) });
  const orders = useQuery({ queryKey: ["purchase-orders"], queryFn: async () => getOrders(await token()) });
  const detail = useQuery({
    queryKey: ["purchase-orders", selected],
    queryFn: async () => getOrder(await token(), selected),
    enabled: !!selected,
  });
  const products = useQuery({ queryKey: ["products"], queryFn: async () => getProducts(await token()) });
  const suppliers = useQuery({ queryKey: ["suppliers"], queryFn: async () => getSuppliers(await token()) });

  const canWrite = ["OWNER", "ADMIN", "MANAGER"].includes(org.data?.role ?? "");
  const canAdmin = ["OWNER", "ADMIN"].includes(org.data?.role ?? "");

  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["purchase-orders"] }),
      qc.invalidateQueries({ queryKey: ["actions"] }),
      qc.invalidateQueries({ queryKey: ["inventory"] }),
      qc.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
  };

  const save = useMutation({
    mutationFn: async () => saveOrder(await token(), draft, editing && selected ? selected : undefined),
    onSuccess: async (x) => {
      setSelected(x.id);
      setEditing(false);
      await refresh();
    },
  });

  const request = useMutation({
    mutationFn: async (id: string) => requestOrderSend(await token(), id),
    onSuccess: refresh,
  });

  const receive = useMutation({
    mutationFn: async (x: { id: string; item: string; quantity: string; reference: string }) =>
      receiveOrder(await token(), x.id, x.item, x.quantity, x.reference),
    onSuccess: refresh,
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => cancelOrder(await token(), id),
    onSuccess: refresh,
  });

  const resolve = useMutation({
    mutationFn: async (x: { id: string; outcome: "SENT" | "NOT_SENT" }) =>
      resolveOrderSend(await token(), x.id, x.outcome),
    onSuccess: refresh,
  });

  function line(index: number, field: keyof OrderInput["items"][number], value: string) {
    setDraft((previous) => ({
      ...previous,
      items: previous.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
  }

  function startEdit() {
    const x = detail.data;
    if (!x?.items) return;
    setDraft({
      supplier_id: x.supplier_id,
      po_number: x.po_number,
      order_date: x.order_date,
      expected_delivery_date: x.expected_delivery_date ?? "",
      items: x.items.map((i) => ({
        product_id: i.product_id,
        quantity: i.quantity,
        unit_cost: i.unit_cost,
      })),
    });
    setEditing(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Purchase Orders & Procurement"
          description="Prepare replenishment orders, enforce dual-approval Maker-Checker governance, and record warehouse receipts."
        />

        {canWrite && (
          <button
            onClick={() => {
              setSelected("");
              setDraft(fresh());
              setEditing(true);
            }}
            className="self-start sm:self-auto px-4 py-2 rounded-xl bg-[#145f55] hover:bg-[#0e4d45] text-white font-semibold text-xs shadow-xs hover:shadow-md transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Purchase Order</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Orders Table */}
        <div className="lg:col-span-7 card rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Procurement Orders</span>
            <span className="text-[11px] font-semibold text-slate-400">
              {orders.data?.items.length ?? 0} orders
            </span>
          </div>

          <div className="table-wrap">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                  <th className="py-3 px-4">PO Number</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {orders.data?.items.map((x) => {
                  const isSelected = selected === x.id;
                  return (
                    <tr
                      key={x.id}
                      onClick={() => {
                        setSelected(x.id);
                        setEditing(false);
                      }}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? "bg-emerald-50/80 font-semibold" : "hover:bg-slate-50"
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{x.po_number}</td>
                      <td className="py-3.5 px-4 text-slate-800">{x.supplier}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{money(Number(x.total_amount))}</td>
                      <td className="py-3.5 px-4">
                        <Badge value={x.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {!orders.isLoading && orders.data?.items.length === 0 && (
              <div className="p-12 text-center text-xs text-slate-400">No purchase orders recorded yet.</div>
            )}
          </div>
        </div>

        {/* Detail or Edit Card */}
        <div className="lg:col-span-5 card p-6 rounded-2xl border border-slate-200/90 bg-white shadow-sm space-y-5">
          <AnimatePresence mode="wait">
            {editing ? (
              <motion.div
                key="edit-po"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h2 className="text-sm font-bold text-slate-900">
                    {selected ? "Edit Order Draft" : "New Order Draft"}
                  </h2>
                  <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Dual Approval
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Supplier
                  </label>
                  <select
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 focus:bg-white focus:border-[#145f55] outline-none"
                    value={draft.supplier_id}
                    onChange={(e) => setDraft({ ...draft, supplier_id: e.target.value })}
                  >
                    <option value="">Select supplier</option>
                    {suppliers.data?.items.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name} (Lead: {x.lead_time_days}d)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      PO Number
                    </label>
                    <input
                      className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-mono"
                      value={draft.po_number}
                      onChange={(e) => setDraft({ ...draft, po_number: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Order Date
                    </label>
                    <input
                      className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-mono"
                      type="date"
                      value={draft.order_date}
                      onChange={(e) => setDraft({ ...draft, order_date: e.target.value })}
                    />
                  </div>
                </div>

                {/* Lines */}
                <div className="space-y-3 pt-2">
                  <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Ordered Products
                  </div>
                  {draft.items.map((item, index) => (
                    <div
                      key={index}
                      className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">Line #{index + 1}</span>
                        {draft.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setDraft((previous) => ({
                                ...previous,
                                items: previous.items.filter((_, i) => i !== index),
                              }))
                            }
                            className="text-rose-500 hover:text-rose-700 text-xs flex items-center gap-1 font-semibold"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Remove
                          </button>
                        )}
                      </div>

                      <select
                        className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:border-[#145f55] outline-none"
                        value={item.product_id}
                        onChange={(e) => line(index, "product_id", e.target.value)}
                      >
                        <option value="">Select product to order</option>
                        {products.data?.items.map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.name} (Stock: {x.current_stock})
                          </option>
                        ))}
                      </select>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">Quantity</label>
                          <input
                            className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white text-xs font-mono"
                            type="number"
                            min="0.001"
                            step="0.001"
                            value={item.quantity}
                            onChange={(e) => line(index, "quantity", e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">Unit Cost (₹)</label>
                          <input
                            className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white text-xs font-mono"
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_cost}
                            onChange={(e) => line(index, "unit_cost", e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() =>
                      setDraft((previous) => ({
                        ...previous,
                        items: [...previous.items, { product_id: "", quantity: "1", unit_cost: "0" }],
                      }))
                    }
                    className="w-full py-2 rounded-xl border border-dashed border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Another Product Line
                  </button>
                </div>

                {save.isError && (
                  <p className="text-xs text-rose-600 font-medium">{save.error.message}</p>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={
                      save.isPending ||
                      !draft.supplier_id ||
                      !draft.po_number ||
                      draft.items.some((x) => !x.product_id)
                    }
                    onClick={() => save.mutate()}
                    className="px-4 py-1.5 rounded-xl bg-[#145f55] hover:bg-[#0e4d45] disabled:opacity-50 text-white text-xs font-semibold shadow-xs"
                  >
                    {save.isPending ? "Saving..." : "Save Draft"}
                  </button>
                </div>
              </motion.div>
            ) : detail.data ? (
              <motion.div
                key="detail-po"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">{detail.data.po_number}</h2>
                    <span className="text-xs text-slate-500 font-medium">
                      {detail.data.supplier} • {date(detail.data.order_date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge value={detail.data.status} />
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      Send: {detail.data.send_state}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">Committed PO Total</span>
                  <span className="text-base font-black text-slate-900 font-mono">
                    {money(Number(detail.data.total_amount))}
                  </span>
                </div>

                {/* Receiving Line Items */}
                <div className="space-y-3 pt-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Receipt Progress
                  </span>

                  {detail.data.items?.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl border border-slate-200/80 bg-white space-y-2.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800">{item.product}</span>
                        <span className="font-mono text-slate-600 text-[11px]">
                          {money(Number(item.unit_cost))} / unit
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Ordered: <strong>{item.quantity}</strong></span>
                        <span className="text-emerald-700 font-semibold">
                          Received: <strong>{item.received}</strong>
                        </span>
                      </div>

                      {canWrite &&
                        ["PENDING", "PARTIAL"].includes(detail.data!.status) &&
                        Number(item.received) < Number(item.quantity) && (
                          <div className="pt-2 border-t border-slate-100 space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs font-mono placeholder:text-slate-400"
                                type="number"
                                placeholder="Receive qty"
                                min="0.001"
                                max={String(Number(item.quantity) - Number(item.received))}
                                step="0.001"
                                value={receipt[item.id]?.quantity ?? ""}
                                onChange={(e) =>
                                  setReceipt({
                                    ...receipt,
                                    [item.id]: {
                                      quantity: e.target.value,
                                      reference: receipt[item.id]?.reference ?? "",
                                    },
                                  })
                                }
                              />
                              <input
                                className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs placeholder:text-slate-400"
                                placeholder="Challan / Ref #"
                                value={receipt[item.id]?.reference ?? ""}
                                onChange={(e) =>
                                  setReceipt({
                                    ...receipt,
                                    [item.id]: {
                                      quantity: receipt[item.id]?.quantity ?? "",
                                      reference: e.target.value,
                                    },
                                  })
                                }
                              />
                            </div>
                            <button
                              type="button"
                              disabled={
                                receive.isPending ||
                                !receipt[item.id]?.quantity ||
                                !receipt[item.id]?.reference
                              }
                              onClick={() =>
                                receive.mutate({
                                  id: detail.data!.id,
                                  item: item.id,
                                  ...receipt[item.id],
                                })
                              }
                              className="w-full h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                            >
                              <PackageCheck className="w-3.5 h-3.5" />
                              <span>Record Warehouse Receipt</span>
                            </button>
                          </div>
                        )}
                    </div>
                  ))}
                </div>

                {/* Workflow Actions */}
                {canWrite &&
                  detail.data.status === "DRAFT" &&
                  detail.data.send_state === "NOT_SENT" && (
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={startEdit}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        type="button"
                        disabled={cancel.isPending}
                        onClick={() => cancel.mutate(detail.data!.id)}
                        className="px-3 py-1.5 rounded-xl border border-rose-200 hover:bg-rose-50 text-xs font-semibold text-rose-600"
                      >
                        Cancel Draft
                      </button>
                      <button
                        type="button"
                        disabled={request.isPending}
                        onClick={() => request.mutate(detail.data!.id)}
                        className="px-4 py-1.5 rounded-xl bg-[#145f55] hover:bg-[#0e4d45] disabled:opacity-50 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
                      >
                        {request.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        Request Send Approval
                      </button>
                    </div>
                  )}

                {request.isSuccess && (
                  <p className="text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 font-medium">
                    Approval requested! A separate authorized manager must approve it in Action Center before dispatch.
                  </p>
                )}
              </motion.div>
            ) : (
              <div className="p-12 text-center text-xs text-slate-400">
                Select a purchase order to review status and warehouse receipts.
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
