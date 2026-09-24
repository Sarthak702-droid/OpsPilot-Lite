"use client";
import { useState } from "react";
export function AskInput({ onAsk, busy }: { onAsk: (value: string) => void; busy: boolean }) { const [value, setValue] = useState(""); return <form onSubmit={e => { e.preventDefault(); if (value.trim().length >= 3) onAsk(value.trim()); }} className="card section-card" style={{ display: "flex", gap: 10 }}><input className="input" aria-label="Question for OpsPilot" placeholder="What needs my attention today?" value={value} onChange={e => setValue(e.target.value)} maxLength={1000} /><button className="button primary" type="submit" disabled={busy || value.trim().length < 3}>Ask</button></form>; }

