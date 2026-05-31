import { useEffect, useState } from "react";
import client from "../api/client";

export default function AdminCostCenters() {
  const [costCenters, setCostCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", region: "" });
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingCc, setEditingCc] = useState(null);
  const [editRegion, setEditRegion] = useState("");
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [search, setSearch] = useState("");

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

  function handleSort(field) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  const sortedCostCenters = [...costCenters].sort((a, b) => {
    if (!sortField) return 0;
    const aVal = (a[sortField] ?? "").toString().toLowerCase();
    const bVal = (b[sortField] ?? "").toString().toLowerCase();
    if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const filteredCostCenters = sortedCostCenters.filter((cc) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      cc.code.toLowerCase().includes(q) ||
      cc.name.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    fetchCostCenters();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      await client.post("/admin/cost-centers/", {
        code: form.code,
        name: form.name,
        region: form.region || null,
      });
      setModalOpen(false);
      setForm({ code: "", name: "", region: "" });
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
    } catch {
      // interceptor kezeli
    }
  }

  async function handleActivate(id) {
    try {
      await client.post(`/admin/cost-centers/${id}/activate`);
      fetchCostCenters();
    } catch {
      // interceptor kezeli
    }
  }

  async function handleEditRegion(cc) {
    setEditingCc(cc);
    setEditRegion(cc.region || "");
  }

  async function handleSaveRegion() {
    try {
      await client.patch(`/admin/cost-centers/${editingCc.id}`, { region: editRegion || null });
      setEditingCc(null);
      fetchCostCenters();
    } catch {
      // interceptor kezeli
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Biztosan véglegesen törlöd ezt a költséghelyet?")) return;
    try {
      await client.delete(`/admin/cost-centers/${id}`);
      fetchCostCenters();
    } catch {
      // interceptor kezeli
    }
  }

  const REGION_OPTIONS = [...new Set(costCenters.map(cc => cc.region).filter(Boolean))].sort();

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <h1 style={styles.title}>Költséghelyek</h1>
        <input
          style={{ ...styles.input, maxWidth: "260px" }}
          placeholder="Keresés kódra, névre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button style={styles.btnPrimary} onClick={() => { setModalOpen(true); setFormError(null); setForm({ code: "", name: "", region: "" }); }}>
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
              {["code", "name", "region"].map((field, i) => (
                <th
                  key={field}
                  style={{ ...styles.th, cursor: "pointer", userSelect: "none" }}
                  onClick={() => handleSort(field)}
                >
                  {["Kód", "Név", "Régió"][i]}
                  {sortField === field ? (sortDir === "asc" ? " ▲" : " ▼") : " ↕"}
                </th>
              ))}
              <th style={styles.th}>Státusz</th>
              <th style={styles.th}>Műveletek</th>
            </tr>
          </thead>
          <tbody>
            {filteredCostCenters.length === 0 && (
              <tr>
                <td colSpan={5} style={{ ...styles.td, color: "#999", textAlign: "center" }}>
                  {search.trim() ? "Nincs találat" : "Nincs rögzített költséghely"}
                </td>
              </tr>
            )}
            {filteredCostCenters.map((cc) => (
              <tr key={cc.id} style={styles.tr}>
                <td style={styles.td}>{cc.code}</td>
                <td style={styles.td}>{cc.name}</td>
                <td style={styles.td}>{cc.region || "—"}</td>
                <td style={styles.td}>
                  <span style={cc.is_active ? styles.badgeActive : styles.badgeInactive}>
                    {cc.is_active ? "Aktív" : "Inaktív"}
                  </span>
                </td>
                <td style={styles.td}>
                  {cc.is_active ? (
                    <>
                      <button style={styles.btnInfo} onClick={() => handleEditRegion(cc)}>
                        Régió szerkesztése
                      </button>
                      <button style={{ ...styles.btnWarning, marginLeft: "0.5rem" }} onClick={() => handleDeactivate(cc.id)}>
                        Deaktiválás
                      </button>
                    </>
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
              <div style={styles.formGroup}>
                <label style={styles.label}>Régió</label>
                <select
                  style={styles.input}
                  value={form.region}
                  onChange={(e) => setForm({ ...form, region: e.target.value })}
                >
                  <option value="">— válassz régiót —</option>
                  {REGION_OPTIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
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

      {editingCc && (
        <div style={styles.overlay} onClick={() => setEditingCc(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Régió szerkesztése — {editingCc.name}</h2>
            <div style={styles.formGroup}>
              <label style={styles.label}>Régió</label>
              {(() => {
                const existingRegions = [...new Set(costCenters.map(cc => cc.region).filter(Boolean))].sort();
                return (
                  <select
                    style={styles.input}
                    value={editRegion}
                    onChange={(e) => setEditRegion(e.target.value)}
                    autoFocus
                  >
                    <option value="">— törléshez hagyj üresen —</option>
                    {existingRegions.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                );
              })()}
            </div>
            <div style={styles.modalFooter}>
              <button type="button" style={styles.btnSecondary} onClick={() => setEditingCc(null)}>
                Mégse
              </button>
              <button type="button" style={styles.btnPrimary} onClick={handleSaveRegion}>
                Mentés
              </button>
            </div>
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
  btnInfo: {
    background: "#e3f2fd",
    color: "#1565c0",
    border: "1px solid #90caf9",
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
