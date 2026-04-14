"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  Package,
  AlertTriangle,
  Calendar,
  ShoppingCart,
  X,
  ChevronRight,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import Toaster from "@/components/Toaster";
import { subscribeMedicines } from "@/services/medicines";
import { subscribeTodaySales } from "@/services/sales";
import { Medicine, Sale } from "@/types";
import Link from "next/link";

const LOW_STOCK_THRESHOLD = 10;
const EXPIRY_WARN_DAYS = 30;

function daysUntilExpiry(dateStr: string): number {
  return Math.floor(
    (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
}

type ModalType = "lowstock" | "expiring" | null;

export default function DashboardPage() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalType>(null);

  useEffect(() => {
    let medLoaded = false;
    let saleLoaded = false;
    const checkLoaded = () => { if (medLoaded && saleLoaded) setLoading(false); };

    const unsubMed = subscribeMedicines((data) => { setMedicines(data); medLoaded = true; checkLoaded(); });
    const unsubSale = subscribeTodaySales((data) => { setSales(data); saleLoaded = true; checkLoaded(); });

    return () => { unsubMed(); unsubSale(); };
  }, []);

  const todayRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
  const todaySalesCount = sales.length;

  const lowStockMeds = medicines.filter((m) => m.quantity <= LOW_STOCK_THRESHOLD);
  const expiringSoonMeds = medicines.filter(
    (m) => daysUntilExpiry(m.expiryDate) <= EXPIRY_WARN_DAYS
  ); // includes expired
  const expiredCount = medicines.filter((m) => daysUntilExpiry(m.expiryDate) <= 0).length;

  const recentSales = sales.slice(0, 5);

  const formatBillNumber = (sale: Sale) => {
    return sale.billNumber 
      ? `INV-${String(sale.billNumber).padStart(5, "0")}` 
      : `#${sale.id.slice(-6).toUpperCase()}`;
  };

  if (loading) {
    return (
      <AppShell>
        <div className="topbar"><h1 className="topbar-title">Dashboard</h1></div>
        <div className="page-body" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
          <div className="spinner" />
        </div>
        <Toaster />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="topbar">
        <h1 className="topbar-title">Dashboard</h1>
        <div className="topbar-actions">
          <Link href="/billing" className="btn btn-primary">
            <ShoppingCart size={16} />
            New Bill
          </Link>
        </div>
      </div>

      <div className="page-body">
        {/* Stat Cards */}
        <div className="stat-grid">
          {/* Revenue */}
          <Link
            href="/history"
            className="stat-card"
            style={{
              textDecoration: "none",
              border: "1px solid var(--border-muted)",
              transition: "box-shadow 0.15s, border-color 0.15s",
              display: "block",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "var(--shadow-md)";
              e.currentTarget.style.borderColor = "var(--primary-light)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "var(--shadow-sm)";
              e.currentTarget.style.borderColor = "var(--border-muted)";
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div className="stat-card-icon" style={{ background: "#dcfce7" }} aria-hidden="true">
                <TrendingUp size={20} color="var(--primary)" />
              </div>
              <ChevronRight size={16} color="var(--text-muted)" />
            </div>
            <div className="stat-card-label">Today&apos;s Revenue</div>
            <div className="stat-card-value">₹{todayRevenue.toFixed(2)}</div>
            <div className="stat-card-sub">{todaySalesCount} bill{todaySalesCount !== 1 ? "s" : ""} today</div>
          </Link>

          {/* Total Medicines */}
          <Link
            href="/inventory"
            className="stat-card"
            style={{
              textDecoration: "none",
              border: "1px solid var(--border-muted)",
              transition: "box-shadow 0.15s, border-color 0.15s",
              display: "block",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "var(--shadow-md)";
              e.currentTarget.style.borderColor = "#93c5fd";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "var(--shadow-sm)";
              e.currentTarget.style.borderColor = "var(--border-muted)";
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div className="stat-card-icon" style={{ background: "#dbeafe" }} aria-hidden="true">
                <Package size={20} color="#1d4ed8" />
              </div>
              <ChevronRight size={16} color="var(--text-muted)" />
            </div>
            <div className="stat-card-label">Total Medicines</div>
            <div className="stat-card-value">{medicines.length}</div>
            <div className="stat-card-sub">In inventory</div>
          </Link>

          {/* Low Stock — clickable */}
          <button
            className="stat-card"
            onClick={() => lowStockMeds.length > 0 && setModal("lowstock")}
            style={{
              cursor: lowStockMeds.length > 0 ? "pointer" : "default",
              textAlign: "left",
              border: "1px solid var(--border-muted)",
              background: "var(--bg-card)",
              borderRadius: 12,
              transition: "box-shadow 0.15s, border-color 0.15s",
              width: "100%",
            }}
            onMouseEnter={(e) => {
              if (lowStockMeds.length > 0) {
                e.currentTarget.style.boxShadow = "var(--shadow-md)";
                e.currentTarget.style.borderColor = "#fcd34d";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "var(--shadow-sm)";
              e.currentTarget.style.borderColor = "var(--border-muted)";
            }}
            aria-label="View low stock medicines"
            id="low-stock-card"
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div className="stat-card-icon" style={{ background: "#fffbeb" }} aria-hidden="true">
                <AlertTriangle size={20} color="var(--yellow)" />
              </div>
              {lowStockMeds.length > 0 && <ChevronRight size={16} color="var(--text-muted)" />}
            </div>
            <div className="stat-card-label">Low Stock</div>
            <div className="stat-card-value" style={{ color: lowStockMeds.length > 0 ? "var(--yellow)" : "var(--text)" }}>
              {lowStockMeds.length}
            </div>
            <div className="stat-card-sub">
              {lowStockMeds.length > 0 ? "Tap to see items" : `All above ${LOW_STOCK_THRESHOLD} units`}
            </div>
          </button>

          {/* Expiring Soon — clickable */}
          <button
            className="stat-card"
            onClick={() => expiringSoonMeds.length > 0 && setModal("expiring")}
            style={{
              cursor: expiringSoonMeds.length > 0 ? "pointer" : "default",
              textAlign: "left",
              border: "1px solid var(--border-muted)",
              background: "var(--bg-card)",
              borderRadius: 12,
              transition: "box-shadow 0.15s, border-color 0.15s",
              width: "100%",
            }}
            onMouseEnter={(e) => {
              if (expiringSoonMeds.length > 0) {
                e.currentTarget.style.boxShadow = "var(--shadow-md)";
                e.currentTarget.style.borderColor = "#fca5a5";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "var(--shadow-sm)";
              e.currentTarget.style.borderColor = "var(--border-muted)";
            }}
            aria-label="View expiring medicines"
            id="expiring-soon-card"
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div className="stat-card-icon" style={{ background: "#fef2f2" }} aria-hidden="true">
                <Calendar size={20} color="var(--red)" />
              </div>
              {expiringSoonMeds.length > 0 && <ChevronRight size={16} color="var(--text-muted)" />}
            </div>
            <div className="stat-card-label">Expiring Soon</div>
            <div className="stat-card-value" style={{ color: expiringSoonMeds.length > 0 ? "var(--red)" : "var(--text)" }}>
              {expiringSoonMeds.length}
            </div>
            <div className="stat-card-sub">
              {expiringSoonMeds.length > 0 ? "Tap to see items" : "All stocks are safe"}
              {expiredCount > 0 ? ` · ${expiredCount} expired` : ""}
            </div>
          </button>
        </div>

        {/* Today's Bills */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>Today&apos;s Bills</h2>
          </div>

          {recentSales.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <ShoppingCart />
                <div className="empty-state-title">No bills today</div>
                <div className="empty-state-sub">Start billing to see revenue here</div>
              </div>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Bill ID</th>
                    <th>Items</th>
                    <th>Time</th>
                    <th style={{ textAlign: "right" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.map((sale) => (
                    <tr key={sale.id}>
                      <td style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 500, color: "var(--text)" }}>
                        {formatBillNumber(sale)}
                      </td>
                      <td>{sale.items.length} item{sale.items.length !== 1 ? "s" : ""}</td>
                      <td style={{ color: "var(--text-secondary)" }}>
                        {new Date(sale.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 600, fontFamily: "Figtree, sans-serif" }}>
                        ₹{sale.totalAmount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Low Stock Modal ── */}
      {modal === "lowstock" && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Low stock medicines"
          onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}
        >
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ background: "#fffbeb", borderRadius: 8, padding: 6, display: "flex" }}>
                  <AlertTriangle size={18} color="var(--yellow)" />
                </div>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 600 }}>Low Stock Medicines</h2>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>
                    {lowStockMeds.length} item{lowStockMeds.length !== 1 ? "s" : ""} below {LOW_STOCK_THRESHOLD} units
                  </div>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)} aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ paddingTop: 12, maxHeight: "60vh", overflowY: "auto" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {lowStockMeds
                  .sort((a, b) => a.quantity - b.quantity)
                  .map((med) => (
                    <div
                      key={med.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 14px",
                        background: med.quantity === 0 ? "#fef2f2" : "#fffbeb",
                        borderRadius: 10,
                        border: `1px solid ${med.quantity === 0 ? "#fca5a5" : "#fcd34d"}`,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>
                          {med.name}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                          Batch: {med.batchNumber}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        {med.quantity === 0 ? (
                          <span className="badge badge-red">Out of Stock</span>
                        ) : (
                          <span className="badge badge-yellow">
                            <AlertTriangle size={10} />
                            {med.quantity} left
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="modal-footer" style={{ justifyContent: "space-between" }}>
              <Link href="/inventory" className="btn btn-ghost btn-sm" onClick={() => setModal(null)}>
                <Package size={14} />
                Go to Inventory
              </Link>
              <button className="btn btn-primary btn-sm" onClick={() => setModal(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Expiring Soon Modal ── */}
      {modal === "expiring" && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Expiring medicines"
          onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}
        >
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ background: "#fef2f2", borderRadius: 8, padding: 6, display: "flex" }}>
                  <Calendar size={18} color="var(--red)" />
                </div>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 600 }}>Expiring Medicines</h2>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>
                    {expiringSoonMeds.length} item{expiringSoonMeds.length !== 1 ? "s" : ""} expiring within 30 days or already expired
                  </div>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)} aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ paddingTop: 12, maxHeight: "60vh", overflowY: "auto" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {expiringSoonMeds
                  .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
                  .map((med) => {
                    const days = daysUntilExpiry(med.expiryDate);
                    const isExpired = days <= 0;
                    return (
                      <div
                        key={med.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "12px 14px",
                          background: isExpired ? "#fef2f2" : "#fffbeb",
                          borderRadius: 10,
                          border: `1px solid ${isExpired ? "#fca5a5" : "#fcd34d"}`,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>
                            {med.name}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                            Batch: {med.batchNumber} · Stock: {med.quantity}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                            Expiry: {new Date(med.expiryDate).toLocaleDateString("en-IN", {
                              day: "2-digit", month: "short", year: "numeric",
                            })}
                          </div>
                        </div>
                        <div>
                          {isExpired ? (
                            <span className="badge badge-red">
                              <AlertTriangle size={10} />
                              Expired
                            </span>
                          ) : (
                            <span className="badge badge-yellow">
                              <Calendar size={10} />
                              {days}d left
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="modal-footer" style={{ justifyContent: "space-between" }}>
              <Link href="/inventory" className="btn btn-ghost btn-sm" onClick={() => setModal(null)}>
                <Package size={14} />
                Go to Inventory
              </Link>
              <button className="btn btn-primary btn-sm" onClick={() => setModal(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <Toaster />
    </AppShell>
  );
}
