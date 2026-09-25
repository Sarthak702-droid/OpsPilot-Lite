"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { useToken } from "@/lib/auth-context";
import { getOrganization } from "@/services/organization.service";
import { getProducts } from "@/services/products.service";
import { getSuppliers } from "@/services/suppliers.service";
import { cancelOrder, getOrder, getOrders, receiveOrder, requestOrderSend, resolveOrderSend, saveOrder, type OrderInput } from "@/services/purchase-orders.service";
import { date, money } from "@/lib/utils";

const fresh = (): OrderInput => ({ supplier_id: "", po_number: "", order_date: new Date().toISOString().slice(0, 10), expected_delivery_date: "", items: [{ product_id: "", quantity: "1", unit_cost: "0" }] });
export function OrdersView() {
  const token = useToken(); const qc = useQueryClient();
  const [selected, setSelected] = useState(""); const [editing, setEditing] = useState(false); const [draft, setDraft] = useState<OrderInput>(fresh);
  const [receipt, setReceipt] = useState<Record<string, { quantity: string; reference: string }>>({});
  const org = useQuery({ queryKey: ["organization"], queryFn: async () => getOrganization(await token()) });
  const orders = useQuery({ queryKey: ["purchase-orders"], queryFn: async () => getOrders(await token()) });
  const detail = useQuery({ queryKey: ["purchase-orders", selected], queryFn: async () => getOrder(await token(), selected), enabled: !!selected });
  const products = useQuery({ queryKey: ["products"], queryFn: async () => getProducts(await token()) });
  const suppliers = useQuery({ queryKey: ["suppliers"], queryFn: async () => getSuppliers(await token()) });
  const canWrite = ["OWNER", "ADMIN", "MANAGER"].includes(org.data?.role ?? "");
  const canAdmin = ["OWNER", "ADMIN"].includes(org.data?.role ?? "");
  const refresh = async () => { await Promise.all([qc.invalidateQueries({ queryKey: ["purchase-orders"] }), qc.invalidateQueries({ queryKey: ["actions"] }), qc.invalidateQueries({ queryKey: ["inventory"] }), qc.invalidateQueries({ queryKey: ["dashboard"] })]); };
  const save = useMutation({ mutationFn: async () => saveOrder(await token(), draft, editing && selected ? selected : undefined), onSuccess: async x => { setSelected(x.id); setEditing(false); await refresh(); } });
  const request = useMutation({ mutationFn: async (id: string) => requestOrderSend(await token(), id), onSuccess: refresh });
  const receive = useMutation({ mutationFn: async (x: { id: string; item: string; quantity: string; reference: string }) => receiveOrder(await token(), x.id, x.item, x.quantity, x.reference), onSuccess: refresh });
  const cancel = useMutation({ mutationFn: async (id: string) => cancelOrder(await token(), id), onSuccess: refresh });
  const resolve = useMutation({ mutationFn: async (x: { id: string; outcome: "SENT" | "NOT_SENT" }) => resolveOrderSend(await token(), x.id, x.outcome), onSuccess: refresh });
  function line(index: number, field: keyof OrderInput["items"][number], value: string) { setDraft(previous => ({ ...previous, items: previous.items.map((item, i) => i === index ? { ...item, [field]: value } : item) })); }
  function startEdit() { const x = detail.data; if (!x?.items) return; setDraft({ supplier_id: x.supplier_id, po_number: x.po_number, order_date: x.order_date, expected_delivery_date: x.expected_delivery_date ?? "", items: x.items.map(i => ({ product_id: i.product_id, quantity: i.quantity, unit_cost: i.unit_cost })) }); setEditing(true); }
  return <>
    <PageHeader title="Purchase orders" description="Prepare orders, obtain a separate approval before sending, and record receipts." action={canWrite && <button className="button primary" onClick={() => { setSelected(""); setDraft(fresh()); setEditing(true); }}>New order</button>} />
    {orders.isError && <p role="alert">Could not load purchase orders.</p>}
    <div className="section-grid" style={{ marginTop: 0 }}><section className="card table-wrap"><table><thead><tr><th>Number</th><th>Supplier</th><th>Total</th><th>Status</th></tr></thead><tbody>{orders.data?.items.map(x => <tr key={x.id} onClick={() => { setSelected(x.id); setEditing(false); }} style={{ cursor: "pointer" }}><td>{x.po_number}</td><td>{x.supplier}</td><td>{money(Number(x.total_amount))}</td><td>{x.status}</td></tr>)}</tbody></table>{!orders.isLoading && orders.data?.items.length === 0 && <div className="empty">No purchase orders yet.</div>}</section>
      <section className="card section-card stack">{editing ? <><h2 className="section-title">{selected ? "Edit order draft" : "New order draft"}</h2>
        <label>Supplier<select className="input" value={draft.supplier_id} onChange={e => setDraft({ ...draft, supplier_id: e.target.value })}><option value="">Select supplier</option>{suppliers.data?.items.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <div className="form-grid"><label>PO number<input className="input" value={draft.po_number} onChange={e => setDraft({ ...draft, po_number: e.target.value })} /></label><label>Order date<input className="input" type="date" value={draft.order_date} onChange={e => setDraft({ ...draft, order_date: e.target.value })} /></label><label>Expected date<input className="input" type="date" value={draft.expected_delivery_date} onChange={e => setDraft({ ...draft, expected_delivery_date: e.target.value })} /></label></div>
        {draft.items.map((item, index) => <div className="card section-card stack" key={index}><label>Product<select className="input" value={item.product_id} onChange={e => line(index, "product_id", e.target.value)}><option value="">Select product</option>{products.data?.items.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label><div className="form-grid"><label>Quantity<input className="input" type="number" min="0.001" step="0.001" value={item.quantity} onChange={e => line(index, "quantity", e.target.value)} /></label><label>Unit cost<input className="input" type="number" min="0" step="0.01" value={item.unit_cost} onChange={e => line(index, "unit_cost", e.target.value)} /></label></div>{draft.items.length > 1 && <button className="button" onClick={() => setDraft(previous => ({ ...previous, items: previous.items.filter((_, i) => i !== index) }))}>Remove line</button>}</div>)}
        <button className="button" onClick={() => setDraft(previous => ({ ...previous, items: [...previous.items, { product_id: "", quantity: "1", unit_cost: "0" }] }))}>Add line</button>
        {save.isError && <p role="alert">{save.error.message}</p>}<div className="button-row"><button className="button" onClick={() => setEditing(false)}>Cancel</button><button className="button primary" disabled={save.isPending || !draft.supplier_id || !draft.po_number || draft.items.some(x => !x.product_id)} onClick={() => save.mutate()}>Save draft</button></div>
      </> : detail.data ? <><h2 className="section-title">{detail.data.po_number}</h2><p>{detail.data.supplier} · {date(detail.data.order_date)}</p><p>Status: <strong>{detail.data.status}</strong> · Send: <strong>{detail.data.send_state}</strong></p><p>Total: <strong>{money(Number(detail.data.total_amount))}</strong></p>
        {request.isError && <p role="alert">{request.error.message}</p>}{receive.isError && <p role="alert">{receive.error.message}</p>}{cancel.isError && <p role="alert">{cancel.error.message}</p>}{resolve.isError && <p role="alert">{resolve.error.message}</p>}
        {detail.data.items?.map(item => <div className="card section-card stack" key={item.id}><strong>{item.product}</strong><span>Ordered {item.quantity} · Received {item.received} · {money(Number(item.unit_cost))} each</span>{canWrite && ["PENDING", "PARTIAL"].includes(detail.data!.status) && Number(item.received) < Number(item.quantity) && <><div className="form-grid"><label>Receive quantity<input className="input" type="number" min="0.001" max={String(Number(item.quantity) - Number(item.received))} step="0.001" value={receipt[item.id]?.quantity ?? ""} onChange={e => setReceipt({ ...receipt, [item.id]: { quantity: e.target.value, reference: receipt[item.id]?.reference ?? "" } })} /></label><label>Receipt reference<input className="input" value={receipt[item.id]?.reference ?? ""} onChange={e => setReceipt({ ...receipt, [item.id]: { quantity: receipt[item.id]?.quantity ?? "", reference: e.target.value } })} /></label></div><button className="button" disabled={receive.isPending || !receipt[item.id]?.quantity || !receipt[item.id]?.reference} onClick={() => receive.mutate({ id: detail.data!.id, item: item.id, ...receipt[item.id] })}>Record receipt</button></>}</div>)}
        {canWrite && detail.data.status === "DRAFT" && detail.data.send_state === "NOT_SENT" && <div className="button-row"><button className="button" onClick={startEdit}>Edit draft</button><button className="button" disabled={cancel.isPending} onClick={() => cancel.mutate(detail.data!.id)}>Cancel draft</button><button className="button primary" disabled={request.isPending} onClick={() => request.mutate(detail.data!.id)}>Request send approval</button></div>}
        {canAdmin && ["UNCERTAIN", "SENDING"].includes(detail.data.send_state) && <div className="stack"><p role="alert">Confirm the delivery outcome with the supplier before resolving this send attempt.</p><div className="button-row"><button className="button" disabled={resolve.isPending} onClick={() => resolve.mutate({ id: detail.data!.id, outcome: "NOT_SENT" })}>Confirmed not sent</button><button className="button primary" disabled={resolve.isPending} onClick={() => resolve.mutate({ id: detail.data!.id, outcome: "SENT" })}>Confirmed sent</button></div></div>}
        {request.isSuccess && <p role="status">Approval requested. A different manager must approve it in Action center before sending.</p>}
      </> : <div className="empty">Select an order or create a draft.</div>}</section></div>
  </>;
}
