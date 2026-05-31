import { useEffect, useState } from "react";
import client from "../api/client";

function validateEmail(v) {
  if (!v) return null;
  if (v.length > 254) return "Az e-mail cím maximum 254 karakter lehet";
  if (!/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(v)) {
    return "Érvénytelen e-mail cím (pl. nev@domain.hu)";
  }
  return null;
}

const ROLE_LABELS = { pv: "PV", berszamfejto: "Bérszámfejtő", admin: "Admin" };

const EMPTY_CREATE = { username: "", role: "pv", region: "", person_last_name: "", person_first_name: "", person_email: "" };
const EMPTY_EDIT = { username: "", role: "pv", region: "", person_last_name: "", person_first_name: "", person_email: "" };

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [modalMode, setModalMode] = useState(null); // "create" | "edit"
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(EMPTY_CREATE);
  const [formError, setFormError] = useState(null);
  const [emailError, setEmailError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [search, setSearch] = useState("");

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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchUsers();
    }, 0);
    client.get("/admin/cost-centers/").then(res => setCostCenters(res.data));
    return () => window.clearTimeout(timer);
  }, []);

  function openCreate() {
    setForm(EMPTY_CREATE);
    setFormError(null);
    setEmailError(null);
    setModalMode("create");
  }

  function openEdit(user) {
    setEditingUser(user);
    setForm({
      username: user.username,
      role: user.role,
      region: user.region ?? "",
      person_last_name: user.person?.last_name ?? "",
      person_first_name: user.person?.first_name ?? "",
      person_email: user.person?.email ?? "",
    });
    setFormError(null);
    setEmailError(null);
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode(null);
    setEditingUser(null);
    setEmailError(null);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    const emailErr = validateEmail(form.person_email.trim());
    if (emailErr) { setEmailError(emailErr); setSaving(false); return; }
    setEmailError(null);
    try {
      const personFilled = form.person_last_name.trim() || form.person_first_name.trim() || form.person_email.trim();
      const payload = {
        username: form.username,
        role: form.role,
        region: form.role === "pv" ? form.region || null : null,
        person: personFilled
          ? { last_name: form.person_last_name.trim(), first_name: form.person_first_name.trim(), email: form.person_email.trim() }
          : null,
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
    const emailErr = validateEmail(form.person_email.trim());
    if (emailErr) { setEmailError(emailErr); setSaving(false); return; }
    setEmailError(null);
    try {
      const payload = {
        username: form.username,
        role: form.role,
        region: form.role === "pv" ? form.region || null : null,
        person: (form.person_last_name.trim() || form.person_first_name.trim() || form.person_email.trim())
          ? { last_name: form.person_last_name.trim(), first_name: form.person_first_name.trim(), email: form.person_email.trim() }
          : null,
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
    } catch {
      // interceptor kezeli
    }
  }

  async function handleActivate(id) {
    try {
      await client.post(`/admin/users/${id}/activate`);
      fetchUsers();
    } catch {
      // interceptor kezeli
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Biztosan véglegesen törlöd ezt a felhasználót? A személy adatai (név, email) megmaradnak.")) return;
    try {
      await client.delete(`/admin/users/${id}`);
      fetchUsers();
    } catch {
      // interceptor kezeli
    }
  }

  function handleSort(field) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  const sortedUsers = [...users].sort((a, b) => {
    if (!sortField) return 0;
    let aVal = "";
    let bVal = "";
    if (sortField === "username") {
      aVal = a.username ?? "";
      bVal = b.username ?? "";
    } else if (sortField === "last_name") {
      aVal = a.person?.last_name ?? "";
      bVal = b.person?.last_name ?? "";
    } else if (sortField === "first_name") {
      aVal = a.person?.first_name ?? "";
      bVal = b.person?.first_name ?? "";
    } else if (sortField === "role") {
      aVal = ROLE_LABELS[a.role] ?? a.role ?? "";
      bVal = ROLE_LABELS[b.role] ?? b.role ?? "";
    } else if (sortField === "region") {
      aVal = a.region ?? "";
      bVal = b.region ?? "";
    }
    aVal = aVal.toString().toLowerCase();
    bVal = bVal.toString().toLowerCase();
    if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const filteredUsers = sortedUsers.filter((u) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    const lastName = (u.person?.last_name ?? "").toLowerCase();
    const firstName = (u.person?.first_name ?? "").toLowerCase();
    const full = `${lastName} ${firstName}`;
    const fullReverse = `${firstName} ${lastName}`;
    return lastName.includes(q) || firstName.includes(q) || full.includes(q) || fullReverse.includes(q);
  });

  const showRegion = form.role === "pv";

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <h1 style={styles.title}>Felhasználók</h1>
        <input
          style={{ ...styles.input, maxWidth: "260px" }}
          placeholder="Keresés vezetéknév, keresztnév..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
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
              {[
                { field: "username", label: "Felhasználónév" },
                { field: "last_name", label: "Vezetéknév" },
                { field: "first_name", label: "Keresztnév" },
                { field: "role", label: "Szerepkör" },
                { field: "region", label: "Régió" },
              ].map(({ field, label }) => (
                <th
                  key={field}
                  style={{ ...styles.th, cursor: "pointer", userSelect: "none" }}
                  onClick={() => handleSort(field)}
                >
                  {label}
                  {sortField === field ? (sortDir === "asc" ? " ▲" : " ▼") : " ↕"}
                </th>
              ))}
              <th style={styles.th}>Státusz</th>
              <th style={styles.th}>Műveletek</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={7} style={{ ...styles.td, color: "#999", textAlign: "center" }}>
                  {search.trim() ? "Nincs találat" : "Nincs rögzített felhasználó"}
                </td>
              </tr>
            )}
            {filteredUsers.map((u) => (
              <tr key={u.id} style={styles.tr}>
                <td style={styles.td}>{u.username}</td>
                <td style={styles.td}>{u.person?.last_name ?? "—"}</td>
                <td style={styles.td}>{u.person?.first_name ?? "—"}</td>
                <td style={styles.td}>{ROLE_LABELS[u.role] ?? u.role}</td>
                <td style={styles.td}>{u.role === "pv" ? (u.region ?? "—") : "—"}</td>
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
                      {u.role !== "admin" && (
                        <button
                          style={{ ...styles.btnDanger, marginLeft: "0.5rem" }}
                          onClick={() => handleDelete(u.id)}
                        >
                          Végleges törlés
                        </button>
                      )}
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
                    <label style={styles.label}>Vezetéknév <span style={{ color: "#999", fontWeight: 400 }}>(opcionális)</span></label>
                    <input
                      style={styles.input}
                      value={form.person_last_name}
                      onChange={(e) => setForm({ ...form, person_last_name: e.target.value })}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Keresztnév <span style={{ color: "#999", fontWeight: 400 }}>(opcionális)</span></label>
                    <input
                      style={styles.input}
                      value={form.person_first_name}
                      onChange={(e) => setForm({ ...form, person_first_name: e.target.value })}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Email <span style={{ color: "#999", fontWeight: 400 }}>(opcionális)</span></label>
                    <input
                      type="text"
                      style={styles.input}
                      value={form.person_email}
                      onChange={(e) => setForm({ ...form, person_email: e.target.value })}
                      onBlur={() => setEmailError(validateEmail(form.person_email.trim()))}
                    />
                    {emailError && (
                      <div style={{ fontSize: "0.8rem", color: "#e65100", marginTop: "4px" }}>{emailError}</div>
                    )}
                  </div>
                </>
              )}
              {modalMode === "edit" && (
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
                    <label style={styles.label}>Vezetéknév</label>
                    <input
                      style={styles.input}
                      value={form.person_last_name}
                      onChange={(e) => setForm({ ...form, person_last_name: e.target.value })}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Keresztnév</label>
                    <input
                      style={styles.input}
                      value={form.person_first_name}
                      onChange={(e) => setForm({ ...form, person_first_name: e.target.value })}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Email</label>
                    <input
                      type="text"
                      style={styles.input}
                      value={form.person_email}
                      onChange={(e) => setForm({ ...form, person_email: e.target.value })}
                      onBlur={() => setEmailError(validateEmail(form.person_email.trim()))}
                    />
                    {emailError && (
                      <div style={{ fontSize: "0.8rem", color: "#e65100", marginTop: "4px" }}>{emailError}</div>
                    )}
                  </div>
                </>
              )}
              <div style={styles.formGroup}>
                <label style={styles.label}>Szerepkör</label>
                <select
                  style={styles.input}
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value, region: "" })}
                  required
                >
                  <option value="pv">PV</option>
                  <option value="berszamfejto">Bérszámfejtő</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {showRegion && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Régió</label>
                  <select
                    style={styles.input}
                    value={form.region}
                    onChange={(e) => setForm({ ...form, region: e.target.value })}
                    required
                  >
                    <option value="">— válassz régiót —</option>
                    {[...new Set(costCenters.map(cc => cc.region).filter(Boolean))].sort().map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  {form.role === "pv" && !form.region && (
                    <div style={{ fontSize: "0.8rem", color: "#e65100", marginTop: "4px" }}>
                      PV szerepkörhöz régió kötelező
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
    maxHeight: "90vh",
    overflowY: "auto",
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
