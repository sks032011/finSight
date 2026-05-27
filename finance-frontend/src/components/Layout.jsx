import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../utils/api";
import { LayoutDashboard, PlusCircle, Receipt, PieChart, Target, AlertTriangle, LogOut, Bell, Search } from "lucide-react";

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const fetchUserAndAlerts = async () => {
      try {
        const userRes = await api.get("/auth/me");
        setUser(userRes.data.user);
        
        const alertsRes = await api.get("/budgets/alerts/month");
        setAlerts(alertsRes.data.alerts);
      } catch (err) {
        console.error("Failed to fetch user or alerts in layout");
      }
    };
    fetchUserAndAlerts();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    navigate("/login");
  };

  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={20} /> },
    { name: "Add Expense", path: "/add-expense", icon: <PlusCircle size={20} /> },
    { name: "Transactions", path: "/expenses", icon: <Receipt size={20} /> },
    { name: "Budgets", path: "/budgets", icon: <Target size={20} /> },
    { name: "AI Insights", path: "/insights", icon: <PieChart size={20} /> },
    { name: "Anomalies", path: "/anomalies", icon: <AlertTriangle size={20} /> },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--bg-main)" }}>
      
      {/* Sidebar - Uses mobile responsive classes */}
      <div className="app-sidebar" style={{ width: "280px", background: "var(--card-bg)", borderRight: "1px solid var(--border-main)", padding: "30px 20px", display: "flex", flexDirection: "column", zIndex: 10 }}>
        <div className="app-sidebar-logo" style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "40px", paddingLeft: "10px" }}>
          <div style={{ background: "var(--primary-soft)", padding: "10px", borderRadius: "12px", color: "var(--primary)" }}>
            <PieChart size={24} strokeWidth={2.5} />
          </div>
          <h2 style={{ margin: 0, fontSize: "24px", fontWeight: "800", color: "var(--text-main)", letterSpacing: "-0.5px" }}>FinSight</h2>
        </div>

        <div className="nav-menu" style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1, width: "100%" }}>
  {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.name}
                onClick={() => navigate(item.path)}
                style={{
                  display: "flex", alignItems: "center", gap: "15px",
                  padding: "14px 18px",
                  background: isActive ? "var(--primary-soft)" : "transparent",
                  color: isActive ? "var(--primary)" : "var(--text-secondary)",
                  border: "none",
                  borderRadius: "14px",
                  cursor: "pointer",
                  fontSize: "15px",
                  fontWeight: isActive ? "600" : "500",
                  transition: "all 0.2s ease"
                }}
              >
                {/* cloning icon to enforce exact color match */}
                {React.cloneElement(item.icon, { color: isActive ? "var(--primary)" : "var(--text-secondary)" })}
                <span className="sidebar-text">{item.name}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={handleLogout}
          style={{
            display: "flex", alignItems: "center", gap: "15px", padding: "14px 18px",
            backgroundColor: "rgba(239, 68, 68, 0.1)", color: "var(--danger)",
            border: "none", borderRadius: "14px", cursor: "pointer", fontSize: "15px", fontWeight: "600", transition: "all 0.2s ease"
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.2)"}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.1)"}
        >
          <LogOut size={20} />
          <span className="sidebar-text">Sign Out</span>
        </button>
      </div>

      {/* main content */}
      <div className="app-main-content" style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", height: "100vh" }}>
        
        {/* top Header */}
        <div className="app-header" style={{ height: "80px", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 40px", background: "var(--card-bg)", borderBottom: "1px solid var(--border-main)", position: "sticky", top: 0, zIndex: 5 }}>
          
          {/* search Bar hidden on mobile
          <div className="search-bar" style={{ display: "flex", alignItems: "center", background: "var(--bg-secondary)", padding: "10px 20px", borderRadius: "12px", width: "300px", border: "1px solid var(--border-main)" }}>
            <Search size={18} color="var(--text-muted)" style={{ marginRight: "10px" }} />
            <input type="text" placeholder="Search transactions..." style={{ background: "transparent", border: "none", outline: "none", width: "100%", color: "var(--text-main)", fontSize: "14px" }} />
          </div> */}

          {/* User Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "25px", marginLeft: "auto" }}>
            <div style={{ position: "relative", cursor: "pointer" }} title={alerts.length > 0 ? `${alerts.length} budget alerts` : "No new alerts"}>
              <Bell size={22} color="var(--text-secondary)" />
              {alerts.length > 0 && (
                <div style={{ position: "absolute", top: -2, right: -2, width: "10px", height: "10px", backgroundColor: "var(--danger)", borderRadius: "50%", border: "2px solid var(--card-bg)" }}></div>
              )}
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "var(--bg-secondary)", padding: "6px 16px 6px 6px", borderRadius: "30px", cursor: "pointer", border: "1px solid var(--border-main)" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "var(--primary-gradient)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold" }}>
                {user?.name?.charAt(0) || "U"}
              </div>
              <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-main)" }}>{user?.name || "Loading..."}</span>
            </div>
          </div>
        </div>

        {/* Dynamic Page Content */}
        <div style={{ padding: "40px 20px", maxWidth: "1400px", margin: "0 auto", width: "100%" }}>
          {children}
        </div>
      </div>
    </div>
  );
}