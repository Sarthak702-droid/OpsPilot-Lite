"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart,
  Plus,
  Trash2,
  CheckCircle2,
  Edit2,
  Clock,
  ArrowRight,
  Loader2,
  AlertCircle,
  Package,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { useToken } from "@/lib/auth-context";
import { getCustomers } from "@/services/customers.service";
import { getProducts } from "@/services/products.service";
import { getOrganization } from "@/services/organization.service";
import { completeSale, getSale, getSales, saveSale, type SaleInput } from "@/services/sales.service";
import { date, money } from "@/lib/utils";

const fresh = (): SaleInput => ({
  customer_id: "",
  sale_date: new Date().toISOString().slice(0, 10),
  tax: "0",
  discount: "0",
  items: [{ product_id: "", quantity: "1", unit_price: "0", discount: "0" }],
});

export function SalesView() {
  const token = useToken();
  const qc = useQueryClient();
  const [selected, setSelected] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<SaleInput>(fresh);

  const org = useQuery({ queryKey: ["organization"], queryFn: async () => getOrganization(await token()) });
  const sales = useQuery({ queryKey: ["sales"], queryFn: async () => getSales(await token()) });
  const detail = useQuery({
    queryKey: ["sales", selected],
    queryFn: async () => getSale(await token(), selected),
    enabled: !!selected,
  });
  const customers = useQuery({ queryKey: ["customers"], queryFn: async () => getCustomers(await token()) });
  const products = useQuery({ queryKey: ["products"], queryFn: async () => getProducts(await token()) });

  const canWrite = ["OWNER", "ADMIN", "MANAGER"].includes(org.data?.role ?? "");

  const save = useMutation({
    mutationFn: async () => saveSale(await token(), draft, editing && selected ? selected : undefined),
    onSuccess: async (result) => {
      setSelected(result.id);
      setEditing(false);
      await qc.invalidateQueries({ queryKey: ["sales"] });
    },
  });

  const complete = useMutation({
    mutationFn: async (id: string) => completeSale(await token(), id),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["sales"] }),
        qc.invalidateQueries({ queryKey: ["inventory"] }),
        qc.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    },
  });

  function editLine(index: number, field: keyof SaleInput["items"][number], value: string) {
    setDraft((previous) => ({
      ...previous,
      items: previous.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
  }

  function startEdit() {
    const sale = detail.data;
    if (!sale?.items) return;
    setDraft({
      customer_id: sale.customer_id,
      sale_date: sale.sale_date,
      tax: sale.tax,
      discount: sale.discount,
      items: sale.items.map((x) => ({
        product_id: x.product_id,
        quantity: x.quantity,
        unit_price: x.unit_price,
        discount: x.discount,
      })),
    });
    setEditing(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Sales Orders & Fulfillment"
          description="Record multi-line sales drafts, reserve warehouse inventory, and complete orders on fulfillment."
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
            <span>New Sale Order</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Sales List Table */}
        <div className="lg:col-span-7 card rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Orders History</span>
            <span className="text-[11px] font-semibold text-slate-400">
              {sales.data?.items.length ?? 0} orders
            </span>
          </div>

          <div className="table-wrap">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {sales.data?.items.map((x) => {
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
                      <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">{date(x.sale_date)}</td>
                      <td className="py-3 px-4 text-slate-900 font-bold">{x.customer || "—"}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{money(Number(x.total_amount))}</td>
                      <td className="py-3 px-4">
                        <Badge value={x.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {!sales.isLoading && sales.data?.items.length === 0 && (
              <div className="p-12 text-center text-xs text-slate-400">No sales recorded yet.</div>
            )}
          </div>
        </div>

        {/* Detail or Edit Drawer */}
        <div className="lg:col-span-5 card p-6 rounded-2xl border border-slate-200/90 bg-white shadow-sm space-y-5">
          <AnimatePresence mode="wait">
            {editing ? (
              <motion.div
                key="edit-pane"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h2 className="text-sm font-bold text-slate-900">
                    {selected ? "Edit Sale Draft" : "New Sale Draft"}
                  </h2>
                  <span className="text-[11px] text-slate-400">Inventory will commit on completion</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Customer Account
                  </label>
                  <select
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 focus:bg-white focus:border-[#145f55] outline-none"
                    value={draft.customer_id}
                    onChange={(e) => setDraft({ ...draft, customer_id: e.target.value })}
                  >
                    <option value="">Select customer</option>
                    {customers.data?.items.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.business_name || x.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Order Date
                  </label>
                  <input
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 focus:bg-white focus:border-[#145f55] outline-none"
                    type="date"
                    value={draft.sale_date}
                    onChange={(e) => setDraft({ ...draft, sale_date: e.target.value })}
                  />
                </div>

                {/* Line Items */}
                <div className="space-y-3 pt-2">
                  <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Line Items
                  </div>
                  {draft.items.map((line, index) => (
                    <div
                      key={index}
                      className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">Item #{index + 1}</span>
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
                        value={line.product_id}
                        onChange={(e) => {
                          const product = products.data?.items.find((x) => x.id === e.target.value);
                          setDraft((previous) => ({
                            ...previous,
                            items: previous.items.map((item, i) =>
                              i === index
                                ? {
                                    ...item,
                                    product_id: e.target.value,
                                    unit_price: String(product?.selling_price ?? 0),
                                  }
                                : item
                            ),
                          }));
                        }}
                      >
                        <option value="">Select product to dispatch</option>
                        {products.data?.items.map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.name} ({x.current_stock} in stock)
                          </option>
                        ))}
                      </select>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">Quantity</label>
                          <input
                            className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white text-xs font-mono"
                            type="number"
                            min="0.001"
                            step="0.001"
                            value={line.quantity}
                            onChange={(e) => editLine(index, "quantity", e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">Price (₹)</label>
                          <input
                            className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white text-xs font-mono"
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unit_price}
                            onChange={(e) => editLine(index, "unit_price", e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">Discount</label>
                          <input
                            className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white text-xs font-mono"
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.discount}
                            onChange={(e) => editLine(index, "discount", e.target.value)}
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
                        items: [
                          ...previous.items,
                          { product_id: "", quantity: "1", unit_price: "0", discount: "0" },
                        ],
                      }))
                    }
                    className="w-full py-2 rounded-xl border border-dashed border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Another Product Line
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tax (₹)</label>
                    <input
                      className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-mono"
                      type="number"
                      min="0"
                      step="0.01"
                      value={draft.tax}
                      onChange={(e) => setDraft({ ...draft, tax: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Order Discount</label>
                    <input
                      className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-mono"
                      type="number"
                      min="0"
                      step="0.01"
                      value={draft.discount}
                      onChange={(e) => setDraft({ ...draft, discount: e.target.value })}
                    />
                  </div>
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
                    disabled={save.isPending || !draft.customer_id || draft.items.some((x) => !x.product_id)}
                    onClick={() => save.mutate()}
                    className="px-4 py-1.5 rounded-xl bg-[#145f55] hover:bg-[#0e4d45] disabled:opacity-50 text-white text-xs font-semibold shadow-xs"
                  >
                    {save.isPending ? "Saving..." : "Save Draft"}
                  </button>
                </div>
              </motion.div>
            ) : detail.data ? (
              <motion.div
                key="detail-pane"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Sale #{detail.data.id.slice(0, 8)}</h2>
                    <span className="text-xs text-slate-500 font-medium">
                      {detail.data.customer} • {date(detail.data.sale_date)}
                    </span>
                  </div>
                  <Badge value={detail.data.status} />
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">Total Billed Amount</span>
                  <span className="text-base font-black text-slate-900 font-mono">
                    {money(Number(detail.data.total_amount))}
                  </span>
                </div>

                <div className="space-y-2 pt-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Fulfilled Items
                  </span>
                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden bg-white">
                    {detail.data.items?.map((item) => (
                      <div key={item.id} className="p-3 flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">{item.product}</span>
                        <span className="font-mono text-slate-600">
                          {item.quantity} × {money(Number(item.unit_price))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {complete.isError && (
                  <p className="text-xs text-rose-600 font-medium">{complete.error.message}</p>
                )}

                {canWrite && detail.data.status === "DRAFT" && (
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={startEdit}
                      className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit Draft
                    </button>
                    <button
                      type="button"
                      disabled={complete.isPending}
                      onClick={() => complete.mutate(detail.data.id)}
                      className="px-4 py-1.5 rounded-xl bg-[#145f55] hover:bg-[#0e4d45] disabled:opacity-50 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
                    >
                      {complete.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      Complete & Fulfill
                    </button>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="p-12 text-center text-xs text-slate-400">
                Select an order from the list or create a new draft to inspect details.
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
