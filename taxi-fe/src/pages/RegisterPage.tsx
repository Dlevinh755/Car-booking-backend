import { useState } from "react";
import { register, updateProfile } from "../api/auth";
import { useAuth } from "../auth/AuthContext";
import { decodeToken } from "../lib/jwt";
import { useNavigate, Link } from "react-router-dom";

export function RegisterPage() {
  const { login: setToken } = useAuth();
  const nav = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"USER" | "DRIVER">("USER");
  const [customId, setCustomId] = useState("");
  // Profile fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicleType, setVehicleType] = useState<"CAR_4" | "CAR_7">("CAR_4");
  const [licensePlate, setLicensePlate] = useState("");
  const [driverLicense, setDriverLicense] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    // Validation
    if (!identifier || !password) {
      setErr("Vui lòng điền đầy đủ thông tin");
      return;
    }
    if (password !== confirmPassword) {
      setErr("Mật khẩu xác nhận không khớp");
      return;
    }
    if (password.length < 6) {
      setErr("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }
    if (!fullName.trim()) {
      setErr("Vui lòng nhập họ và tên");
      return;
    }
    if (!phone.trim()) {
      setErr("Vui lòng nhập số điện thoại");
      return;
    }
    if (role === "DRIVER") {
      if (!licensePlate.trim()) {
        setErr("Vui lòng nhập biển số xe");
        return;
      }
      if (!driverLicense.trim()) {
        setErr("Vui lòng nhập số giấy phép lái xe");
        return;
      }
    }

    setLoading(true);
    try {
      // Generate ID if not provided
      const userId = role === "USER" ? (customId || `u${Date.now()}`) : undefined;
      const driverId = role === "DRIVER" ? (customId || `d${Date.now()}`) : undefined;

      const resp = await register({
        identifier,
        password,
        role,
        userId,
        driverId,
      });

      setToken(resp.accessToken);
      // Save profile info (best-effort; ignore errors)
      try {
        if (role === "USER") {
          await updateProfile({ fullName: fullName.trim(), phone: phone.trim() });
        } else {
          await updateProfile({
            fullName: fullName.trim(),
            phone: phone.trim(),
            vehicleType,
            licensePlate: licensePlate.trim() || undefined,
            driverLicense: driverLicense.trim() || undefined,
          });
        }
      } catch {}
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
        maxWidth: "520px",
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
          }}>✨ Tạo tài khoản mới</h1>
          <p style={{ color: "#666", fontSize: "15px" }}>Đăng ký để bắt đầu sử dụng dịch vụ</p>
        </div>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 16 }}>
        {/* Role Selection */}
        <div>
          <label style={{ display: "block", marginBottom: 10, fontWeight: 600, color: "#333" }}>
            Loại tài khoản
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "14px",
              border: role === "USER" ? "2px solid #667eea" : "2px solid #e0e0e0",
              borderRadius: "10px",
              cursor: "pointer",
              backgroundColor: role === "USER" ? "#f8f9ff" : "white",
              transition: "all 0.2s"
            }}>
              <input
                type="radio"
                name="role"
                value="USER"
                checked={role === "USER"}
                onChange={() => setRole("USER")}
                style={{ accentColor: "#667eea" }}
              />
              <span style={{ fontWeight: 500 }}>🙋 Người dùng</span>
            </label>
            <label style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "14px",
              border: role === "DRIVER" ? "2px solid #667eea" : "2px solid #e0e0e0",
              borderRadius: "10px",
              cursor: "pointer",
              backgroundColor: role === "DRIVER" ? "#f8f9ff" : "white",
              transition: "all 0.2s"
            }}>
              <input
                type="radio"
                name="role"
                value="DRIVER"
                checked={role === "DRIVER"}
                onChange={() => setRole("DRIVER")}
                style={{ accentColor: "#667eea" }}
              />
              <span style={{ fontWeight: 500 }}>🚗 Tài xế</span>
            </label>
          </div>
        </div>

        {/* Email/Phone */}
        <div>
          <label style={{ display: "block", marginBottom: 8, fontWeight: 500, color: "#333" }}>
            📧 Email hoặc Số điện thoại
          </label>
          <input
            type="text"
            placeholder="example@gmail.com hoặc 0901234567"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            style={{ 
              width: "100%", 
              padding: "12px 16px", 
              borderRadius: 10, 
              border: "2px solid #e0e0e0",
              fontSize: 15,
              outline: "none",
              transition: "all 0.2s"
            }}
            onFocus={(e) => e.target.style.borderColor = "#667eea"}
            onBlur={(e) => e.target.style.borderColor = "#e0e0e0"}
          />
        </div>

        {/* Password */}
        <div>
          <label style={{ display: "block", marginBottom: 8, fontWeight: 500, color: "#333" }}>
            🔒 Mật khẩu
          </label>
          <input
            type="password"
            placeholder="Tối thiểu 6 ký tự"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ 
              width: "100%", 
              padding: "12px 16px", 
              borderRadius: 10, 
              border: "2px solid #e0e0e0",
              fontSize: 15,
              outline: "none",
              transition: "all 0.2s"
            }}
            onFocus={(e) => e.target.style.borderColor = "#667eea"}
            onBlur={(e) => e.target.style.borderColor = "#e0e0e0"}
          />
        </div>

        {/* Confirm Password */}
        <div>
          <label style={{ display: "block", marginBottom: 8, fontWeight: 500, color: "#333" }}>
            ✅ Xác nhận mật khẩu
          </label>
          <input
            type="password"
            placeholder="Nhập lại mật khẩu"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={{ 
              width: "100%", 
              padding: "12px 16px", 
              borderRadius: 10, 
              border: "2px solid #e0e0e0",
              fontSize: 15,
              outline: "none",
              transition: "all 0.2s"
            }}
            onFocus={(e) => e.target.style.borderColor = "#667eea"}
            onBlur={(e) => e.target.style.borderColor = "#e0e0e0"}
          />
        </div>

        {/* Profile fields: name + phone for all */}
        <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 16, marginTop: 4 }}>
          <div style={{ fontWeight: 600, color: "#555", fontSize: 13, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>Thông tin cá nhân</div>
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <label style={{ display: "block", marginBottom: 6, fontWeight: 500, color: "#333", fontSize: 14 }}>👤 Họ và tên <span style={{ color: "#e53935" }}>*</span></label>
              <input type="text" placeholder="Nguyễn Văn A" value={fullName} onChange={e => setFullName(e.target.value)} required
                style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `2px solid ${fullName.trim() ? "#e0e0e0" : "#f9a8a8"}`, fontSize: 14, outline: "none" }}
                onFocus={e => e.target.style.borderColor = "#667eea"} onBlur={e => e.target.style.borderColor = fullName.trim() ? "#e0e0e0" : "#f9a8a8"} />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 6, fontWeight: 500, color: "#333", fontSize: 14 }}>📞 Số điện thoại <span style={{ color: "#e53935" }}>*</span></label>
              <input type="tel" placeholder="09xxxxxxxx" value={phone} onChange={e => setPhone(e.target.value)} required
                style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `2px solid ${phone.trim() ? "#e0e0e0" : "#f9a8a8"}`, fontSize: 14, outline: "none" }}
                onFocus={e => e.target.style.borderColor = "#667eea"} onBlur={e => e.target.style.borderColor = phone.trim() ? "#e0e0e0" : "#f9a8a8"} />
            </div>
          </div>
        </div>

        {/* Driver-only fields */}
        {role === "DRIVER" && (
          <div style={{ background: "#f8f4ff", borderRadius: 10, padding: 16 }}>
            <div style={{ fontWeight: 600, color: "#764ba2", fontSize: 13, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>Thông tin xe & giấy phép</div>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 500, color: "#333", fontSize: 14 }}>🚗 Loại xe</label>
                <select value={vehicleType} onChange={e => setVehicleType(e.target.value as "CAR_4" | "CAR_7")}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "2px solid #e0e0e0", fontSize: 14, background: "white", outline: "none" }}
                  onFocus={e => e.target.style.borderColor = "#764ba2"} onBlur={e => e.target.style.borderColor = "#e0e0e0"}>
                  <option value="CAR_4">🚗 Xe 4 chố</option>
                  <option value="CAR_7">🚐 Xe 7 chố</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 500, color: "#333", fontSize: 14 }}>🔢 Biển số xe</label>
                <input type="text" placeholder="51A-123.45" value={licensePlate} onChange={e => setLicensePlate(e.target.value)}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "2px solid #e0e0e0", fontSize: 14, outline: "none" }}
                  onFocus={e => e.target.style.borderColor = "#764ba2"} onBlur={e => e.target.style.borderColor = "#e0e0e0"} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 500, color: "#333", fontSize: 14 }}>📋 Số giấy phép lái xe</label>
                <input type="text" placeholder="012345678901" value={driverLicense} onChange={e => setDriverLicense(e.target.value)}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "2px solid #e0e0e0", fontSize: 14, outline: "none" }}
                  onFocus={e => e.target.style.borderColor = "#764ba2"} onBlur={e => e.target.style.borderColor = "#e0e0e0"} />
              </div>
            </div>
          </div>
        )}

        {err && (
          <div style={{ 
            padding: "12px 16px",
            borderRadius: 10,
            backgroundColor: "#fee",
            color: "#c33",
            fontSize: 14,
            border: "1px solid #fcc"
          }}>
            ⚠️ {err}
          </div>
        )}

        {/* Submit Button */}
        <button 
          type="submit"
          disabled={loading} 
          style={{ 
            padding: 14, 
            borderRadius: 10, 
            background: loading ? "#ccc" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            border: "none",
            fontWeight: 600,
            fontSize: 16,
            cursor: loading ? "not-allowed" : "pointer",
            transition: "transform 0.2s, box-shadow 0.2s",
            boxShadow: "0 4px 15px rgba(102, 126, 234, 0.4)"
          }}
          onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = "translateY(-2px)")}
          onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
        >
          {loading ? "⏳ Đang đăng ký..." : "🎉 Đăng ký ngay"}
        </button>
      </form>

      {/* Login Link */}
      <div style={{ marginTop: 24, textAlign: "center", color: "#666", fontSize: 14 }}>
        Đã có tài khoản?{" "}
        <Link to="/login" style={{ color: "#667eea", textDecoration: "none", fontWeight: 600 }}>
          Đăng nhập
        </Link>
      </div>
      </div>
    </div>
  );
}
