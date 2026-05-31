import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import client from "../api/client";

export default function AdminEmployees() {
  const [employees, setEmployees] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [q, setQ] = useState("");
  const [costCenterId, setCostCenterId] = useState("");
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  const [selectedFile, setSelectedFile] = useState(null);
  const [importing, setImporting] = useState(false);
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
        try {
          const costCentersRes = await client.get("/admin/cost-centers/", { params: { active_only: true } });
          setCostCenters(costCentersRes.data);
        } catch (e) {
          setError(e.response?.data?.detail || "Hiba a betöltés során");
          setCostCenters([]);
        }
      }

      loadInitial();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchEmployees();
    }, 300);
    return () => window.clearTimeout(timer);
  }, [q, costCenterId]);

  async function handleImport() {
    if (!selectedFile) {
      setError("Válassz ki egy XLSX vagy XLS fájlt.");
      return;
    }
    setError(null);
    setImporting(true);
    try {
      const data = new FormData();
      data.append("file", selectedFile);
      const res = await client.post("/admin/employees/import", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const r = res.data;
      const msg = `Létrehozva: ${r.created} | Frissítve: ${r.updated} | Kihagyva: ${r.skipped}`;
      if (r.errors?.length > 0) {
        toast.warning(msg + `\n${r.errors.slice(0, 3).join("\n")}${r.errors.length > 3 ? `\n...+${r.errors.length - 3} hiba` : ""}`);
      } else {
        toast.success(msg);
      }
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchEmployees();
    } catch {
      // interceptor kezeli
    } finally {
      setImporting(false);
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

  const sortedEmployees = [...employees].sort((a, b) => {
    if (!sortField) return 0;
    let aVal = "";
    let bVal = "";
    if (sortField === "name") {
      aVal = `${a.last_name} ${a.first_name}`;
      bVal = `${b.last_name} ${b.first_name}`;
    } else if (sortField === "birth_date") {
      aVal = a.birth_date ?? "";
      bVal = b.birth_date ?? "";
    } else if (sortField === "entry_date") {
      aVal = a.entry_date ?? "";
      bVal = b.entry_date ?? "";
    } else if (sortField === "tax_id") {
      aVal = a.tax_id ?? "";
      bVal = b.tax_id ?? "";
    } else if (sortField === "taj") {
      aVal = a.taj ?? "";
      bVal = b.taj ?? "";
    } else if (sortField === "cost_center_code") {
      aVal = a.cost_center_code ?? "";
      bVal = b.cost_center_code ?? "";
    } else if (sortField === "cost_center_name") {
      aVal = a.cost_center_name ?? "";
      bVal = b.cost_center_name ?? "";
    }
    aVal = aVal.toString().toLowerCase();
    bVal = bVal.toString().toLowerCase();
    if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <h1 style={styles.title}>Munkavállalók</h1>
      </div>

      <div style={{ ...styles.header, alignItems: "flex-end", gap: "0.75rem" }}>
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
      </div>

      {selectedFile && (
        <div style={{ color: "#555", fontSize: "0.85rem", marginBottom: "1rem" }}>
          Kiválasztott fájl: {selectedFile.name}
        </div>
      )}

      {error && <div style={styles.errorBox}>{error}</div>}

      {loading ? (
        <p style={styles.loading}>Betöltés...</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              {[
                { field: "name", label: "Név" },
                { field: "birth_date", label: "Születési idő" },
                { field: "entry_date", label: "Jogviszony kezdete" },
                { field: "tax_id", label: "Adóazonosító" },
                { field: "taj", label: "TAJ" },
                { field: "cost_center_code", label: "Ktgh. kód" },
                { field: "cost_center_name", label: "Költséghely" },
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
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 && (
              <tr>
                <td colSpan={7} style={{ ...styles.td, color: "#999", textAlign: "center" }}>
                  Nincs rögzített munkavállaló
                </td>
              </tr>
            )}
            {sortedEmployees.map((employee) => (
              <tr key={employee.id} style={styles.tr}>
                <td style={styles.td}>{`${employee.last_name} ${employee.first_name}`}</td>
                <td style={styles.td}>{employee.birth_date ?? "—"}</td>
                <td style={styles.td}>{employee.entry_date ?? "—"}</td>
                <td style={styles.td}>{employee.tax_id}</td>
                <td style={styles.td}>{employee.taj ?? "—"}</td>
                <td style={styles.td}>{employee.cost_center_code ?? "—"}</td>
                <td style={styles.td}>{employee.cost_center_name ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
