import { useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";
import { useAuth } from "../store/auth.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await client.post("/auth/login", { username: form.username });
      login(res.data.access_token, res.data.role, res.data.region ?? null, res.data.person ?? null);
      navigate("/");
    } catch {
      setError("Hibás felhasználónév");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Progrecon Onboard</h1>
        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label style={styles.label}>Felhasználónév</label>
            <input
              style={styles.input}
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
              autoFocus
            />
          </div>
          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? "Bejelentkezés..." : "Bejelentkezés"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f5" },
  card: { background: "#fff", padding: "2rem", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", width: "360px" },
  title: { margin: "0 0 1.5rem", fontSize: "1.4rem", fontWeight: 500, textAlign: "center" },
  field: { marginBottom: "1rem" },
  label: { display: "block", marginBottom: "4px", fontSize: "0.9rem", color: "#555" },
  input: { width: "100%", padding: "8px 10px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "1rem", boxSizing: "border-box" },
  error: { color: "#c0392b", fontSize: "0.9rem", marginBottom: "1rem" },
  button: { width: "100%", padding: "10px", background: "#2c3e50", color: "#fff", border: "none", borderRadius: "4px", fontSize: "1rem", cursor: "pointer" },
};
