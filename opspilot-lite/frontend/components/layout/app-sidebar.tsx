"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  Users,
  FileText,
  Truck,
  Siren,
  CheckCircle2,
  Sparkles,
  Upload,
  Settings,
  ShoppingCart,
  ClipboardList,
  CreditCard,
  ShieldCheck,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
  isAi?: boolean;
}

const navGroups: { group: string; items: NavItem[] }[] = [
  {
    group: "Intelligence & Control",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
      { href: "/signals", label: "Signals", icon: Siren, badge: "Live" },
      { href: "/actions", label: "Action center", icon: CheckCircle2 },
      { href: "/ask", label: "Ask OpsPilot", icon: Sparkles, isAi: true },
    ],
  },
  {
    group: "Operations",
    items: [
      { href: "/inventory", label: "Inventory", icon: Package },
      { href: "/purchase-orders", label: "Purchase orders", icon: ClipboardList },
      { href: "/sales", label: "Sales", icon: ShoppingCart },
      { href: "/invoices", label: "Invoices", icon: FileText },
      { href: "/payments", label: "Payments", icon: CreditCard },
      { href: "/customers", label: "Customers", icon: Users },
      { href: "/suppliers", label: "Suppliers", icon: Truck },
    ],
  },
  {
    group: "System",
    items: [
      { href: "/import", label: "Import data", icon: Upload },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const path = usePathname();

  return (
    <aside className="sidebar flex flex-col justify-between select-none">
      <div className="space-y-6">
        {/* Brand Header */}
        <Link href="/dashboard" className="brand group flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#145f55] to-[#0e4d45] text-white flex items-center justify-center font-bold text-base shadow-sm group-hover:scale-105 transition-transform duration-200">
            O
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-900 text-sm tracking-tight flex items-center gap-1.5">
              OpsPilot Lite
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                PRO
              </span>
            </span>
          </div>
        </Link>

        {/* Grouped Nav Items */}
        <nav className="space-y-5">
          {navGroups.map(({ group, items }) => (
            <div key={group} className="space-y-1">
              <div className="nav-heading text-[10px] font-bold tracking-wider text-slate-400 uppercase px-3 mb-1.5">
                {group}
              </div>
              <div className="space-y-0.5">
                {items.map(({ href, label, icon: Icon, badge, isAi }) => {
                  const isActive = path === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`relative flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
                        isActive
                          ? "text-[#145f55] bg-emerald-50/90 font-bold shadow-xs"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                      }`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="active-indicator"
                          className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-[#145f55]"
                          transition={{ type: "spring", stiffness: 350, damping: 30 }}
                        />
                      )}

                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={`w-4 h-4 transition-colors ${
                            isActive
                              ? "text-[#145f55]"
                              : isAi
                              ? "text-teal-600 animate-pulse"
                              : "text-slate-400 group-hover:text-slate-600"
                          }`}
                        />
                        <span>{label}</span>
                      </div>

                      {badge && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-rose-50 text-rose-600 border border-rose-200/60">
                          {badge}
                        </span>
                      )}
                      {isAi && !badge && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-teal-50 text-teal-700 border border-teal-200/60 flex items-center gap-0.5">
                          <Zap className="w-2.5 h-2.5" /> AI
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer System Status Card */}
      <div className="pt-4 border-t border-slate-100">
        <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              Engine Online
            </span>
            <span className="text-[10px] font-mono text-slate-400">:18080</span>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>Deterministic Grounding</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const path = usePathname();
  const allItems = navGroups.flatMap(g => g.items);

  return (
    <nav className="mobile-nav flex overflow-x-auto gap-1 p-2 bg-white border-b border-slate-200">
      {allItems.map(({ href, label, icon: Icon }) => {
        const isActive = path === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              isActive ? "bg-[#145f55] text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
