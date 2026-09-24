"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, Users, FileText, Truck, Siren, CheckCircle2, Sparkles, Upload, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";
const links: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard }, { href: "/inventory", label: "Inventory", icon: Package }, { href: "/customers", label: "Customers", icon: Users }, { href: "/invoices", label: "Invoices", icon: FileText }, { href: "/suppliers", label: "Suppliers", icon: Truck }, { href: "/signals", label: "Signals", icon: Siren }, { href: "/actions", label: "Action center", icon: CheckCircle2 }, { href: "/ask", label: "Ask OpsPilot", icon: Sparkles }, { href: "/import", label: "Import data", icon: Upload }, { href: "/settings", label: "Settings", icon: Settings },
];
export function AppSidebar() { const path = usePathname(); return <aside className="sidebar"><Link href="/dashboard" className="brand"><span className="brand-mark">O</span>OpsPilot Lite</Link><nav><div className="nav-heading">Workspace</div>{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`nav-link ${path === href ? "active" : ""}`}><Icon />{label}</Link>)}</nav><div style={{ marginTop: "auto", padding: "12px", color: "var(--muted)", fontSize: 12 }}>Deterministic insights · Human control</div></aside>; }
export function MobileNav() { const path = usePathname(); return <nav className="mobile-nav">{links.map(({ href, label }) => <Link key={href} href={href} style={{ color: path === href ? "var(--brand)" : undefined }}>{label}</Link>)}</nav>; }

