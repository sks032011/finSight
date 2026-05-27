import React, { useState } from "react";
import api from "../utils/api";
import { useNavigate, Link } from "react-router-dom";
import { PieChart, ArrowRight } from "lucide-react";

export default function Signup() {
  const [formData, setFormData] = useState({ email: "", name: "", password: "", passwordConfirm: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const response = await api.post("/auth/signup", formData);
      localStorage.setItem("accessToken", response.data.tokens.accessToken);
      localStorage.setItem("refreshToken", response.data.tokens.refreshToken);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container" style={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--bg-main)" }}>
      {/* Left Side - Branding */}
      <div className="auth-banner" style={{ flex: 1, background: "linear-gradient(135deg, var(--bg-main) 0%, var(--bg-secondary) 100%)", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px", color: "white", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "relative", zIndex: 2, maxWidth: "480px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "40px" }}>
            <div style={{ background: "rgba(255,255,255,0.05)", padding: "12px", borderRadius: "12px", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <PieChart size={32} color="var(--primary)" />
            </div>
            <h1 style={{ fontSize: "32px", fontWeight: "800", margin: 0, letterSpacing: "-1px" }}>FinSight</h1>
          </div>
          <h2 style={{ fontSize: "48px", fontWeight: "800", lineHeight: "1.1", marginBottom: "24px", letterSpacing: "-1px" }}>Take control of your finances.</h2>
          <p style={{ fontSize: "18px", opacity: 0.9, lineHeight: "1.5", color: "var(--text-secondary)" }}>Join FinSight to use enterprise grade AI to manage your personal wealth and detect hidden anomalies.</p>
        </div>
      </div>

      {/* Right Side - Signup Form */}
      <div className="auth-form-wrapper" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px" }}>
        <div className="animate-entry" style={{ width: "100%", maxWidth: "420px" }}>
          
          {/* MOBILE ONLY LOGO */}
          <div className="mobile-logo">
            <div style={{ background: "var(--primary-soft)", padding: "8px", borderRadius: "10px", color: "var(--primary)" }}>
              <PieChart size={24} strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: "24px", fontWeight: "800", color: "var(--text-main)", letterSpacing: "-0.5px" }}>FinSight</span>
          </div>

          <h2 style={{ fontSize: "28px", fontWeight: "800", marginBottom: "8px", color: "var(--text-main)" }}>Create your account</h2>
          <p style={{ color: "var(--text-muted)", marginBottom: "32px", fontSize: "15px" }}>Get started with FinSight for free.</p>

          {error && (
            <div style={{ background: "rgba(239, 68, 68, 0.1)", color: "var(--danger)", padding: "12px 16px", borderRadius: "8px", marginBottom: "20px", fontSize: "14px", fontWeight: "500", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "20px" }}>
              <label className="input-label">Full Name</label>
              <input type="text" name="name" className="input-field" value={formData.name} onChange={handleChange} placeholder="John Doe" required />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label className="input-label">Email address</label>
              <input type="email" name="email" className="input-field" value={formData.email} onChange={handleChange} placeholder="name@company.com" required />
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "32px" }}>
              <div>
                <label className="input-label">Password</label>
                <input type="password" name="password" className="input-field" value={formData.password} onChange={handleChange} placeholder="••••••••" required />
              </div>
              <div>
                <label className="input-label">Confirm</label>
                <input type="password" name="passwordConfirm" className="input-field" value={formData.passwordConfirm} onChange={handleChange} placeholder="••••••••" required />
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              {loading ? "Creating account..." : "Create Account"}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <p style={{ marginTop: "32px", textAlign: "center", color: "var(--text-muted)", fontSize: "14px" }}>
            Already have an account? <Link to="/login" style={{ color: "var(--primary)", fontWeight: "600", textDecoration: "none" }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}