import { useEffect, useState } from "react";
import client from "../api/client";

const ROLE_LABELS = { pv: "PV", berszamfejto: "Bérszámfejtő", admin: "Admin" };

const EMPTY_CREATE = { username: "", password: "", role: "pv", cost_center_ids: [] };
const EMPTY_EDIT = { role: "pv", cost_center_ids: [] };

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [modalMode, setModalMode] = useState(null); // "create" | "edit"
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(EMPTY_CREATE);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [costCenters, setCostCenters] = useState([]);

  async function fetchUsers() {
    setLoading(true);
    setError(null);
    try {
      const res = await client.get("/admin/users/");
      setUsers(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || "Hiba a betöltés során");
    } finally {
      setLoading(false);
    }
  }

  async function fetchCostCenters() {
    try {
      const res = await client.get("/admin/cost-centers/", { params: { active_only: true } });
      setCostCenters(res.data);
    } catch {
      setCostCenters([]);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchUsers();
      fetchCostCenters();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function openCreate() {
    setForm(EMPTY_CREATE);
    setFormError(null);
    setModalMode("create");
  }

  function openEdit(user) {
    setEditingUser(user);
    setForm({
      ...EMPTY_EDIT,
      role: user.role,
      cost_center_ids: user.cost_centers.map((cc) => cc.id),
    });
    setFormError(null);
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode(null);
    setEditingUser(null);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const payload = {
        username: form.username,
        password: form.password,
        role: form.role,
        cost_center_ids: form.role === "pv" ? form.cost_center_ids : [],
      };
      await client.post("/admin/users/", payload);
      closeModal();
      fetchUsers();
    } catch (e) {
      setFormError(e.response?.data?.detail || "Hiba a mentés során");
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(e) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const payload = {
        role: form.role,
        cost_center_ids: form.role === "pv" ? form.cost_center_ids : [],
      };
      await client.patch(`/admin/users/${editingUser.id}`, payload);
      closeModal();
      fetchUsers();
    } catch (e) {
      setFormError(e.response?.data?.detail || "Hiba a mentés során");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(id) {
    try {
      await client.post(`/admin/users/${id}/deactivate`);
      fetchUsers();
    } catch (e) {
      setError(e.response?.data?.detail || "Hiba a deaktiválás során");
    }
  }

  async function handleActivate(id) {
    try {
      await client.post(`/admin/users/${id}/activate`);
      fetchUsers();
    } catch (e) {
      setError(e.response?.data?.detail || "Hiba az aktiválás során");
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Biztosan véglegesen törlöd ezt a felhasználót?")) return;
    try {
      await client.delete(`/admin/users/${id}`);
      fetchUsers();
    } catch (e) {
      setError(e.response?.data?.detail || "Hiba a törlés során");
    }
  }

  const showCostCenter = form.role === "pv";

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <h1 style={styles.title}>Felhasználók</h1>
        <button style={styles.btnPrimary} onClick={openCreate}>
          + Új felhasználó
        </button>
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      {loading ? (
        <p style={styles.loading}>Betöltés...</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Felhasználónév</th>
              <th style={styles.th}>Szerepkör</th>
              <th style={styles.th}>Költséghely</th>
              <th style={styles.th}>Státusz</th>
              <th style={styles.th}>Műveletek</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={5} style={{ ...styles.td, color: "#999", textAlign: "center" }}>
                  Nincs rögzített felhasználó
                </td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u.id} style={styles.tr}>
                <td style={styles.td}>{u.username}</td>
                <td style={styles.td}>{ROLE_LABELS[u.role] ?? u.role}</td>
                <td style={styles.td}>
                  {u.role === "pv" && u.cost_centers.length > 0
                    ? u.cost_centers.map((cc) => `${cc.code}`).join(", ")
                    : "—"}
                </td>
                <td style={styles.td}>
                  <span style={u.is_active ? styles.badgeActive : styles.badgeInactive}>
                    {u.is_active ? "Aktív" : "Inaktív"}
                  </span>
                </td>
                <td style={styles.td}>
                  {u.is_active ? (
                    <>
                      <button style={styles.btnEdit} onClick={() => openEdit(u)}>
                        Szerkesztés
                      </button>
                      <button
                        style={{ ...styles.btnWarning, marginLeft: "0.5rem" }}
                        onClick={() => handleDeactivate(u.id)}
                      >
                        Deaktiválás
                      </button>
                    </>
                  ) : (
                    <>
                      <button style={styles.btnSuccess} onClick={() => handleActivate(u.id)}>
                        Aktiválás
                      </button>
                      <button
                        style={{ ...styles.btnDanger, marginLeft: "0.5rem" }}
                        onClick={() => handleDelete(u.id)}
                      >
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

      {modalMode && (
        <div style={styles.overlay} onClick={closeModal}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>
              {modalMode === "create" ? "Új felhasználó" : "Felhasználó szerkesztése"}
            </h2>
            <form onSubmit={modalMode === "create" ? handleCreate : handleEdit}>
              {modalMode === "create" && (
                <>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Felhasználónév</label>
                    <input
                      style={styles.input}
                      value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                      required
                      autoFocus
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Jelszó</label>
                    <input
                      type="password"
                      style={styles.input}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      required
                    />
                  </div>
                </>
              )}
              <div style={styles.formGroup}>
                <label style={styles.label}>Szerepkör</label>
                <select
                  style={styles.input}
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value, cost_center_ids: [] })}
                  required
                >
                  <option value="pv">PV</option>
                  <option value="berszamfejto">Bérszámfejtő</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {showCostCenter && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Költséghelyek</label>
                  <div style={{
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    maxHeight: "180px",
                    overflowY: "auto",
                    padding: "4px 0",
                  }}>
                    {costCenters.length === 0 && (
                      <div style={{ padding: "8px 12px", fontSize: "0.85rem", color: "#999" }}>
                        Nincs elérhető költséghely
                      </div>
                    )}
                    {costCenters.map((cc) => (
                      <label key={cc.id} style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "6px 12px",
                        cursor: "pointer",
                        fontSize: "0.9rem",
                        color: "#333",
                      }}>
                        <input
                          type="checkbox"
                          checked={form.cost_center_ids.includes(cc.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setForm({ ...form, cost_center_ids: [...form.cost_center_ids, cc.id] });
                            } else {
                              setForm({ ...form, cost_center_ids: form.cost_center_ids.filter((id) => id !== cc.id) });
                            }
                          }}
                        />
                        {cc.code} – {cc.name}
                      </label>
                    ))}
                  </div>
                  {form.role === "pv" && form.cost_center_ids.length === 0 && (
                    <div style={{ fontSize: "0.8rem", color: "#e65100", marginTop: "4px" }}>
                      Legalább egy költséghely kötelező PV szerepkörhöz
                    </div>
                  )}
                </div>
              )}
              {formError && <div style={styles.errorBox}>{formError}</div>}
              <div style={styles.modalFooter}>
                <button type="button" style={styles.btnSecondary} onClick={closeModal}>
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
  btnEdit: {
    background: "#e3f2fd",
    color: "#1565c0",
    border: "1px solid #90caf9",
    padding: "4px 12px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "0.85rem",
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
    minWidth: "360px",
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
