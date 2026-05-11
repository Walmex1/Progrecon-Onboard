import { useEffect, useRef, useState } from "react";
import client from "../api/client";

const EMPTY_EDIT = {
  last_name: "",
  first_name: "",
  birth_date: "",
  taj: "",
  trunk_number: "",
  cost_center_id: "",
};

export default function AdminEmployees() {
  const [employees, setEmployees] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [q, setQ] = useState("");
  const [costCenterId, setCostCenterId] = useState("");

  const [editingEmployee, setEditingEmployee] = useState(null);
  const [form, setForm] = useState(EMPTY_EDIT);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  async function fetchEmployees() {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (q.trim()) params.q = q.trim();
      if (costCenterId) params.cost_center_id = costCenterId;
      const res = await client.get("/admin/employees/", { params });
      setEmployees(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || "Hiba a betöltés során");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      async function loadInitial() {
        setLoading(true);
        setError(null);
        try {
          const [employeesRes, costCentersRes] = await Promise.all([
            client.get("/admin/employees/"),
            client.get("/admin/cost-centers/", { params: { active_only: true } }),
          ]);
          setEmployees(employeesRes.data);
          setCostCenters(costCentersRes.data);
        } catch (e) {
          setError(e.response?.data?.detail || "Hiba a betöltés során");
          setCostCenters([]);
        } finally {
          setLoading(false);
        }
      }

      loadInitial();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    fetchEmployees();
  }

  function openEdit(employee) {
    setEditingEmployee(employee);
    setForm({
      last_name: employee.last_name ?? "",
      first_name: employee.first_name ?? "",
      birth_date: employee.birth_date ?? "",
      taj: employee.taj ?? "",
      trunk_number: employee.trunk_number ?? "",
      cost_center_id: employee.cost_center_id ?? "",
    });
    setFormError(null);
  }

  function closeModal() {
    setEditingEmployee(null);
    setForm(EMPTY_EDIT);
  }

  async function handleEdit(e) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const payload = {
        last_name: form.last_name,
        first_name: form.first_name,
        birth_date: form.birth_date || null,
        taj: form.taj || null,
        trunk_number: form.trunk_number || null,
        cost_center_id: form.cost_center_id ? Number(form.cost_center_id) : null,
      };
      await client.patch(`/admin/employees/${editingEmployee.id}`, payload);
      closeModal();
      fetchEmployees();
    } catch (e) {
      setFormError(e.response?.data?.detail || "Hiba a mentés során");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Biztosan véglegesen törlöd ezt a munkavállalót?")) return;
    try {
      await client.delete(`/admin/employees/${id}`);
      fetchEmployees();
    } catch (e) {
      setError(e.response?.data?.detail || "Hiba a törlés során");
    }
  }

  async function handleImport() {
    if (!selectedFile) {
      setError("Válassz ki egy XLSX vagy XLS fájlt.");
      return;
    }
    setError(null);
    setImportResult(null);
    setImporting(true);
    try {
      const data = new FormData();
      data.append("file", selectedFile);
      const res = await client.post("/admin/employees/import", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setImportResult(res.data);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchEmployees();
    } catch (e) {
      setError(e.response?.data?.detail || "Hiba az import során");
    } finally {
      setImporting(false);
    }
  }

  const visibleErrors = importResult?.errors?.slice(0, 10) ?? [];
  const remainingErrors = Math.max((importResult?.errors?.length ?? 0) - visibleErrors.length, 0);

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <h1 style={styles.title}>Munkavállalók</h1>
      </div>

      <form onSubmit={handleSearch} style={{ ...styles.header, alignItems: "flex-end", gap: "0.75rem" }}>
        <div style={{ ...styles.formGroup, marginBottom: 0, flex: 1 }}>
          <label style={styles.label}>Keresés</label>
          <input
            style={styles.input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Név, adóazonosító, TAJ"
          />
        </div>
        <div style={{ ...styles.formGroup, marginBottom: 0, minWidth: "220px" }}>
          <label style={styles.label}>Ktghely</label>
          <select style={styles.input} value={costCenterId} onChange={(e) => setCostCenterId(e.target.value)}>
            <option value="">Összes</option>
            {costCenters.map((cc) => (
              <option key={cc.id} value={cc.id}>
                {cc.code} - {cc.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" style={styles.btnPrimary}>
          Keresés
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          style={{ display: "none" }}
          onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
        />
        <button type="button" style={styles.btnSecondary} onClick={() => fileInputRef.current?.click()}>
          + Import XLSX
        </button>
        <button type="button" style={styles.btnPrimary} onClick={handleImport} disabled={importing}>
          {importing ? "Feltöltés..." : "Feltöltés"}
        </button>
      </form>

      {selectedFile && (
        <div style={{ color: "#555", fontSize: "0.85rem", marginBottom: "1rem" }}>
          Kiválasztott fájl: {selectedFile.name}
        </div>
      )}

      {importResult && (
        <div style={styles.errorBox}>
          <div>
            Létrehozva: {importResult.created} | Frissítve: {importResult.updated} | Kihagyva: {importResult.skipped}
          </div>
          {visibleErrors.length > 0 && (
            <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.25rem" }}>
              {visibleErrors.map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
              {remainingErrors > 0 && <li>... és {remainingErrors} további hiba</li>}
            </ul>
          )}
        </div>
      )}

      {error && <div style={styles.errorBox}>{error}</div>}

      {loading ? (
        <p style={styles.loading}>Betöltés...</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Név</th>
              <th style={styles.th}>Adóazonosító</th>
              <th style={styles.th}>TAJ</th>
              <th style={styles.th}>Törzsszám</th>
              <th style={styles.th}>Költséghely</th>
              <th style={styles.th}>Műveletek</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 && (
              <tr>
                <td colSpan={6} style={{ ...styles.td, color: "#999", textAlign: "center" }}>
                  Nincs rögzített munkavállaló
                </td>
              </tr>
            )}
            {employees.map((employee) => (
              <tr key={employee.id} style={styles.tr}>
                <td style={styles.td}>{`${employee.last_name} ${employee.first_name}`}</td>
                <td style={styles.td}>{employee.tax_id}</td>
                <td style={styles.td}>{employee.taj ?? "—"}</td>
                <td style={styles.td}>{employee.trunk_number ?? "—"}</td>
                <td style={styles.td}>{employee.cost_center_code ?? "—"}</td>
                <td style={styles.td}>
                  <button style={styles.btnEdit} onClick={() => openEdit(employee)}>
                    Szerkesztés
                  </button>
                  <button style={{ ...styles.btnDanger, marginLeft: "0.5rem" }} onClick={() => handleDelete(employee.id)}>
                    Törlés
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editingEmployee && (
        <div style={styles.overlay} onClick={closeModal}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Munkavállaló szerkesztése</h2>
            <form onSubmit={handleEdit}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Vezetéknév</label>
                <input
                  style={styles.input}
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  required
                  autoFocus
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Keresztnév</label>
                <input
                  style={styles.input}
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Születési dátum</label>
                <input
                  type="date"
                  style={styles.input}
                  value={form.birth_date}
                  onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>TAJ</label>
                <input style={styles.input} value={form.taj} onChange={(e) => setForm({ ...form, taj: e.target.value })} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Törzsszám</label>
                <input
                  style={styles.input}
                  value={form.trunk_number}
                  onChange={(e) => setForm({ ...form, trunk_number: e.target.value })}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Költséghely</label>
                <select
                  style={styles.input}
                  value={form.cost_center_id}
                  onChange={(e) => setForm({ ...form, cost_center_id: e.target.value })}
                >
                  <option value="">Nincs</option>
                  {costCenters.map((cc) => (
                    <option key={cc.id} value={cc.id}>
                      {cc.code} - {cc.name}
                    </option>
                  ))}
                </select>
              </div>
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
