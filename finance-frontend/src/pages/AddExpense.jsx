import React, { useState } from "react";
import api from "../utils/api";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

export default function AddExpense() {
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    tags: ""
  });
  const [suggestedCategory, setSuggestedCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDescriptionChange = (e) => {
    const description = e.target.value;
    setFormData(prev => ({ ...prev, description }));
    if (description.trim().length < 2) {
      setSuggestedCategory(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.description || !formData.amount) {
      toast.error("Description and amount are required");
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading("Analyzing and saving expense...", {
      style: { background: "var(--card-bg)", color: "var(--text-main)", border: "1px solid var(--border-main)" }
    });

    try {
      const response = await api.post("/expenses", {
        description: formData.description,
        amount: parseFloat(formData.amount),
        date: formData.date,
        tags: formData.tags ? formData.tags.split(",").map(t => t.trim()) : []
      });

      if (response.data.success) {
        toast.success(
          `Categorized as ${response.data.expense.category} (${Math.round(response.data.expense.categorization.confidence * 100)}% confident)`, 
          { id: loadingToast, duration: 4000 }
        );
        
        setSuggestedCategory(response.data.expense);
        
        setFormData({
          description: "",
          amount: "",
          date: new Date().toISOString().split("T")[0],
          tags: ""
        });

        setTimeout(() => navigate("/dashboard"), 1500);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add expense", { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-entry" style={{ maxWidth: "600px", margin: "20px auto", width: "100%" }}>
      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ margin: "0 0 8px", fontSize: "30px", fontWeight: "800", letterSpacing: "-0.5px", color: "var(--text-main)" }}>Add Expense</h1>
        <p style={{ margin: 0, color: "var(--text-secondary)", fontWeight: "500" }}>Let the AI categorize your spending.</p>
      </div>

      <div className="glass-card">
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "20px" }}>
            <label className="input-label">Description *</label>
            <input 
              type="text" 
              name="description" 
              value={formData.description} 
              onChange={handleDescriptionChange} 
              placeholder="e.g., Uber to airport" 
              required 
              className="input-field"
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label className="input-label">Amount (₹) *</label>
            <input 
              type="number" 
              name="amount" 
              value={formData.amount} 
              onChange={handleChange} 
              placeholder="0.00" 
              step="0.01" 
              min="0" 
              required 
              className="input-field"
            />
          </div>

          <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "30px" }}>
            <div>
              <label className="input-label">Date</label>
              <input 
                type="date" 
                name="date" 
                value={formData.date} 
                onChange={handleChange} 
                className="input-field"
              />
            </div>
            <div>
              <label className="input-label">Tags (Optional)</label>
              <input 
                type="text" 
                name="tags" 
                value={formData.tags} 
                onChange={handleChange} 
                placeholder="e.g., work, travel" 
                className="input-field"
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Processing..." : "Save Transaction"}
          </button>
        </form>
      </div>
    </div>
  );
}