"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Receipt,
  Cross,
  History,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/billing", label: "Billing", icon: Receipt },
  { href: "/history", label: "History", icon: History },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Cross size={18} strokeWidth={2.5} />
          </div>
          <div>
            <div className="sidebar-logo-text">PharmaCare</div>
            <div className="sidebar-logo-sub">Management System</div>
          </div>
        </div>

        <nav className="sidebar-nav" role="navigation" aria-label="Main navigation">
          <div className="sidebar-nav-label">Main Menu</div>
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`nav-item ${pathname === href ? "active" : ""}`}
              aria-current={pathname === href ? "page" : undefined}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>

        <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)", fontSize: 12, color: "var(--text-muted)" }}>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>PharmaCare v1.0</div>
          <div>Prototype · Client Demo</div>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content" id="main-content">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="mobile-nav" aria-label="Mobile navigation">
        <div className="mobile-nav-items">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`mobile-nav-item ${pathname === href ? "active" : ""}`}
              aria-current={pathname === href ? "page" : undefined}
            >
              <Icon size={22} />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
