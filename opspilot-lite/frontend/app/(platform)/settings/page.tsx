import { PageHeader } from "@/components/layout/page-header";
export default function SettingsPage() { return <><PageHeader title="Settings" description="Workspace configuration and service status." /><div className="card section-card"><h2 className="section-title">Service architecture</h2><p>Operational metrics and alerts are calculated by the Go service. MiMo inference runs separately through SGLang.</p><p style={{ color: "var(--muted)" }}>Contact an administrator to change organization membership or credentials.</p></div></>; }

