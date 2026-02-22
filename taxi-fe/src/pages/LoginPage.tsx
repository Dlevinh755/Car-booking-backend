import React, { useState } from "react";
import { login } from "../api/auth";
import { useAuth } from "../auth/AuthContext";
import { decodeToken } from "../lib/jwt";
import { useNavigate, Link } from "react-router-dom";

export function LoginPage() {
  const { login: setToken } = useAuth();
  const nav = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const resp = await login(identifier, password);
      setToken(resp.accessToken);
      const claims = decodeToken(resp.accessToken);
      if (claims.role === "DRIVER") nav("/driver");
      else nav("/user");
    } catch (e: any) {
      setErr(e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px"
    }}>
      <div style={{
        maxWidth: "440px",
        width: "100%",
        backgroundColor: "white",
        borderRadius: "16px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        padding: "40px"
      }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1 style={{
            fontSize: "32px",
            fontWeight: 700,
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            marginBottom: "8px"
          }}>🚖 Taxi Booking</h1>
          <p style={{ color: "#666", fontSize: "15px" }}>Đăng nhập vào tài khoản của bạn</p>
        </div>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: "16px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: 500, color: "#333" }}>
              Email hoặc Số điện thoại
            </label>
            <input
              placeholder="example@gmail.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "10px",
                border: "2px solid #e0e0e0",
                fontSize: "15px",
                transition: "all 0.2s",
                outline: "none"
              }}
              onFocus={(e) => e.target.style.borderColor = "#667eea"}
              onBlur={(e) => e.target.style.borderColor = "#e0e0e0"}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: 500, color: "#333" }}>
              Mật khẩu
            </label>
            <input
              placeholder="••••••••"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "10px",
                border: "2px solid #e0e0e0",
                fontSize: "15px",
                transition: "all 0.2s",
                outline: "none"
              }}
              onFocus={(e) => e.target.style.borderColor = "#667eea"}
              onBlur={(e) => e.target.style.borderColor = "#e0e0e0"}
            />
          </div>

          {err && (
            <div style={{
              padding: "12px 16px",
              borderRadius: "10px",
              backgroundColor: "#fee",
              color: "#c33",
              fontSize: "14px",
              border: "1px solid #fcc"
            }}>
              ⚠️ {err}
            </div>
          )}

          <button
            disabled={loading}
            style={{
              padding: "14px",
              borderRadius: "10px",
              background: loading ? "#ccc" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              border: "none",
              fontWeight: 600,
              fontSize: "16px",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "transform 0.2s, box-shadow 0.2s",
              boxShadow: "0 4px 15px rgba(102, 126, 234, 0.4)"
            }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = "translateY(-2px)")}
            onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
          >
            {loading ? "⏳ Đang đăng nhập..." : "🚀 Đăng nhập"}
          </button>
        </form>

        <div style={{
          marginTop: "24px",
          textAlign: "center",
          color: "#666",
          fontSize: "14px"
        }}>
          Chưa có tài khoản?{" "}
          <Link to="/register" style={{
            color: "#667eea",
            textDecoration: "none",
            fontWeight: 600
          }}>
            Đăng ký ngay
          </Link>
        </div>

        <div style={{
          marginTop: "24px",
          padding: "16px",
          backgroundColor: "#f8f9ff",
          borderRadius: "10px",
          border: "1px solid #e8e9ff"
        }}>
          <div style={{ fontWeight: 600, marginBottom: "8px", color: "#667eea" }}>🔑 Tài khoản test</div>
          <div style={{ fontSize: "13px", color: "#666", lineHeight: "1.6" }}>
            <div>👤 <strong>User:</strong> user@test.com / pass123</div>
            <div>🚗 <strong>Driver:</strong> driver@test.com / pass123</div>
          </div>
        </div>
      </div>
    </div>
  );
}