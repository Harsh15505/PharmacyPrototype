"use client";

import { useEffect, useState, useRef } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Package,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import Toaster, { toast } from "@/components/Toaster";
import {
  subscribeMedicines,
  addMedicine,
  updateMedicine,
  deleteMedicine,
} from "@/services/medicines";
import { Medicine } from "@/types";

const EXPIRY_WARN_DAYS = 30;

function daysUntilExpiry(dateStr: string): number {
  const exp = new Date(dateStr);
  const now = new Date();
  return Math.floor((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getExpiryBadge(dateStr: string) {
  const days = daysUntilExpiry(dateStr);
  if (days <= 0) return <span className="badge badge-red"><AlertTriangle size={10} />Expired</span>;
  if (days <= EXPIRY_WARN_DAYS) return <span className="badge badge-yellow"><Calendar size={10} />{days}d left</span>;
  return <span className="badge badge-green">OK</span>;
}

function getStockBadge(qty: number, threshold: number = 10) {
  if (qty === 0) return <span className="badge badge-red">Out of Stock</span>;
  if (qty <= threshold) return <span className="badge badge-yellow"><AlertTriangle size={10} />{qty} left</span>;
  return <span className="badge badge-green">{qty}</span>;
}

const emptyForm = {
  name: "",
  price: "",
  quantity: "",
  expiryDate: "",
  batchNumber: "",
  reorderLevel: "10",
};

type FormData = typeof emptyForm;

export default function InventoryPage() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [search, setSearch] = useState("");
  const [showOutOfStock, setShowOutOfStock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = subscribeMedicines((data) => {
      setMedicines(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (showModal) {
      setTimeout(() => firstInputRef.current?.focus(), 80);
    }
  }, [showModal]);

  const filtered = medicines.filter((m) => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
                          m.batchNumber.toLowerCase().includes(search.toLowerCase());
    
    // Auto-hide zero stock unless toggle is active
    if (!showOutOfStock && m.quantity <= 0) return false;
    
    return matchesSearch;
  });

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(med: Medicine) {
    setEditingId(med.id);
    setForm({
      name: med.name,
      price: String(med.price),
      quantity: String(med.quantity),
      expiryDate: med.expiryDate,
      batchNumber: med.batchNumber,
      reorderLevel: String(med.reorderLevel ?? 10),
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.price || !form.quantity || !form.expiryDate || !form.batchNumber.trim()) {
      toast("Please fill all fields", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        price: parseFloat(form.price),
        quantity: parseInt(form.quantity, 10),
        expiryDate: form.expiryDate,
        batchNumber: form.batchNumber.trim(),
        reorderLevel: parseInt(form.reorderLevel, 10) || 10,
      };
      if (editingId) {
        await updateMedicine(editingId, payload);
        toast("Medicine updated");
      } else {
        await addMedicine(payload);
        toast("Medicine added");
      }
      closeModal();
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMedicine(id);
      toast("Medicine deleted");
      setDeleteConfirm(null);
    } catch {
      toast("Failed to delete", "error");
    }
  }

  return (
    <AppShell>
      <div className="topbar">
        <h1 className="topbar-title">Inventory</h1>
        <div className="topbar-actions">
          <div className="search-wrap">
            <Search />
            <input
              className="search-input"
              placeholder="Search medicines, batch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search medicines"
            />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer", color: "var(--text-secondary)" }}>
            <input 
              type="checkbox" 
              checked={showOutOfStock} 
              onChange={(e) => setShowOutOfStock(e.target.checked)} 
              style={{ width: 14, height: 14, accentColor: "var(--primary)" }}
            />
            Show out of stock
          </label>
          <button className="btn btn-primary" onClick={openAdd} id="add-medicine-btn">
            <Plus size={16} />
            Add Medicine
          </button>
        </div>
      </div>

      <div className="page-body">
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
            <div className="spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="table-wrap">
            <div className="empty-state">
              <Package />
              <div className="empty-state-title">
                {search ? "No medicines found" : "No medicines yet"}
              </div>
              <div className="empty-state-sub">
                {search ? "Try a different search" : "Click 'Add Medicine' to get started"}
              </div>
            </div>
          </div>
        ) : (
          <div className="inventory-list">
            {/* Desktop Table Header */}
            <div className="inventory-header">
              <div className="col-name">Name</div>
              <div className="col-batch">Batch No.</div>
              <div className="col-price">Price (₹)</div>
              <div className="col-stock">Stock</div>
              <div className="col-expiry">Expiry</div>
              <div className="col-actions">Actions</div>
            </div>

            {/* List Body */}
            <div className="inventory-body">
              {filtered.map((med) => (
                <div key={med.id} className="inventory-row">
                  <div className="col-name" data-label="Name">
                    <div style={{ fontWeight: 600 }}>{med.name}</div>
                  </div>
                  <div className="col-batch" data-label="Batch">
                    <span style={{ fontFamily: "monospace", fontSize: 13, color: "var(--text-muted)" }}>
                      {med.batchNumber}
                    </span>
                  </div>
                  <div className="col-price" data-label="Price">
                    <span style={{ fontWeight: 600, fontFamily: "Figtree, sans-serif" }}>
                      ₹{med.price.toFixed(2)}
                    </span>
                  </div>
                  <div className="col-stock" data-label="Stock">
                    {getStockBadge(med.quantity, med.reorderLevel ?? 10)}
                  </div>
                  <div className="col-expiry" data-label="Expiry">
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {getExpiryBadge(med.expiryDate)}
                      <span className="expiry-date-text" style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {new Date(med.expiryDate).toLocaleDateString("en-IN", {
                          day: "2-digit", month: "short", year: "numeric"
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="col-actions">
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => openEdit(med)}
                        aria-label={`Edit ${med.name}`}
                      >
                        <Pencil size={14} />
                        <span className="btn-text">Edit</span>
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => setDeleteConfirm(med.id)}
                        aria-label={`Delete ${med.name}`}
                      >
                        <Trash2 size={14} />
                        <span className="btn-text">Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 12, fontSize: 13, color: "var(--text-muted)" }}>
          {!loading && `${filtered.length} of ${medicines.length} medicines`}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={editingId ? "Edit medicine" : "Add medicine"}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="modal">
            <div className="modal-header">
              <h2 style={{ fontSize: 17, fontWeight: 600 }}>
                {editingId ? "Edit Medicine" : "Add Medicine"}
              </h2>
              <button className="btn btn-ghost btn-sm" onClick={closeModal} aria-label="Close modal">
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label className="form-label" htmlFor="med-name">Medicine Name *</label>
                <input
                  id="med-name"
                  ref={firstInputRef}
                  className="form-input"
                  placeholder="e.g. Paracetamol 500mg"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="med-price">Price (₹) *</label>
                  <input
                    id="med-price"
                    className="form-input"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="med-qty">Quantity *</label>
                  <input
                    id="med-qty"
                    className="form-input"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="med-batch">Batch Number *</label>
                  <input
                    id="med-batch"
                    className="form-input"
                    placeholder="e.g. BT2024001"
                    value={form.batchNumber}
                    onChange={(e) => setForm({ ...form, batchNumber: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="med-expiry">Expiry Date *</label>
                  <input
                    id="med-expiry"
                    className="form-input"
                    type="date"
                    value={form.expiryDate}
                    onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="med-reorder">Low Stock Alert Level</label>
                <input
                  id="med-reorder"
                  className="form-input"
                  type="number"
                  min="1"
                  placeholder="10"
                  value={form.reorderLevel}
                  onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })}
                />
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                  You will get a low stock warning when quantity drops to this number.
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
                id="save-medicine-btn"
              >
                {saving ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : null}
                {editingId ? "Update" : "Add Medicine"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm delete"
        >
          <div className="modal" style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <h2 style={{ fontSize: 17, fontWeight: 600, color: "var(--red)" }}>Delete Medicine?</h2>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
                This action cannot be undone. The medicine will be permanently removed from inventory.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button
                className="btn btn-danger"
                onClick={() => handleDelete(deleteConfirm)}
                id="confirm-delete-btn"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <Toaster />
    </AppShell>
  );
}
