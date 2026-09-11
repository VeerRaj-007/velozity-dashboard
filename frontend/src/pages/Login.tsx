import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@velozity.test");
  const [password, setPassword] = useState("Password123!");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      navigate("/");
    } catch {
      setError("Invalid email or password");
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: "80px auto", fontFamily: "sans-serif" }}>
      <h2>Velozity Dashboard</h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" />
        {error && <p style={{ color: "crimson" }}>{error}</p>}
        <button type="submit">Log in</button>
      </form>
      <p style={{ fontSize: 12, color: "#888", marginTop: 16 }}>
        Seed accounts: admin@velozity.test, pm1@velozity.test, dev1@velozity.test — all use Password123!
      </p>
    </div>
  );
}
