import { useEffect, useState } from "react";
import client from "../api/client";

export default function AdminCostCenters() {
  const [costCenters, setCostCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ code: "", name: "" });
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function fetchCostCenters() {
    setLoading(true);
    setError(null);
    try {
      const res = await client.get("/admin/cost-centers/");
      setCostCenters(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || "Hiba a betöltés során");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCostCenters();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      await client.post("/admin/cost-centers/", form);
      setModalOpen(false);
      setForm({ code: "", name: "" });
      fetchCostCenters();
    } catch (e) {
      setFormError(e.response?.data?.detail || "Hiba a mentés során");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(id) {
    try {
      await client.post(`/admin/cost-centers/${id}/deactivate`);
      fetchCostCenters();
    } catch (e) {
      setError(e.response?.data?.detail || "Hiba a deaktiválás során");
    }
  }

  async function handleActivate(id) {
    try {
      await client.post(`/admin/cost-centers/${id}/activate`);
      fetchCostCenters();
    } catch (e) {
      setError(e.response?.data?.detail || "Hiba az aktiválás során");
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Biztosan véglegesen törlöd ezt a költséghelyet?")) return;
    try {
      await client.delete(`/admin/cost-centers/${id}`);
      fetchCostCenters();
    } catch (e) {
      setError(e.response?.data?.detail || "Hiba a törlés során");
    }
  }

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <h1 style={styles.title}>Költséghelyek</h1>
        <button style={styles.btnPrimary} onClick={() => { setModalOpen(true); setFormError(null); setForm({ code: "", name: "" }); }}>
          + Új költséghely
        </button>
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      {loading ? (
        <p style={styles.loading}>Betöltés...</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Kód</th>
              <th style={styles.th}>Név</th>
              <th style={styles.th}>Státusz</th>
              <th style={styles.th}>Műveletek</th>
            </tr>
          </thead>
          <tbody>
            {costCenters.length === 0 && (
              <tr>
                <td colSpan={4} style={{ ...styles.td, color: "#999", textAlign: "center" }}>
                  Nincs rögzített költséghely
                </td>
              </tr>
            )}
            {costCenters.map((cc) => (
              <tr key={cc.id} style={styles.tr}>
                <td style={styles.td}>{cc.code}</td>
                <td style={styles.td}>{cc.name}</td>
                <td style={styles.td}>
                  <span style={cc.is_active ? styles.badgeActive : styles.badgeInactive}>
                    {cc.is_active ? "Aktív" : "Inaktív"}
                  </span>
                </td>
                <td style={styles.td}>
                  {cc.is_active ? (
                    <button style={styles.btnWarning} onClick={() => handleDeactivate(cc.id)}>
                      Deaktiválás
                    </button>
                  ) : (
                    <>
                      <button style={styles.btnSuccess} onClick={() => handleActivate(cc.id)}>
                        Aktiválás
                      </button>
                      <button style={{ ...styles.btnDanger, marginLeft: "0.5rem" }} onClick={() => handleDelete(cc.id)}>
                        Végleges törlés
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modalOpen && (
        <div style={styles.overlay} onClick={() => setModalOpen(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Új költséghely</h2>
            <form onSubmit={handleCreate}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Kód</label>
                <input
                  style={styles.input}
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  required
                  autoFocus
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Név</label>
                <input
                  style={styles.input}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              {formError && <div style={styles.errorBox}>{formError}</div>}
              <div style={styles.modalFooter}>
                <button type="button" style={styles.btnSecondary} onClick={() => setModalOpen(false)}>
                  Mégse
                </button>
                <button type="submit" style={styles.btnPrimary} disabled={saving}>
                  {saving ? "Mentés..." : "Mentés"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  card: {
    background: "#fff",
    borderRadius: "8px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
    padding: "2rem",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.5rem",
  },
  title: {
    margin: 0,
    fontWeight: 500,
    fontSize: "1.5rem",
    color: "#2c3e50",
  },
  loading: {
    color: "#888",
    fontSize: "0.95rem",
  },
  errorBox: {
    background: "#fdecea",
    border: "1px solid #f5c6cb",
    color: "#b71c1c",
    borderRadius: "4px",
    padding: "0.6rem 1rem",
    marginBottom: "1rem",
    fontSize: "0.9rem",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    padding: "0.6rem 0.8rem",
    borderBottom: "2px solid #e0e0e0",
    fontSize: "0.85rem",
    color: "#555",
    fontWeight: 600,
  },
  tr: {
    borderBottom: "1px solid #f0f0f0",
  },
  td: {
    padding: "0.6rem 0.8rem",
    fontSize: "0.9rem",
    color: "#333",
  },
  badgeActive: {
    background: "#e8f5e9",
    color: "#2e7d32",
    padding: "2px 10px",
    borderRadius: "12px",
    fontSize: "0.8rem",
    fontWeight: 500,
  },
  badgeInactive: {
    background: "#f5f5f5",
    color: "#757575",
    padding: "2px 10px",
    borderRadius: "12px",
    fontSize: "0.8rem",
    fontWeight: 500,
  },
  btnPrimary: {
    background: "#3498db",
    color: "#fff",
    border: "none",
    padding: "7px 16px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "0.9rem",
    fontWeight: 500,
  },
  btnSecondary: {
    background: "none",
    color: "#555",
    border: "1px solid #ccc",
    padding: "7px 16px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "0.9rem",
  },
  btnWarning: {
    background: "#fff3e0",
    color: "#e65100",
    border: "1px solid #ffcc80",
    padding: "4px 12px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "0.85rem",
  },
  btnSuccess: {
    background: "#e8f5e9",
    color: "#2e7d32",
    border: "1px solid #a5d6a7",
    padding: "4px 12px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "0.85rem",
  },
  btnDanger: {
    background: "#fdecea",
    color: "#b71c1c",
    border: "1px solid #ef9a9a",
    padding: "4px 12px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "0.85rem",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  modal: {
    background: "#fff",
    borderRadius: "8px",
    padding: "2rem",
    minWidth: "340px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
  },
  modalTitle: {
    margin: "0 0 1.5rem",
    fontWeight: 500,
    fontSize: "1.2rem",
    color: "#2c3e50",
  },
  formGroup: {
    marginBottom: "1rem",
  },
  label: {
    display: "block",
    marginBottom: "0.3rem",
    fontSize: "0.85rem",
    color: "#555",
    fontWeight: 500,
  },
  input: {
    width: "100%",
    padding: "7px 10px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    fontSize: "0.9rem",
    boxSizing: "border-box",
  },
  modalFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "0.5rem",
    marginTop: "1.5rem",
  },
};
