import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { UserDashboard } from "./pages/user/UserDashboard";
import { DriverDashboard } from "./pages/driver/DriverDashboard";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { useAuth } from "./auth/AuthContext";
import { PaymentReturn } from "./pages/PaymentReturn";

function Home() {
  const { role } = useAuth();
  if (role === "DRIVER") return <Navigate to="/driver" replace />;
  if (role === "USER") return <Navigate to="/user" replace />;
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ padding: 12, borderBottom: "1px solid #eee" }}>
        <Link to="/" style={{ fontWeight: 700, textDecoration: "none" }}>Taxi MVP</Link>
        <span style={{ marginLeft: 12, color: "#666" }}>React + Vite</span>
      </div>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/user"
          element={
            <ProtectedRoute role="USER">
              <UserDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/driver"
          element={
            <ProtectedRoute role="DRIVER">
              <DriverDashboard />
            </ProtectedRoute>
          }
        />

        {/* VNPay return URL — accessible without login */}
        <Route path="/payment/return" element={<PaymentReturn />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}