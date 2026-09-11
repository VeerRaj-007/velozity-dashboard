import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Login } from "./pages/Login";
import { AdminDashboard } from "./pages/AdminDashboard";
import { PMDashboard } from "./pages/PMDashboard";
import { DeveloperDashboard } from "./pages/DeveloperDashboard";
import { NotificationBell } from "./components/NotificationBell";
import { useSocket } from "./hooks/useSocket";

function Shell() {
  const { user, loading, logout } = useAuth();
  const socketRef = useSocket();

  if (loading) return <p style={{ padding: 24 }}>Loading...</p>;
  if (!user) return <Login />;

  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: 1100, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <strong>{user.name}</strong> <span style={{ color: "#888" }}>({user.role})</span>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <NotificationBell socket={socketRef.current} />
          <button onClick={logout}>Log out</button>
        </div>
      </div>

      {user.role === "ADMIN" && <AdminDashboard />}
      {user.role === "PM" && <PMDashboard />}
      {user.role === "DEVELOPER" && <DeveloperDashboard />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<Shell />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
