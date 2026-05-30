import React, { useState, useEffect } from "react";
import api from "../utils/api";

export default function Insights() {
  const [insight, setInsight] = useState(null);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { fetchInsights(); }, [month]);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const insightRes = await api.get(`/insights/monthly?month=${month}`);
      if (insightRes.data.success) {
        setInsight(insightRes.data.insight);
      }
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch insights");
      setInsight(null);
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = async () => {
    try {
      setLoading(true);
      const response = await api.post(`/insights/generate/monthly?month=${month}`);
      setInsight(response.data.insight);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate insights");
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeInsight = async () => {
    try {
      await api.put(`/insights/${insight._id}/acknowledge`);
      setInsight({ ...insight, isAcknowledged: true });
    } catch (err) {
      console.error("Failed to acknowledge:", err);
    }
  };

  return (
    <div className="animate-entry" style={{ maxWidth: "1000px", margin: "30px auto", padding: "20px", width: "100%" }}>
      <h1 style={{ margin: "0 0 24px", fontSize: "28px", fontWeight: "800", color: "var(--text-main)" }}>Insights</h1>

      {error && <div style={{ background: "rgba(239, 68, 68, 0.1)", color: "var(--danger)", padding: "12px", borderRadius: "8px", marginBottom: "20px", border: "1px solid rgba(239, 68, 68, 0.2)" }}>X X {error}</div>}

      <div style={{ marginBottom: "24px" }}>
        <label className="input-label">Select Month:</label>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="input-field" style={{ maxWidth: "200px" }} />
      </div>

      <div style={{ marginBottom: "40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "15px" }}>
          <h2 style={{ margin: 0, color: "var(--text-main)", fontSize: "22px" }}>Monthly Summary</h2>
          <button onClick={generateInsights} disabled={loading} className="btn-primary" style={{ width: "auto", padding: "10px 20px" }}>
            {loading ? "Generating..." : "Generate Fresh Insights"}
          </button>
        </div>

        {insight ? (
          <div className="glass-card">
            <h3 style={{ margin: "0 0 10px", color: "var(--text-main)", fontSize: "20px" }}>{insight.title}</h3>
            <p style={{ color: "var(--text-secondary)", marginBottom: "24px", lineHeight: "1.6" }}>{insight.description}</p>

            {insight.metadata && (
              <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "15px", marginBottom: "30px" }}>
                <div style={{ background: "var(--bg-secondary)", padding: "16px", borderRadius: "12px", border: "1px solid var(--border-subtle)" }}>
                  <p style={{ margin: "0 0 5px", color: "var(--text-muted)", fontSize: "12px", textTransform: "uppercase", fontWeight: "600" }}>Total Spent</p>
                  <p style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "var(--text-main)" }}>₹{insight.metadata.totalSpent.toLocaleString()}</p>
                </div>
                <div style={{ background: "var(--bg-secondary)", padding: "16px", borderRadius: "12px", border: "1px solid var(--border-subtle)" }}>
                  <p style={{ margin: "0 0 5px", color: "var(--text-muted)", fontSize: "12px", textTransform: "uppercase", fontWeight: "600" }}>Transactions</p>
                  <p style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "var(--text-main)" }}>{insight.metadata.transactionCount}</p>
                </div>
                <div style={{ background: "var(--bg-secondary)", padding: "16px", borderRadius: "12px", border: "1px solid var(--border-subtle)" }}>
                  <p style={{ margin: "0 0 5px", color: "var(--text-muted)", fontSize: "12px", textTransform: "uppercase", fontWeight: "600" }}>Avg Transaction</p>
                  <p style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "var(--text-main)" }}>₹{Math.round(insight.metadata.avgTransaction).toLocaleString()}</p>
                </div>
                <div style={{ background: "var(--bg-secondary)", padding: "16px", borderRadius: "12px", border: "1px solid var(--border-subtle)" }}>
                  <p style={{ margin: "0 0 5px", color: "var(--text-muted)", fontSize: "12px", textTransform: "uppercase", fontWeight: "600" }}>Top Category</p>
                  <p style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "var(--primary)" }}>{insight.metadata.highestCategory}</p>
                </div>
              </div>
            )}

            <div style={{ marginBottom: "24px" }}>
              <h4 style={{ margin: "0 0 16px", color: "var(--text-main)", fontSize: "16px", textTransform: "uppercase" }}>Key Action Items</h4>
              {insight.insights && insight.insights.map((item, i) => (
                <div key={i} style={{ backgroundColor: "var(--bg-secondary)", padding: "20px", borderRadius: "12px", marginBottom: "12px", borderLeft: "4px solid var(--primary)", borderTop: "1px solid var(--border-subtle)", borderRight: "1px solid var(--border-subtle)", borderBottom: "1px solid var(--border-subtle)" }}>
                  <p style={{ margin: "0 0 8px", fontWeight: "700", color: "var(--text-main)", fontSize: "16px" }}>{item.title}</p>
                  <p style={{ margin: "0 0 12px", color: "var(--text-secondary)", lineHeight: "1.5" }}>{item.description}</p>
                  <div style={{ background: "var(--primary-soft)", padding: "12px", borderRadius: "8px" }}>
                    <p style={{ margin: "0", fontSize: "14px", color: "var(--primary)", fontWeight: "600" }}>💡 {item.recommendation}</p>
                  </div>
                </div>
              ))}
            </div>

            {!insight.isAcknowledged && (
              <button onClick={acknowledgeInsight} className="btn-primary" style={{ width: "auto", padding: "12px 24px" }}>
                 Mark as Reviewed
              </button>
            )}
          </div>
        ) : (
          <div className="glass-card" style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
            No insights available. Click the generate button above to analyze your spending.
          </div>
        )}
      </div>
    </div>
  );
}