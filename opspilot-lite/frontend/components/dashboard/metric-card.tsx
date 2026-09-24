export function MetricCard({ label, value, note }: { label: string; value: string; note?: string }) { return <div className="card metric-card"><div className="metric-label">{label}</div><div className="metric-value">{value}</div>{note && <div style={{ color: "var(--muted)", fontSize: 11, marginTop: 5 }}>{note}</div>}</div>; }

