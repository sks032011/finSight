import React, { useState, useEffect } from "react";
import api from "../utils/api";
import toast from "react-hot-toast";
import { Edit2, Trash2, X } from "lucide-react";

const VALID_CATEGORIES = ["Food", "Travel", "Entertainment", "Shopping", "Healthcare", "Work", "Bills", "Utilities", "Other"];

export default function ViewExpenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [filters, setFilters] = useState({ category: "", startDate: "", endDate: "" });

  // EDIT OVERLAY MODAL STATES
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [editFormData, setEditFormData] = useState({ description: "", amount: "", category: "", date: "", tags: "", notes: "" });

  useEffect(() => { setPage(1); }, [filters]);
  useEffect(() => { fetchExpenses(page === 1); }, [page, filters]);

  const fetchExpenses = async (isNewSearch = false) => {
    try {
      if (isNewSearch) setLoading(true);
      const params = new URLSearchParams();
      params.append("page", page);
      params.append("limit", 50);
      if (filters.category) params.append("category", filters.category);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);

      const response = await api.get(`/expenses?${params.toString()}`);
      setExpenses(prev => isNewSearch ? response.data.expenses : [...prev, ...response.data.expenses]);
      setHasMore(response.data.hasMore);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch expenses");
      if (isNewSearch) setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  // OPEN EDIT INTERFACE INITIALIZATION
  const openEditModal = (expense) => {
    setEditingExpense(expense);
    setEditFormData({
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      date: new Date(expense.date).toISOString().split("T")[0],
      tags: expense.tags ? expense.tags.join(", ") : "",
      notes: expense.notes || ""
    });
    setIsEditModalOpen(true);
  };

  // SUBMIT BACKEND PUT REQUEST UPDATE EXECUTION
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const updateToast = toast.loading("Updating transaction logs and re-evaluating anomalies...", {
      style: { background: "var(--card-bg)", color: "var(--text-main)" }
    });

    try {
      const response = await api.put(`/expenses/${editingExpense._id}`, {
        description: editFormData.description,
        amount: parseFloat(editFormData.amount),
        category: editFormData.category,
        date: editFormData.date,
        tags: editFormData.tags ? editFormData.tags.split(",").map(t => t.trim()) : [],
        notes: editFormData.notes
      });

      if (response.data.success) {
        toast.success("Transaction updated successfully!", { id: updateToast });
        // Synchronously update local layout array map to show fresh mutation data immediately
        setExpenses(expenses.map(exp => exp._id === editingExpense._id ? response.data.expense : exp));
        setIsEditModalOpen(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed execution updates", { id: updateToast });
    }
  };

  const handleDelete = (id) => {
    toast((t) => (
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <p style={{ margin: 0, fontWeight: "600", color: "var(--text-main)" }}>Delete this expense?</p>
        <div style={{ display: "flex", gap: "10px", marginTop: "5px" }}>
          <button onClick={async () => { toast.dismiss(t.id); await executeDelete(id); }} style={{ padding: "6px 12px", background: "var(--danger)", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}>
            Yes, Delete
          </button>
          <button onClick={() => toast.dismiss(t.id)} style={{ padding: "6px 12px", background: "var(--bg-secondary)", color: "var(--text-main)", border: "1px solid var(--border-main)", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}>
            Cancel
          </button>
        </div>
      </div>
    ), { duration: Infinity, style: { background: "var(--card-bg)", border: "1px solid var(--border-main)" } });
  };

  const executeDelete = async (id) => {
    const loadingToast = toast.loading("Deleting expense...", { style: { background: "var(--card-bg)", color: "var(--text-main)" }});
    try {
      await api.delete(`/expenses/${id}`);
      setExpenses(expenses.filter(e => e._id !== id));
      toast.success("Expense deleted successfully!", { id: loadingToast });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete", { id: loadingToast });
    }
  };

  const handleFilterChange = (e) => setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const getCategoryBadge = (category) => {
    const styles = {
      Food: { bg: "rgba(239, 68, 68, 0.1)", color: "#EF4444", border: "rgba(239, 68, 68, 0.2)" },
      Travel: { bg: "rgba(59, 130, 246, 0.1)", color: "#3B82F6", border: "rgba(59, 130, 246, 0.2)" },
      Entertainment: { bg: "rgba(139, 92, 246, 0.1)", color: "#8B5CF6", border: "rgba(139, 92, 246, 0.2)" },
      Shopping: { bg: "rgba(245, 158, 11, 0.1)", color: "#F59E0B", border: "rgba(245, 158, 11, 0.2)" },
      Healthcare: { bg: "rgba(244, 63, 94, 0.1)", color: "#F43F5E", border: "rgba(244, 63, 94, 0.2)" },
      Work: { bg: "rgba(16, 185, 129, 0.1)", color: "#10B981", border: "rgba(16, 185, 129, 0.2)" },
      Bills: { bg: "rgba(99, 102, 241, 0.1)", color: "#6366F1", border: "rgba(99, 102, 241, 0.2)" },
      Utilities: { bg: "rgba(20, 184, 166, 0.1)", color: "#14B8A6", border: "rgba(20, 184, 166, 0.2)" },
      Other: { bg: "rgba(148, 163, 184, 0.1)", color: "#94A3B8", border: "rgba(148, 163, 184, 0.2)" }
    };
    const style = styles[category] || styles.Other;
    return (
      <span style={{ display: "inline-block", backgroundColor: style.bg, color: style.color, border: `1px solid ${style.border}`, padding: "4px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: "600" }}>
        {category}
      </span>
    );
  };

  return (
    <div style={{ maxWidth: "1000px", margin: "30px auto", padding: "20px", width: "100%" }}>
      <h1 style={{ margin: "0 0 24px", fontSize: "28px", fontWeight: "800", color: "var(--text-main)" }}>View Expenses</h1>

      <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "24px" }}>
        <select name="category" value={filters.category} onChange={handleFilterChange} className="input-field">
          <option value="">All Categories</option>
          {VALID_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
        <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="input-field" />
        <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="input-field" />
      </div>

      {error && <div style={{ background: "rgba(239, 68, 68, 0.1)", color: "var(--danger)", padding: "12px", borderRadius: "8px", marginBottom: "15px", border: "1px solid rgba(239, 68, 68, 0.2)" }}>❌ {error}</div>}

      {loading && page === 1 ? (
        <div style={{ color: "var(--text-secondary)" }}>Loading transactions...</div>
      ) : expenses.length === 0 ? (
        <div style={{ color: "var(--text-secondary)", textAlign: "center", padding: "40px", background: "var(--card-bg)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-main)" }}>
          No expenses found for this period.
        </div>
      ) : (
        <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "20px", borderBottom: "1px solid var(--border-main)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ color: "var(--text-secondary)", margin: 0, fontWeight: "500" }}>Showing {expenses.length} transactions</p>
            <p style={{ color: "var(--text-main)", margin: 0, fontWeight: "700" }}>Total: ₹{expenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}</p>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ backgroundColor: "var(--bg-secondary)" }}>
                  <th style={{ padding: "16px 20px", color: "var(--text-secondary)", fontSize: "13px", fontWeight: "600" }}>Date</th>
                  <th style={{ padding: "16px 20px", color: "var(--text-secondary)", fontSize: "13px", fontWeight: "600" }}>Description</th>
                  <th style={{ padding: "16px 20px", color: "var(--text-secondary)", fontSize: "13px", fontWeight: "600" }}>Category</th>
                  <th style={{ padding: "16px 20px", color: "var(--text-secondary)", fontSize: "13px", fontWeight: "600", textAlign: "right" }}>Amount</th>
                  <th style={{ padding: "16px 20px", color: "var(--text-secondary)", fontSize: "13px", fontWeight: "600", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense._id} style={{ borderTop: "1px solid var(--border-main)" }}>
                    <td style={{ padding: "16px 20px", color: "var(--text-secondary)", fontSize: "14px" }}>{new Date(expense.date).toLocaleDateString()}</td>
                    <td style={{ padding: "16px 20px", color: "var(--text-main)", fontSize: "14px", fontWeight: "500" }}>{expense.description}</td>
                    <td style={{ padding: "16px 20px" }}>{getCategoryBadge(expense.category)}</td>
                    <td style={{ padding: "16px 20px", color: "var(--text-main)", fontSize: "15px", fontWeight: "700", textAlign: "right" }}>₹{expense.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    <td style={{ padding: "16px 20px", textAlign: "center", display: "flex", gap: "8px", justifyContent: "center" }}>
                      <button onClick={() => openEditModal(expense)} style={{ padding: "6px", backgroundColor: "rgba(59, 130, 246, 0.1)", color: "var(--info)", border: "none", borderRadius: "6px", cursor: "pointer" }}>
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(expense._id)} style={{ padding: "6px", backgroundColor: "rgba(239, 68, 68, 0.1)", color: "var(--danger)", border: "none", borderRadius: "6px", cursor: "pointer" }}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DYNAMIC EDIT MODAL GLASS OVERLAY ELEMENT */}
      {isEditModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(5px)" }}>
          <div className="glass-card" style={{ width: "90%", maxWidth: "500px", padding: "30px", position: "relative", boxShadow: "0 20px 40px rgba(0,0,0,0.5)" }}>
            <button onClick={() => setIsEditModalOpen(false)} style={{ position: "absolute", top: "20px", right: "20px", background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}>
              <X size={20} />
            </button>
            
            <h2 style={{ margin: "0 0 20px 0", color: "var(--text-main)", fontSize: "22px", fontWeight: "800" }}>Modify Transaction</h2>
            
            <form onSubmit={handleEditSubmit}>
              <div style={{ marginBottom: "15px" }}>
                <label className="input-label">Description</label>
                <input type="text" value={editFormData.description} onChange={e => setEditFormData({...editFormData, description: e.target.value})} className="input-field" required />
              </div>

              <div style={{ marginBottom: "15px" }}>
                <label className="input-label">Amount (₹)</label>
                <input type="number" step="0.01" value={editFormData.amount} onChange={e => setEditFormData({...editFormData, amount: e.target.value})} className="input-field" required />
              </div>

              <div style={{ marginBottom: "15px" }}>
                <label className="input-label">Category (AI Override)</label>
                <select value={editFormData.category} onChange={e => setEditFormData({...editFormData, category: e.target.value})} className="input-field" required>
                  {VALID_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label className="input-label">Transaction Date</label>
                <input type="date" value={editFormData.date} onChange={e => setEditFormData({...editFormData, date: e.target.value})} className="input-field" required />
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn-primary" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-main)", color: "var(--text-main)", width: "auto", padding: "10px 20px" }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ width: "auto", padding: "10px 20px" }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// import React, { useState, useEffect } from "react";
// import api from "../utils/api";
// import toast from "react-hot-toast";

// export default function ViewExpenses() {
//   const [expenses, setExpenses] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");
//   const [page, setPage] = useState(1);
//   const [hasMore, setHasMore] = useState(false);
//   const [filters, setFilters] = useState({ category: "", startDate: "", endDate: "" });

//   useEffect(() => { setPage(1); }, [filters]);

//   useEffect(() => { fetchExpenses(page === 1); }, [page, filters]);

//   const fetchExpenses = async (isNewSearch = false) => {
//     try {
//       if (isNewSearch) setLoading(true);
      
//       const params = new URLSearchParams();
//       params.append("page", page);
//       params.append("limit", 50);
//       if (filters.category) params.append("category", filters.category);
//       if (filters.startDate) params.append("startDate", filters.startDate);
//       if (filters.endDate) params.append("endDate", filters.endDate);

//       const response = await api.get(`/expenses?${params.toString()}`);

//       setExpenses(prev => isNewSearch ? response.data.expenses : [...prev, ...response.data.expenses]);
//       setHasMore(response.data.hasMore);
//       setError("");
//     } catch (err) {
//       setError(err.response?.data?.message || "Failed to fetch expenses");
//       if (isNewSearch) setExpenses([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleDelete = (id) => {
//     toast((t) => (
//       <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
//         <p style={{ margin: 0, fontWeight: "600", color: "var(--text-main)" }}>Delete this expense?</p>
//         <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)" }}>This action cannot be undone.</p>
//         <div style={{ display: "flex", gap: "10px", marginTop: "5px" }}>
//           <button 
//             onClick={async () => { toast.dismiss(t.id); await executeDelete(id); }}
//             style={{ padding: "6px 12px", background: "var(--danger)", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}
//           >
//             Yes, Delete
//           </button>
//           <button 
//             onClick={() => toast.dismiss(t.id)}
//             style={{ padding: "6px 12px", background: "var(--bg-secondary)", color: "var(--text-main)", border: "1px solid var(--border-main)", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}
//           >
//             Cancel
//           </button>
//         </div>
//       </div>
//     ), { duration: Infinity, style: { background: "var(--card-bg)", border: "1px solid var(--border-main)" } });
//   };

//   const executeDelete = async (id) => {
//     const loadingToast = toast.loading("Deleting expense...", { style: { background: "var(--card-bg)", color: "var(--text-main)" }});
//     try {
//       await api.delete(`/expenses/${id}`);
//       setExpenses(expenses.filter(e => e._id !== id));
//       toast.success("Expense deleted successfully!", { id: loadingToast });
//     } catch (err) {
//       toast.error(err.response?.data?.message || "Failed to delete", { id: loadingToast });
//     }
//   };

//   const handleFilterChange = (e) => setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));

//   //  Dark Mode Badges
//   const getCategoryBadge = (category) => {
//     const styles = {
//       Food: { bg: "rgba(239, 68, 68, 0.1)", color: "#EF4444", border: "rgba(239, 68, 68, 0.2)" },
//       Travel: { bg: "rgba(59, 130, 246, 0.1)", color: "#3B82F6", border: "rgba(59, 130, 246, 0.2)" },
//       Entertainment: { bg: "rgba(139, 92, 246, 0.1)", color: "#8B5CF6", border: "rgba(139, 92, 246, 0.2)" },
//       Shopping: { bg: "rgba(245, 158, 11, 0.1)", color: "#F59E0B", border: "rgba(245, 158, 11, 0.2)" },
//       Healthcare: { bg: "rgba(244, 63, 94, 0.1)", color: "#F43F5E", border: "rgba(244, 63, 94, 0.2)" },
//       Work: { bg: "rgba(16, 185, 129, 0.1)", color: "#10B981", border: "rgba(16, 185, 129, 0.2)" },
//       Bills: { bg: "rgba(99, 102, 241, 0.1)", color: "#6366F1", border: "rgba(99, 102, 241, 0.2)" },
//       Utilities: { bg: "rgba(20, 184, 166, 0.1)", color: "#14B8A6", border: "rgba(20, 184, 166, 0.2)" },
//       Other: { bg: "rgba(148, 163, 184, 0.1)", color: "#94A3B8", border: "rgba(148, 163, 184, 0.2)" }
//     };
//     const style = styles[category] || styles.Other;
//     return (
//       <span style={{ display: "inline-block", backgroundColor: style.bg, color: style.color, border: `1px solid ${style.border}`, padding: "4px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: "600" }}>
//         {category}
//       </span>
//     );
//   };

//   return (
//     <div style={{ maxWidth: "1000px", margin: "30px auto", padding: "20px", width: "100%" }}>
//       <h1 style={{ margin: "0 0 24px", fontSize: "28px", fontWeight: "800", color: "var(--text-main)" }}>View Expenses</h1>

//       <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "24px" }}>
//         <select name="category" value={filters.category} onChange={handleFilterChange} className="input-field">
//           <option value="">All Categories</option>
//           <option value="Food">Food</option>
//           <option value="Travel">Travel</option>
//           <option value="Entertainment">Entertainment</option>
//           <option value="Shopping">Shopping</option>
//           <option value="Healthcare">Healthcare</option>
//           <option value="Work">Work</option>
//           <option value="Bills">Bills</option>
//           <option value="Utilities">Utilities</option>
//         </select>
//         <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="input-field" />
//         <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="input-field" />
//       </div>

//       {error && <div style={{ background: "rgba(239, 68, 68, 0.1)", color: "var(--danger)", padding: "12px", borderRadius: "8px", marginBottom: "15px", border: "1px solid rgba(239, 68, 68, 0.2)" }}>❌ {error}</div>}

//       {loading && page === 1 ? (
//         <div style={{ color: "var(--text-secondary)" }}>Loading transactions...</div>
//       ) : expenses.length === 0 ? (
//         <div style={{ color: "var(--text-secondary)", textAlign: "center", padding: "40px", background: "var(--card-bg)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-main)" }}>
//           No expenses found for this period.
//         </div>
//       ) : (
//         <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
//           <div style={{ padding: "20px", borderBottom: "1px solid var(--border-main)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
//             <p style={{ color: "var(--text-secondary)", margin: 0, fontWeight: "500" }}>
//               Showing {expenses.length} transactions
//             </p>
//             <p style={{ color: "var(--text-main)", margin: 0, fontWeight: "700" }}>
//               Total: ₹{expenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}
//             </p>
//           </div>

//           <div style={{ overflowX: "auto" }}>
//             <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
//               <thead>
//                 <tr style={{ backgroundColor: "var(--bg-secondary)" }}>
//                   <th style={{ padding: "16px 20px", color: "var(--text-secondary)", fontSize: "13px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>Date</th>
//                   <th style={{ padding: "16px 20px", color: "var(--text-secondary)", fontSize: "13px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>Description</th>
//                   <th style={{ padding: "16px 20px", color: "var(--text-secondary)", fontSize: "13px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>Category</th>
//                   <th style={{ padding: "16px 20px", color: "var(--text-secondary)", fontSize: "13px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "right" }}>Amount</th>
//                   <th style={{ padding: "16px 20px", color: "var(--text-secondary)", fontSize: "13px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "center" }}>Actions</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {expenses.map((expense, i) => (
//                   <tr key={expense._id} style={{ borderTop: "1px solid var(--border-main)", backgroundColor: "transparent", transition: "background 0.2s" }} onMouseOver={e => e.currentTarget.style.backgroundColor = "var(--bg-secondary)"} onMouseOut={e => e.currentTarget.style.backgroundColor = "transparent"}>
//                     <td style={{ padding: "16px 20px", color: "var(--text-secondary)", fontSize: "14px" }}>{new Date(expense.date).toLocaleDateString()}</td>
//                     <td style={{ padding: "16px 20px", color: "var(--text-main)", fontSize: "14px", fontWeight: "500" }}>{expense.description}</td>
//                     <td style={{ padding: "16px 20px" }}>{getCategoryBadge(expense.category)}</td>
//                     <td style={{ padding: "16px 20px", color: "var(--text-main)", fontSize: "15px", fontWeight: "700", textAlign: "right" }}>₹{expense.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
//                     <td style={{ padding: "16px 20px", textAlign: "center" }}>
//                       <button 
//                         onClick={() => handleDelete(expense._id)} 
//                         style={{ padding: "6px 12px", backgroundColor: "rgba(239, 68, 68, 0.1)", color: "var(--danger)", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "600", transition: "all 0.2s" }}
//                         onMouseOver={e => e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.2)"}
//                         onMouseOut={e => e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.1)"}
//                       >
//                         Delete
//                       </button>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
          
//           {hasMore && (
//             <div style={{ padding: "20px", borderTop: "1px solid var(--border-main)" }}>
//               <button onClick={() => setPage(p => p + 1)} disabled={loading} style={{ width: "100%", padding: "12px", background: "var(--bg-secondary)", color: "var(--text-main)", border: "1px solid var(--border-main)", borderRadius: "8px", cursor: "pointer", fontWeight: "600", transition: "all 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "var(--border-main)"} onMouseOut={e => e.currentTarget.style.background = "var(--bg-secondary)"}>
//                 {loading ? "Loading..." : "Load More Transactions"}
//               </button>
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }