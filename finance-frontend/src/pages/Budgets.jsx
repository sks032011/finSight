import React, { useState, useEffect } from "react";
import api from "../utils/api";

const CATEGORIES = ["Food", "Travel", "Entertainment", "Shopping", "Healthcare", "Work", "Bills", "Utilities", "Other"];

export default function Budgets() {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ category: "", limit: "" });

  useEffect(() => { fetchBudgets(); }, [month]);

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/budgets?month=${month}`);
      setBudgets(response.data.budgets);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch budgets");
      setBudgets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBudget = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post("/budgets", { category: formData.category, limit: parseFloat(formData.limit) });
      setBudgets([...budgets, { ...response.data.budget, spent: 0, percentage: 0, status: "on-track", remaining: response.data.budget.limit }]);
      setFormData({ category: "", limit: "" });
      setShowForm(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create budget");
    }
  };

  const handleDeleteBudget = async (id) => {
    if (!window.confirm("Delete this budget?")) return;
    try {
      await api.delete(`/budgets/${id}`);
      setBudgets(budgets.filter(b => b._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete budget");
    }
  };

  const getStatusColor = (status) => status === "over" ? "var(--danger)" : status === "warning" ? "var(--warning)" : "var(--primary)";
  const getStatusBg = (status) => status === "over" ? "rgba(239, 68, 68, 0.1)" : status === "warning" ? "rgba(245, 158, 11, 0.1)" : "rgba(16, 185, 129, 0.1)";

  return (
    <div className="animate-entry" style={{ maxWidth: "1000px", margin: "30px auto", padding: "20px", width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", flexWrap: "wrap", gap: "15px" }}>
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "800", color: "var(--text-main)" }}>💳 Budgets</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary" style={{ width: "auto", padding: "10px 20px" }}>
          {showForm ? "✕ Cancel" : "➕ Add Budget"}
        </button>
      </div>

      {error && <div style={{ background: "rgba(239, 68, 68, 0.1)", color: "var(--danger)", padding: "12px", borderRadius: "8px", marginBottom: "20px", border: "1px solid rgba(239, 68, 68, 0.2)" }}>❌ {error}</div>}

      <div style={{ marginBottom: "24px" }}>
        <label className="input-label">Select Month:</label>
        <input type="month"  value={month} onChange={(e) => setMonth(e.target.value)} className="input-field" style={{ maxWidth: "200px" }} />
      </div>

      {showForm && (
        <form onSubmit={handleAddBudget} className="glass-card" style={{ marginBottom: "24px" }}>
          <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
            <div>
              <label className="input-label">Category *</label>
              <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} required className="input-field">
                <option value="">Select a category</option>
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Budget Limit (₹) *</label>
              <input type="number" value={formData.limit} onChange={(e) => setFormData({ ...formData, limit: e.target.value })} placeholder="0.00" step="0.01" min="0" required className="input-field" />
            </div>
          </div>
          <button type="submit" className="btn-primary">Create Budget</button>
        </form>
      )}

      {loading ? (
        <div style={{ color: "var(--text-secondary)" }}>Loading budgets...</div>
      ) : budgets.length === 0 ? (
        <div className="glass-card" style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
          No budgets for this month. Click "Add Budget" to create one.
        </div>
      ) : (
        <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
          {budgets.map(budget => (
            <div key={budget._id} className="glass-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "20px" }}>
                <div>
                  <h3 style={{ margin: "0 0 5px", color: "var(--text-main)", fontSize: "18px" }}>{budget.category}</h3>
                  <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)", fontWeight: "500" }}>
                    ₹{budget.spent.toLocaleString()} / ₹{budget.limit.toLocaleString()}
                  </p>
                </div>
                <button onClick={() => handleDeleteBudget(budget._id)} style={{ padding: "6px 12px", backgroundColor: "rgba(239, 68, 68, 0.1)", color: "var(--danger)", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "600", transition: "all 0.2s" }} onMouseOver={e => e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.2)"} onMouseOut={e => e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.1)"}>
                  Delete
                </button>
              </div>

              <div style={{ marginBottom: "15px" }}>
                <div style={{ width: "100%", height: "8px", backgroundColor: "var(--bg-secondary)", borderRadius: "10px", overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(budget.percentage, 100)}%`, height: "100%", backgroundColor: getStatusColor(budget.status), transition: "width 0.5s ease-out" }}></div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" }}>
                <span style={{ padding: "4px 10px", backgroundColor: getStatusBg(budget.status), color: getStatusColor(budget.status), borderRadius: "6px", fontWeight: "600" }}>
                  {budget.percentage}% Used
                </span>
                <span style={{ color: "var(--text-muted)", fontWeight: "500" }}>
                  Left: ₹{budget.remaining.toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}