"use client";

import { useEffect, useState } from "react";
import { History as HistoryIcon, Search, ChevronDown, ChevronUp, FileText } from "lucide-react";
import AppShell from "@/components/AppShell";
import Toaster from "@/components/Toaster";
import { subscribeSalesHistory } from "@/services/history";
import { Sale } from "@/types";

export default function HistoryPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to last 100 sales for history
    const unsub = subscribeSalesHistory(100, (data) => {
      setSales(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Group sales by Date string (e.g., "14 Apr 2026")
  const groupedSales = sales.reduce((groups, sale) => {
    const dateObj = new Date(sale.createdAt);
    const dateStr = dateObj.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    if (!groups[dateStr]) {
      groups[dateStr] = [];
    }
    groups[dateStr].push(sale);
    return groups;
  }, {} as Record<string, Sale[]>);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatBillNumber = (sale: Sale) => {
    return sale.billNumber 
      ? `INV-${String(sale.billNumber).padStart(5, "0")}` 
      : `#${sale.id.slice(-6).toUpperCase()}`;
  };

  return (
    <AppShell>
      <div className="topbar">
        <h1 className="topbar-title">Billing History</h1>
      </div>

      <div className="page-body" style={{ maxWidth: 800, margin: "0 auto" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
            <div className="spinner" />
          </div>
        ) : sales.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <HistoryIcon size={36} />
              <div className="empty-state-title">No billing history</div>
              <div className="empty-state-sub">Generated bills will appear here</div>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {Object.entries(groupedSales).map(([date, daySales]) => (
              <div key={date}>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid var(--border-muted)" }}>
                  {date} <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)", marginLeft: 8 }}>({daySales.length} bills)</span>
                </h2>
                
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {daySales.map((sale) => (
                    <div 
                      key={sale.id}
                      className="card"
                      style={{ overflow: "hidden", transition: "all 0.2s ease" }}
                    >
                      {/* Summary Row (Clickable) */}
                      <button
                        onClick={() => toggleExpand(sale.id)}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "16px",
                          background: "var(--bg-card)",
                          border: "none",
                          cursor: "pointer",
                          textAlign: "left"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                          <div style={{ background: "var(--bg)", width: 40, height: 40, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)" }}>
                            <FileText size={20} />
                          </div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>
                              {formatBillNumber(sale)}
                            </div>
                            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                              {new Date(sale.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                              {" · "}
                              {sale.items.reduce((sum, item) => sum + item.quantity, 0)} items
                            </div>
                          </div>
                        </div>
                        
                        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "Figtree, sans-serif", color: "var(--text)" }}>
                            ₹{sale.totalAmount.toFixed(2)}
                          </div>
                          {expandedId === sale.id ? (
                            <ChevronUp size={20} color="var(--text-muted)" />
                          ) : (
                            <ChevronDown size={20} color="var(--text-muted)" />
                          )}
                        </div>
                      </button>

                      {/* Expanded Details */}
                      {expandedId === sale.id && (
                        <div style={{ padding: "0 16px 16px 16px", borderTop: "1px solid var(--border-muted)", background: "#f8fafc" }}>
                          <table style={{ width: "100%", fontSize: 13, marginTop: 12 }}>
                            <thead style={{ background: "transparent" }}>
                              <tr>
                                <th style={{ padding: "8px 0", borderBottom: "1px dashed var(--border-muted)", color: "var(--text-secondary)", fontWeight: 600 }}>Item</th>
                                <th style={{ padding: "8px 0", borderBottom: "1px dashed var(--border-muted)", color: "var(--text-secondary)", fontWeight: 600, textAlign: "center" }}>Qty</th>
                                <th style={{ padding: "8px 0", borderBottom: "1px dashed var(--border-muted)", color: "var(--text-secondary)", fontWeight: 600, textAlign: "right" }}>Rate</th>
                                <th style={{ padding: "8px 0", borderBottom: "1px dashed var(--border-muted)", color: "var(--text-secondary)", fontWeight: 600, textAlign: "right" }}>Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sale.items.map((item, idx) => (
                                <tr key={idx}>
                                  <td style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", color: "var(--text)" }}>{item.name}</td>
                                  <td style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", textAlign: "center", color: "var(--text-secondary)" }}>{item.quantity}</td>
                                  <td style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", textAlign: "right", color: "var(--text-secondary)" }}>₹{item.price.toFixed(2)}</td>
                                  <td style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", textAlign: "right", fontWeight: 500, color: "var(--text)" }}>
                                    ₹{(item.price * item.quantity).toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Toaster />
    </AppShell>
  );
}
