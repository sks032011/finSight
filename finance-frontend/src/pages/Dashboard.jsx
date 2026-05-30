import React, { useState, useEffect } from "react";
import api from "../utils/api";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Wallet, Activity, Layers } from "lucide-react";

// Pro Dark Mode Chart Colors
const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#14B8A6', '#F43F5E', '#818CF8'];

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const userRes = await api.get("/auth/me");
      setUser(userRes.data.user);

      const summaryRes = await api.get("/expenses/summary/monthly");
      setSummary(summaryRes.data);
    } catch (error) {
      console.error("Failed to fetch dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div style={{ width: "100%" }}>
      <div className="skeleton skeleton-title"></div>
      <div className="skeleton skeleton-subtitle"></div>
      <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "25px", marginBottom: "40px" }}>
        <div className="skeleton skeleton-card"></div>
        <div className="skeleton skeleton-card"></div>
        <div className="skeleton skeleton-card"></div>
      </div>
      <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "25px" }}>
        <div className="skeleton skeleton-chart"></div>
        <div className="skeleton skeleton-chart"></div>
      </div>
    </div>
  );

  return (
    <div style={{ width: "100%" }}>
      <div className="animate-entry" style={{ marginBottom: "40px", animationDelay: "0.1s" }}>
        <h1 style={{ margin: "0 0 8px", fontSize: "34px", fontWeight: "800", letterSpacing: "-0.5px", color: "var(--text-main)" }}>
          Welcome!! {user?.name?.split(' ')[0]} 
        </h1>
        <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "16px", fontWeight: "500" }}>
          Here is the overview for {summary?.month}
        </p>
      </div>

      {summary && (
        <>
          {/* Top Stat Cards */}
          <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "25px", marginBottom: "40px" }}>
            
            <div className="glass-card animate-entry" style={{ display: "flex", alignItems: "center", gap: "20px", animationDelay: "0.2s" }}>
              <div style={{ background: "rgba(59, 130, 246, 0.1)", padding: "20px", borderRadius: "16px", color: "var(--info)" }}>
                <Wallet size={36} strokeWidth={2.5} />
              </div>
              <div>
                <p style={{ margin: "0 0 5px", color: "var(--text-secondary)", fontSize: "13px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "1px" }}>Total Spent</p>
                <h2 style={{ margin: 0, fontSize: "32px", fontWeight: "800", color: "var(--text-main)" }}>₹{summary.totalSpent.toLocaleString()}</h2>
              </div>
            </div>

            <div className="glass-card animate-entry" style={{ display: "flex", alignItems: "center", gap: "20px", animationDelay: "0.3s" }}>
              <div style={{ background: "var(--primary-soft)", padding: "20px", borderRadius: "16px", color: "var(--primary)" }}>
                <Activity size={36} strokeWidth={2.5} />
              </div>
              <div>
                <p style={{ margin: "0 0 5px", color: "var(--text-secondary)", fontSize: "13px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "1px" }}>Transactions</p>
                <h2 style={{ margin: 0, fontSize: "32px", fontWeight: "800", color: "var(--text-main)" }}>{summary.transactionCount}</h2>
              </div>
            </div>

            <div className="glass-card animate-entry" style={{ display: "flex", alignItems: "center", gap: "20px", animationDelay: "0.4s" }}>
              <div style={{ background: "rgba(245, 158, 11, 0.1)", padding: "20px", borderRadius: "16px", color: "var(--warning)" }}>
                <Layers size={36} strokeWidth={2.5} />
              </div>
              <div>
                <p style={{ margin: "0 0 5px", color: "var(--text-secondary)", fontSize: "13px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "1px" }}>Active Categories</p>
                <h2 style={{ margin: 0, fontSize: "32px", fontWeight: "800", color: "var(--text-main)" }}>{summary.byCategory.length}</h2>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "25px" }}>
            
            <div className="glass-card animate-entry" style={{ animationDelay: "0.5s", display: "flex", flexDirection: "column" }}>
              <h3 style={{ margin: "0 0 25px", fontSize: "18px", fontWeight: "700", color: "var(--text-main)" }}>Spending Distribution</h3>
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={summary.byCategory}
                      cx="50%" cy="50%"
                      innerRadius={90} outerRadius={125}
                      paddingAngle={5}
                      dataKey="amount" nameKey="category"
                      animationDuration={1500} animationEasing="ease-out" stroke="none"
                    >
                      {summary.byCategory.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => `₹${value.toLocaleString()}`}
                      contentStyle={{ borderRadius: "12px", border: "1px solid var(--border-main)", background: "var(--card-bg)", color: "var(--text-main)", boxShadow: "var(--shadow-card)", fontWeight: "600" }}
                      itemStyle={{ color: "var(--text-main)" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card animate-entry" style={{ animationDelay: "0.6s", display: "flex", flexDirection: "column" }}>
              <h3 style={{ margin: "0 0 25px", fontSize: "18px", fontWeight: "700", color: "var(--text-main)" }}>Category Breakdown</h3>
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer>
                  <BarChart data={summary.byCategory} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={1}/>
                        <stop offset="95%" stopColor="#34D399" stopOpacity={0.2}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--border-main)" />
                    <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontWeight: 500, fontSize: 13 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontWeight: 500, fontSize: 13 }} tickFormatter={(value) => `₹${value}`} dx={-10} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(255, 255, 255, 0.02)' }}
                      contentStyle={{ borderRadius: "12px", border: "1px solid var(--border-main)", background: "var(--card-bg)", color: "var(--text-main)", boxShadow: "var(--shadow-card)", fontWeight: "600" }}
                      itemStyle={{ color: "var(--primary)" }}
                    />
                    <Bar dataKey="amount" fill="url(#colorAmount)" radius={[8, 8, 8, 8]} animationDuration={1500} animationEasing="ease-out" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}