import React, { useState, useEffect } from "react";
import api from "../utils/api";

export default function Anomalies() {
  const [anomalies, setAnomalies] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedAnomaly, setSelectedAnomaly] = useState(null);
  const [statusFilter, setStatusFilter] = useState("pending");

  useEffect(() => {
    fetchAnomalies();
    fetchStats();
  }, [statusFilter]);

  const fetchAnomalies = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/anomalies?status=${statusFilter}`);
      setAnomalies(response.data.anomalies);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch anomalies");
      setAnomalies([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get("/anomalies/stats/summary");
      setStats(response.data);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  };

  const handleReview = async (anomalyId, feedback) => {
    try {
      const response = await api.put(`/anomalies/${anomalyId}/review`, { userFeedback: feedback });
      setAnomalies(anomalies.map(a => a._id === anomalyId ? response.data.anomaly : a));
      setSelectedAnomaly(response.data.anomaly);
      setStatusFilter("pending");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to review anomaly");
    }
  };

  const handleDismiss = async (anomalyId) => {
    try {
      await api.put(`/anomalies/${anomalyId}/dismiss`);
      setAnomalies(anomalies.filter(a => a._id !== anomalyId));
      setSelectedAnomaly(null);
      setStatusFilter("pending");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to dismiss anomaly");
    }
  };

  const getSeverityColor = (severity) => severity === "high" ? "var(--danger)" : severity === "medium" ? "var(--warning)" : "var(--primary)";
  const getAnomalyColor = (score) => score > 75 ? "var(--danger)" : score > 50 ? "var(--warning)" : "var(--primary)";

  return (
    <div className="animate-entry" style={{ maxWidth: "1200px", margin: "30px auto", padding: "20px", width: "100%" }}>
      <h1 style={{ margin: "0 0 24px", fontSize: "28px", fontWeight: "800", color: "var(--text-main)" }}>🔍 Anomaly Detection</h1>

      {error && <div style={{ background: "rgba(239, 68, 68, 0.1)", color: "var(--danger)", padding: "12px", borderRadius: "8px", marginBottom: "20px", border: "1px solid rgba(239, 68, 68, 0.2)" }}>❌ {error}</div>}

      {stats && (
        <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px", marginBottom: "30px" }}>
          <div className="glass-card" style={{ textAlign: "center", padding: "20px" }}>
            <p style={{ margin: "0 0 8px", color: "var(--text-secondary)", fontSize: "13px", fontWeight: "600", textTransform: "uppercase" }}>Total Anomalies</p>
            <p style={{ margin: 0, fontSize: "28px", fontWeight: "800", color: "var(--text-main)" }}>{stats.total}</p>
          </div>
          <div className="glass-card" style={{ textAlign: "center", padding: "20px", borderColor: "rgba(245, 158, 11, 0.3)", background: "linear-gradient(180deg, var(--card-bg) 0%, rgba(245, 158, 11, 0.05) 100%)" }}>
            <p style={{ margin: "0 0 8px", color: "var(--warning)", fontSize: "13px", fontWeight: "600", textTransform: "uppercase" }}>Pending Review</p>
            <p style={{ margin: 0, fontSize: "28px", fontWeight: "800", color: "var(--warning)" }}>{stats.pending}</p>
          </div>
          <div className="glass-card" style={{ textAlign: "center", padding: "20px" }}>
            <p style={{ margin: "0 0 8px", color: "var(--primary)", fontSize: "13px", fontWeight: "600", textTransform: "uppercase" }}>Reviewed</p>
            <p style={{ margin: 0, fontSize: "28px", fontWeight: "800", color: "var(--primary)" }}>{stats.reviewed}</p>
          </div>
          <div className="glass-card" style={{ textAlign: "center", padding: "20px" }}>
            <p style={{ margin: "0 0 8px", color: "var(--danger)", fontSize: "13px", fontWeight: "600", textTransform: "uppercase" }}>Dismissed</p>
            <p style={{ margin: 0, fontSize: "28px", fontWeight: "800", color: "var(--danger)" }}>{stats.dismissed}</p>
          </div>
        </div>
      )}

      <div style={{ marginBottom: "24px" }}>
        <label className="input-label">Filter Status:</label>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field" style={{ maxWidth: "200px" }}>
          <option value="all">All Anomalies</option>
          <option value="pending">Pending Review</option>
          <option value="reviewed">Reviewed</option>
          <option value="dismissed">Dismissed</option>
        </select>
      </div>

      {loading ? (
        <div style={{ color: "var(--text-secondary)" }}>Loading anomalies...</div>
      ) : anomalies.length === 0 ? (
        <div className="glass-card" style={{ textAlign: "center", padding: "40px", color: "var(--primary)", borderColor: "var(--primary-soft)", background: "var(--primary-soft)" }}>
          ✅ No anomalies found. Your spending looks normal!
        </div>
      ) : (
        <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "25px" }}>
          {/* List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "600px", overflowY: "auto", paddingRight: "5px" }}>
            {anomalies.map(anomaly => {
              const isSelected = selectedAnomaly?._id === anomaly._id;
              return (
                <div key={anomaly._id} onClick={() => setSelectedAnomaly(anomaly)} className="glass-card" style={{ padding: "16px", cursor: "pointer", borderColor: isSelected ? "var(--primary)" : "var(--border-main)", background: isSelected ? "var(--primary-soft)" : "var(--card-bg)", transform: isSelected ? "translateX(4px)" : "none" }}>
                  <p style={{ margin: "0 0 8px", fontWeight: "600", color: "var(--text-main)" }}>{anomaly.description}</p>
                  <p style={{ margin: "0 0 12px", fontSize: "14px", color: "var(--text-secondary)" }}>₹{anomaly.amount.toLocaleString()} in {anomaly.category}</p>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <span style={{ padding: "4px 8px", backgroundColor: "var(--bg-secondary)", border: `1px solid ${getAnomalyColor(anomaly.anomalyScore)}`, color: getAnomalyColor(anomaly.anomalyScore), borderRadius: "6px", fontSize: "12px", fontWeight: "600" }}>
                      {anomaly.anomalyScore}% Risk
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detail Panel */}
          {selectedAnomaly && (
            <div className="glass-card" style={{ alignSelf: "start" }}>
              <h2 style={{ margin: "0 0 24px", color: "var(--text-main)", fontSize: "22px" }}>{selectedAnomaly.description}</h2>

              <div style={{ marginBottom: "24px" }}>
                <h3 style={{ margin: "0 0 12px", color: "var(--text-secondary)", fontSize: "14px", textTransform: "uppercase" }}>Transaction Details</h3>
                <div style={{ background: "var(--bg-secondary)", borderRadius: "8px", padding: "16px", border: "1px solid var(--border-main)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "12px", borderBottom: "1px solid var(--border-subtle)", marginBottom: "12px" }}>
                    <span style={{ color: "var(--text-muted)", fontWeight: "500" }}>Amount</span>
                    <span style={{ color: "var(--text-main)", fontWeight: "700" }}>₹{selectedAnomaly.amount.toLocaleString()}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "12px", borderBottom: "1px solid var(--border-subtle)", marginBottom: "12px" }}>
                    <span style={{ color: "var(--text-muted)", fontWeight: "500" }}>Category</span>
                    <span style={{ color: "var(--text-main)", fontWeight: "600" }}>{selectedAnomaly.category}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)", fontWeight: "500" }}>Date</span>
                    <span style={{ color: "var(--text-main)", fontWeight: "500" }}>{new Date(selectedAnomaly.date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <h3 style={{ margin: "0 0 12px", color: "var(--text-secondary)", fontSize: "14px", textTransform: "uppercase" }}>📊 Statistical Analysis</h3>
                <div style={{ background: "var(--bg-secondary)", borderRadius: "8px", padding: "16px", border: "1px solid var(--border-main)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "12px", borderBottom: "1px solid var(--border-subtle)", marginBottom: "12px" }}>
                    <span style={{ color: "var(--text-muted)", fontWeight: "500" }}>Z-Score</span>
                    <span style={{ color: "var(--text-main)", fontWeight: "600" }}>{selectedAnomaly.zScore}σ</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "12px", borderBottom: "1px solid var(--border-subtle)", marginBottom: "12px" }}>
                    <span style={{ color: "var(--text-muted)", fontWeight: "500" }}>Historical Avg</span>
                    <span style={{ color: "var(--text-main)", fontWeight: "600" }}>₹{selectedAnomaly.historicalMean.toLocaleString()}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)", fontWeight: "500" }}>Data Points</span>
                    <span style={{ color: "var(--text-main)", fontWeight: "500" }}>{selectedAnomaly.historicalCount} transactions</span>
                  </div>
                </div>
              </div>

              {selectedAnomaly.aiExplanation && (
                <div style={{ marginBottom: "30px", background: "rgba(59, 130, 246, 0.05)", borderRadius: "8px", padding: "16px", border: "1px solid rgba(59, 130, 246, 0.2)" }}>
                  <h3 style={{ margin: "0 0 12px", color: "var(--info)", fontSize: "14px", textTransform: "uppercase" }}>🤖 AI Analysis</h3>
                  <p style={{ margin: "0 0 12px", color: "var(--text-main)", lineHeight: "1.5" }}>{selectedAnomaly.aiExplanation.reason}</p>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <span style={{ padding: "4px 10px", backgroundColor: "var(--bg-secondary)", border: `1px solid ${getSeverityColor(selectedAnomaly.aiExplanation.severity)}`, color: getSeverityColor(selectedAnomaly.aiExplanation.severity), borderRadius: "6px", fontSize: "12px", fontWeight: "600" }}>
                      Severity: {selectedAnomaly.aiExplanation.severity.toUpperCase()}
                    </span>
                  </div>
                </div>
              )}

              {selectedAnomaly.status === "pending" && (
                <div style={{ borderTop: "1px solid var(--border-main)", paddingTop: "20px" }}>
                  <h4 style={{ margin: "0 0 16px", color: "var(--text-main)" }}>Review Required</h4>
                  <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                    <button onClick={() => handleReview(selectedAnomaly._id, "legitimate")} style={{ padding: "12px", backgroundColor: "rgba(16, 185, 129, 0.1)", color: "var(--primary)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "8px", cursor: "pointer", fontWeight: "600", transition: "all 0.2s" }} onMouseOver={e=>e.currentTarget.style.background="rgba(16, 185, 129, 0.2)"} onMouseOut={e=>e.currentTarget.style.background="rgba(16, 185, 129, 0.1)"}>✅ Legitimate</button>
                    <button onClick={() => handleReview(selectedAnomaly._id, "fraud")} style={{ padding: "12px", backgroundColor: "rgba(239, 68, 68, 0.1)", color: "var(--danger)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "8px", cursor: "pointer", fontWeight: "600", transition: "all 0.2s" }} onMouseOver={e=>e.currentTarget.style.background="rgba(239, 68, 68, 0.2)"} onMouseOut={e=>e.currentTarget.style.background="rgba(239, 68, 68, 0.1)"}>⚠️ Fraud</button>
                    <button onClick={() => handleDismiss(selectedAnomaly._id)} style={{ padding: "12px", backgroundColor: "var(--bg-secondary)", color: "var(--text-secondary)", border: "1px solid var(--border-main)", borderRadius: "8px", cursor: "pointer", fontWeight: "600", transition: "all 0.2s" }} onMouseOver={e=>e.currentTarget.style.background="var(--border-main)"} onMouseOut={e=>e.currentTarget.style.background="var(--bg-secondary)"}>✕ Dismiss</button>
                  </div>
                </div>
              )}

              {selectedAnomaly.status !== "pending" && (
                <div style={{ padding: "16px", backgroundColor: "var(--primary-soft)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "8px", color: "var(--primary)" }}>
                  <p style={{ margin: 0, fontWeight: "600" }}> Reviewed as "{selectedAnomaly.userFeedback}"</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}