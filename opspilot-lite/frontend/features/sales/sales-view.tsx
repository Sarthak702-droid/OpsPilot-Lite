"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { useToken } from "@/lib/auth-context";
import { getCustomers } from "@/services/customers.service";
import { getProducts } from "@/services/products.service";
import { getOrganization } from "@/services/organization.service";
import { completeSale, getSale, getSales, saveSale, type SaleInput } from "@/services/sales.service";
import { date, money } from "@/lib/utils";

const fresh = (): SaleInput => ({ customer_id: "", sale_date: new Date().toISOString().slice(0, 10), tax: "0", discount: "0", items: [{ product_id: "", quantity: "1", unit_price: "0", discount: "0" }] });
export function SalesView() {
  const token = useToken();
  const qc = useQueryClient();
  const [selected, setSelected] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<SaleInput>(fresh);
  const org = useQuery({ queryKey: ["organization"], queryFn: async () => getOrganization(await token()) });
  const sales = useQuery({ queryKey: ["sales"], queryFn: async () => getSales(await token()) });
  const detail = useQuery({ queryKey: ["sales", selected], queryFn: async () => getSale(await token(), selected), enabled: !!selected });
  const customers = useQuery({ queryKey: ["customers"], queryFn: async () => getCustomers(await token()) });
  const products = useQuery({ queryKey: ["products"], queryFn: async () => getProducts(await token()) });
  const canWrite = ["OWNER", "ADMIN", "MANAGER"].includes(org.data?.role ?? "");
  const save = useMutation({ mutationFn: async () => saveSale(await token(), draft, editing && selected ? selected : undefined), onSuccess: async result => { setSelected(result.id); setEditing(false); await qc.invalidateQueries({ queryKey: ["sales"] }); } });
  const complete = useMutation({ mutationFn: async (id: string) => completeSale(await token(), id), onSuccess: async () => { await Promise.all([qc.invalidateQueries({ queryKey: ["sales"] }), qc.invalidateQueries({ queryKey: ["inventory"] }), qc.invalidateQueries({ queryKey: ["dashboard"] })]); } });
  function editLine(index: number, field: keyof SaleInput["items"][number], value: string) {
    setDraft(previous => ({ ...previous, items: previous.items.map((item, i) => i === index ? { ...item, [field]: value } : item) }));
  }
  function startEdit() {
    const sale = detail.data;
    if (!sale?.items) return;
    setDraft({ customer_id: sale.customer_id, sale_date: sale.sale_date, tax: sale.tax, discount: sale.discount, items: sale.items.map(x => ({ product_id: x.product_id, quantity: x.quantity, unit_price: x.unit_price, discount: x.discount })) });
    setEditing(true);
  }
  return <>
    <PageHeader title="Sales" description="Record sales with line items and complete them when stock is ready." action={canWrite && <button className="button primary" onClick={() => { setSelected(""); setDraft(fresh()); setEditing(true); }}>New sale</button>} />
    {sales.isError && <p role="alert">Could not load sales.</p>}
    <div className="section-grid" style={{ marginTop: 0 }}>
      <section className="card table-wrap"><table><thead><tr><th>Date</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead><tbody>{sales.data?.items.map(x => <tr key={x.id} onClick={() => { setSelected(x.id); setEditing(false); }} style={{ cursor: "pointer" }}><td>{date(x.sale_date)}</td><td>{x.customer || "—"}</td><td>{money(Number(x.total_amount))}</td><td>{x.status}</td></tr>)}</tbody></table>{!sales.isLoading && sales.data?.items.length === 0 && <div className="empty">No sales yet.</div>}</section>
      <section className="card section-card stack">
        {editing ? <><h2 className="section-title">{selected ? "Edit sale draft" : "New sale draft"}</h2>
          <label>Customer<select className="input" value={draft.customer_id} onChange={e => setDraft({ ...draft, customer_id: e.target.value })}><option value="">Select customer</option>{customers.data?.items.map(x => <option key={x.id} value={x.id}>{x.business_name || x.name}</option>)}</select></label>
          <label>Sale date<input className="input" type="date" value={draft.sale_date} onChange={e => setDraft({ ...draft, sale_date: e.target.value })} /></label>
          {draft.items.map((line, index) => <div className="card section-card stack" key={index}>
            <label>Product<select className="input" value={line.product_id} onChange={e => { const product = products.data?.items.find(x => x.id === e.target.value); setDraft(previous => ({ ...previous, items: previous.items.map((item, i) => i === index ? { ...item, product_id: e.target.value, unit_price: String(product?.selling_price ?? 0) } : item) })); }}><option value="">Select product</option>{products.data?.items.map(x => <option key={x.id} value={x.id}>{x.name} · {x.current_stock} in stock</option>)}</select></label>
            <div className="form-grid"><label>Quantity<input className="input" type="number" min="0.001" step="0.001" value={line.quantity} onChange={e => editLine(index, "quantity", e.target.value)} /></label><label>Unit price<input className="input" type="number" min="0" step="0.01" value={line.unit_price} onChange={e => editLine(index, "unit_price", e.target.value)} /></label><label>Line discount<input className="input" type="number" min="0" step="0.01" value={line.discount} onChange={e => editLine(index, "discount", e.target.value)} /></label></div>
            {draft.items.length > 1 && <button className="button" onClick={() => setDraft(previous => ({ ...previous, items: previous.items.filter((_, i) => i !== index) }))}>Remove line</button>}
          </div>)}
          <button className="button" onClick={() => setDraft(previous => ({ ...previous, items: [...previous.items, { product_id: "", quantity: "1", unit_price: "0", discount: "0" }] }))}>Add line</button>
          <div className="form-grid"><label>Tax<input className="input" type="number" min="0" step="0.01" value={draft.tax} onChange={e => setDraft({ ...draft, tax: e.target.value })} /></label><label>Order discount<input className="input" type="number" min="0" step="0.01" value={draft.discount} onChange={e => setDraft({ ...draft, discount: e.target.value })} /></label></div>
          {save.isError && <p role="alert">{save.error.message}</p>}
          <div className="button-row"><button className="button" onClick={() => setEditing(false)}>Cancel</button><button className="button primary" disabled={save.isPending || !draft.customer_id || draft.items.some(x => !x.product_id)} onClick={() => save.mutate()}>Save draft</button></div>
        </> : detail.data ? <><h2 className="section-title">Sale {detail.data.id.slice(0, 8)}</h2><p>{detail.data.customer} · {date(detail.data.sale_date)}</p><p>Status: <strong>{detail.data.status}</strong></p><p>Total: <strong>{money(Number(detail.data.total_amount))}</strong></p><ul>{detail.data.items?.map(x => <li key={x.id}>{x.product}: {x.quantity} × {money(Number(x.unit_price))}</li>)}</ul>{complete.isError && <p role="alert">{complete.error.message}</p>}{canWrite && detail.data.status === "DRAFT" && <div className="button-row"><button className="button" onClick={startEdit}>Edit draft</button><button className="button primary" disabled={complete.isPending} onClick={() => complete.mutate(detail.data.id)}>Complete sale</button></div>}</> : <div className="empty">Select a sale or create a new draft.</div>}
      </section>
    </div>
  </>;
}
