"use client";

import { useEffect, useState } from "react";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  FileText,
  ShoppingCart,
  X,
  Printer,
  AlertTriangle,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import Toaster, { toast } from "@/components/Toaster";
import { getMedicines } from "@/services/medicines";
import { createSale } from "@/services/sales";
import { Medicine, CartItem, Sale } from "@/types";

function daysUntilExpiry(dateStr: string): number {
  return Math.floor(
    (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
}

export default function BillingPage() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bill, setBill] = useState<Sale | null>(null);

  useEffect(() => {
    getMedicines().then((data) => {
      setMedicines(data);
      setLoading(false);
    });
  }, []);

  // All available medicines (no search) OR filtered list (with search)
  const availableMedicines = medicines.filter(
    (m) => m.quantity > 0 && daysUntilExpiry(m.expiryDate) > 0
  );

  const displayedMedicines = search.trim()
    ? availableMedicines.filter((m) =>
        m.name.toLowerCase().includes(search.toLowerCase())
      )
    : availableMedicines;

  function addToCart(med: Medicine) {
    setCart((prev) => {
      const existing = prev.find((i) => i.medicineId === med.id);
      if (existing) {
        if (existing.quantity >= med.quantity) {
          toast("Max stock reached", "error");
          return prev;
        }
        return prev.map((i) =>
          i.medicineId === med.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          medicineId: med.id,
          name: med.name,
          quantity: 1,
          price: med.price,
          maxQuantity: med.quantity,
        },
      ];
    });
    setSearch("");
  }

  function changeQty(medicineId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.medicineId !== medicineId) return i;
          const next = i.quantity + delta;
          if (next > i.maxQuantity) {
            toast("Max stock reached", "error");
            return i;
          }
          return { ...i, quantity: Math.max(0, next) };
        })
        .filter((i) => i.quantity > 0)
    );
  }

  function removeFromCart(medicineId: string) {
    setCart((prev) => prev.filter((i) => i.medicineId !== medicineId));
  }

  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  async function handleGenerateBill() {
    if (cart.length === 0) {
      toast("Cart is empty", "error");
      return;
    }
    setSubmitting(true);
    try {
      const items = cart.map(({ medicineId, name, quantity, price }) => ({
        medicineId,
        name,
        quantity,
        price,
      }));
      const result = await createSale(items, total);
      setBill({
        id: result.id,
        billNumber: result.billNumber,
        items,
        totalAmount: total,
        createdAt: new Date().toISOString(),
      });
      setCart([]);
      setSearch("");
      toast("Bill generated successfully!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate bill";
      toast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  function startNewBill() {
    setBill(null);
    setCart([]);
    setSearch("");
  }

  function formatBillNumber(sale: Sale) {
    return sale.billNumber 
      ? `INV-${String(sale.billNumber).padStart(5, "0")}` 
      : `#${sale.id.slice(-6).toUpperCase()}`;
  }

  if (bill) {
    return (
      <AppShell>
        <div className="topbar">
          <h1 className="topbar-title">Bill Preview</h1>
          <div className="topbar-actions">
            <button className="btn btn-ghost" onClick={startNewBill}>
              <ShoppingCart size={16} />
              New Bill
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                toast("Printing coming soon", "error");
              }}
              id="print-bill-btn"
            >
              <Printer size={16} />
              Print
            </button>
          </div>
        </div>

        <div className="page-body" style={{ display: "flex", justifyContent: "center", paddingTop: 32 }}>
          <div className="bill-preview" id="bill-preview">
            <div className="bill-header">
              <div className="bill-shop-name">PharmaCare</div>
              <div className="bill-shop-sub">Pharmacy Management System</div>
              <div className="bill-shop-sub" style={{ marginTop: 4 }}>
                Tax Invoice
              </div>
            </div>

            <div className="bill-meta">
              <div>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>Bill No.</div>
                <div style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 500 }}>
                  {formatBillNumber(bill)}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>Date & Time</div>
                <div>
                  {new Date(bill.createdAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
                <div style={{ fontSize: 12 }}>
                  {new Date(bill.createdAt).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>

            <table className="bill-items-table">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th style={{ textAlign: "center" }}>Qty</th>
                  <th style={{ textAlign: "right" }}>Rate</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {bill.items.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.name}</td>
                    <td style={{ textAlign: "center" }}>{item.quantity}</td>
                    <td style={{ textAlign: "right" }}>₹{item.price.toFixed(2)}</td>
                    <td style={{ textAlign: "right", fontWeight: 500 }}>
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="bill-total-section">
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-secondary)", marginBottom: 6 }}>
                <span>Subtotal ({bill.items.reduce((s, i) => s + i.quantity, 0)} items)</span>
                <span>₹{bill.totalAmount.toFixed(2)}</span>
              </div>
              <div className="bill-total-line">
                <span>Total Payable</span>
                <span>₹{bill.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* UPI QR Code Section */}
            <div style={{
              marginTop: 20,
              paddingTop: 16,
              borderTop: "1px dashed #e2e8f0",
              display: "flex",
              flexDirection: "column",
              alignItems: "center"
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>
                Scan to Pay (UPI)
              </div>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
                  `upi://pay?pa=${process.env.NEXT_PUBLIC_UPI_ID || "test@upi"}&pn=${process.env.NEXT_PUBLIC_UPI_NAME || "Store"}&am=${bill.totalAmount.toFixed(2)}&cu=INR`
                )}`} 
                alt="UPI QR Code" 
                style={{ width: 120, height: 120, border: "1px solid var(--border-muted)", borderRadius: 8, padding: 4 }}
              />
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
                {process.env.NEXT_PUBLIC_UPI_ID || "test@upi"}
              </div>
            </div>

            <div className="bill-footer">
              <div>Thank you for your purchase!</div>
              <div style={{ marginTop: 4 }}>Medicines once sold are not returnable</div>
            </div>
          </div>
        </div>

        <Toaster />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="topbar">
        <h1 className="topbar-title">Billing</h1>
        <div className="topbar-actions">
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {cart.length} item{cart.length !== 1 ? "s" : ""} in cart
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="billing-layout">
          {/* Left: Search + Medicine Grid */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
            {/* Search Bar */}
            <div className="search-wrap" style={{ width: "100%" }}>
              <Search />
              <input
                className="search-input"
                style={{ width: "100%", fontSize: 15, padding: "10px 12px 10px 36px" }}
                placeholder="Search medicines..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                id="billing-search"
                aria-label="Search and add medicines"
              />
            </div>

            {/* Medicine Cards Grid */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: 10,
                alignContent: "start",
              }}
            >
              {loading ? (
                <div style={{ gridColumn: "1/-1", display: "flex", justifyContent: "center", padding: 40 }}>
                  <div className="spinner" />
                </div>
              ) : displayedMedicines.length === 0 ? (
                <div style={{ gridColumn: "1/-1" }} className="empty-state">
                  <Search />
                  <div className="empty-state-title">
                    {search ? `No results for "${search}"` : "No medicines available"}
                  </div>
                  <div className="empty-state-sub">
                    {search ? "Try a different name" : "Add medicines in Inventory first"}
                  </div>
                </div>
              ) : (
                displayedMedicines.map((med) => {
                  const inCart = cart.find((i) => i.medicineId === med.id);
                  return (
                    <button
                      key={med.id}
                      onClick={() => addToCart(med)}
                      style={{
                        background: inCart ? "var(--green-bg)" : "var(--bg-card)",
                        border: `1px solid ${inCart ? "var(--primary-light)" : "var(--border-muted)"}`,
                        borderRadius: 10,
                        padding: "12px",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "border-color 0.15s, background 0.15s, box-shadow 0.15s",
                        boxShadow: "var(--shadow-sm)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "var(--primary)";
                        e.currentTarget.style.boxShadow = "var(--shadow-md)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = inCart ? "var(--primary-light)" : "var(--border-muted)";
                        e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                      }}
                      aria-label={`Add ${med.name} to cart`}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", lineHeight: 1.35 }}>
                        {med.name}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        Stock: {med.quantity}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "Figtree, sans-serif", color: "var(--primary)" }}>
                          ₹{med.price.toFixed(2)}
                        </span>
                        {inCart ? (
                          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--primary)", background: "var(--border)", borderRadius: 99, padding: "2px 7px" }}>
                            ×{inCart.quantity}
                          </span>
                        ) : (
                          <span style={{ display: "flex", alignItems: "center", gap: 2 }}>
                            <Plus size={12} color="var(--primary)" />
                            <span style={{ fontSize: 11, color: "var(--primary)", fontWeight: 500 }}>Add</span>
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Cart + Total */}
          <div className="billing-panel">
            <div className="billing-panel-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <ShoppingCart size={16} color="var(--text-secondary)" />
                <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>
                  Cart
                </span>
                {cart.length > 0 && (
                  <span
                    style={{
                      background: "var(--primary)",
                      color: "white",
                      borderRadius: 99,
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "1px 7px",
                    }}
                  >
                    {cart.length}
                  </span>
                )}
              </div>
            </div>

            {/* Cart Items */}
            <div className="cart-items">
              {cart.length === 0 ? (
                <div className="empty-state" style={{ padding: "32px 16px" }}>
                  <ShoppingCart size={36} style={{ margin: "0 auto 10px" }} />
                  <div className="empty-state-title">Cart is empty</div>
                  <div className="empty-state-sub">Search above to add medicines</div>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.medicineId} className="cart-item">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div className="cart-item-name" style={{ flex: 1, marginBottom: 0 }}>
                        {item.name}
                      </div>
                      <button
                        onClick={() => removeFromCart(item.medicineId)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--text-muted)",
                          padding: 2,
                          marginLeft: 8,
                        }}
                        aria-label={`Remove ${item.name}`}
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div className="cart-item-controls">
                      <div className="qty-control">
                        <button
                          className="qty-btn"
                          onClick={() => changeQty(item.medicineId, -1)}
                          aria-label="Decrease quantity"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="qty-value">{item.quantity}</span>
                        <button
                          className="qty-btn"
                          onClick={() => changeQty(item.medicineId, 1)}
                          aria-label="Increase quantity"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, fontFamily: "Figtree, sans-serif", color: "var(--text)" }}>
                        ₹{(item.price * item.quantity).toFixed(2)}
                        <div style={{ fontSize: 11, fontWeight: 400, color: "var(--text-muted)", textAlign: "right" }}>
                          @₹{item.price.toFixed(2)} each
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Total + Action */}
            <div className="billing-total">
              <div className="billing-total-row">
                <span className="billing-total-label">Total</span>
                <span className="billing-total-value">₹{total.toFixed(2)}</span>
              </div>
              <button
                className="btn btn-cta btn-lg"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={handleGenerateBill}
                disabled={cart.length === 0 || submitting}
                id="generate-bill-btn"
              >
                {submitting ? (
                  <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: "rgba(255,255,255,0.3)", borderTopColor: "white" }} />
                ) : (
                  <FileText size={16} />
                )}
                Generate Bill
              </button>
            </div>
          </div>
        </div>
      </div>

      <Toaster />
    </AppShell>
  );
}
