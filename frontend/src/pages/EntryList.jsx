import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import client from "../api/client";

const STATUS_LABEL = {
  folyamatban: "Folyamatban",
  "elküldve": "Elküldve",
  csv_letöltve: "CSV letöltve",
  lezarva: "Lezárva",
};

const STATUS_BADGE = {
  folyamatban: { background: "#FFF3E0", color: "#E65100" },
  "elküldve": { background: "#E3F2FD", color: "#1565C0" },
  csv_letöltve: { background: "#E8F5E9", color: "#2E7D32" },
  lezarva: { background: "#F5F5F5", color: "#616161" },
};

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "Minden státusz" },
  { value: "folyamatban", label: "Folyamatban" },
  { value: "elküldve", label: "Elküldve" },
  { value: "csv_letöltve", label: "CSV letöltve" },
];

export default function EntryList() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const statusFilter = location.pathname.includes("folyamatban")
    ? "folyamatban"
    : location.pathname.includes("lezartak")
    ? "lezarva"
    : null;

  useEffect(() => {
    setSearchTerm("");
    setFilterStatus(
      statusFilter === "folyamatban"
        ? "folyamatban"
        : statusFilter === "lezarva"
        ? "lezarva"
        : ""
    );
    const params = { record_type: "belep" };
    if (statusFilter === "lezarva") params.status = statusFilter;
    client.get("/entries/", { params }).then((res) => {
      const visibleEntries = statusFilter === "folyamatban"
        ? res.data.filter((entry) => entry.status !== "lezarva")
        : res.data;
      setEntries(visibleEntries);
    }).finally(() => setLoading(false));
  }, [location.pathname, statusFilter]);

  const filtered = entries.filter((e) => {
    const name = `${e.form_data?.vezeteknev || ""} ${e.form_data?.keresztnev || ""}`.toLowerCase();
    const adoazon = (e.form_data?.adoazonosito || "").toLowerCase();
    const matchSearch = !searchTerm || name.includes(searchTerm.toLowerCase()) || adoazon.includes(searchTerm.toLowerCase());
    const matchStatus = !filterStatus || e.status === filterStatus;
    return matchSearch && matchStatus;
  });

  async function deleteEntry(entry) {
    try {
      await client.delete(`/entries/${entry.id}`);
      setEntries((prev) => prev.filter((item) => item.id !== entry.id));
      toast.success("Folyamatban lévő rekord törölve.");
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "A rekord törlése nem sikerült.");
    }
  }

  function handleDelete(entry) {
    const name = entry.form_data?.vezeteknev && entry.form_data?.keresztnev
      ? `${entry.form_data.vezeteknev} ${entry.form_data.keresztnev}`
      : `#${entry.id}`;

    toast.warning(({ closeToast }) => (
      <div style={styles.toastConfirm}>
        <span>
          Törlöd ezt a folyamatban lévő rekordot? <strong>{name}</strong>
        </span>
        <span style={styles.toastActions}>
          <button
            type="button"
            style={styles.toastCancelBtn}
            onClick={closeToast}
          >
            Mégse
          </button>
          <button
            type="button"
            style={styles.toastDeleteBtn}
            onClick={() => {
              closeToast();
              deleteEntry(entry);
            }}
          >
            Törlés
          </button>
        </span>
      </div>
    ), {
      autoClose: false,
      closeOnClick: false,
      draggable: false,
    });
  }

  const pageTitle =
    statusFilter === "folyamatban" ? "Folyamatban lévő belépők" :
    statusFilter === "lezarva" ? "Lezárt belépők" : "Összes belépő";

  if (loading) return (
    <div style={styles.pageWrapper}>
      <p style={{ color: "#9ca3af", fontSize: "13px" }}>Betöltés...</p>
    </div>
  );

  return (
    <div style={styles.pageWrapper}>
      <div style={styles.header}>
        <h2 style={styles.title}>{pageTitle}</h2>
      </div>

      <div style={styles.filterBar}>
        <input
          style={styles.searchInput}
          type="text"
          placeholder="Keresés név, adóazonosító…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {statusFilter === "folyamatban" && (
          <div style={styles.statusStepper} aria-label="Státusz szűrő">
            {STATUS_FILTER_OPTIONS.map((option, index) => {
              const isActive = filterStatus === option.value;
              return (
                <button
                  key={option.value || "all"}
                  type="button"
                  aria-current={isActive ? "step" : undefined}
                  aria-label={`${index + 1}. státusz: ${option.label}`}
                  onClick={() => setFilterStatus(option.value)}
                  style={styles.statusStepButton}
                >
                  <div style={{
                    ...styles.statusStepNumber,
                    ...(isActive ? styles.statusStepNumberActive : {}),
                  }}>
                    {index + 1}
                  </div>
                  <div style={{
                    ...styles.statusStepLabel,
                    ...(isActive ? styles.statusStepLabelActive : {}),
                  }}>
                    {option.label}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div style={styles.emptyState}>Nincs megjeleníthető rekord.</div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Belépés dátuma</th>
                <th style={styles.th}>Adóazonosító</th>
                <th style={styles.th}>Név</th>
                <th style={styles.th}>Státusz</th>
                <th style={styles.th}>Műveletek</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr
                  key={e.id}
                  style={styles.row}
                  onMouseEnter={(ev) => ev.currentTarget.style.background = "#fafafa"}
                  onMouseLeave={(ev) => ev.currentTarget.style.background = ""}
                >
                  <td style={styles.td}>{new Date(e.created_at).toLocaleDateString("hu-HU")}</td>
                  <td style={styles.td}>{e.form_data?.adoazonosito || "—"}</td>
                  <td style={styles.td}>
                    {e.form_data?.vezeteknev && e.form_data?.keresztnev
                      ? `${e.form_data.vezeteknev} ${e.form_data.keresztnev}`
                      : "—"}
                  </td>
                  <td style={styles.td}>
                    <span style={{ ...styles.badge, ...(STATUS_BADGE[e.status] || { background: "#F5F5F5", color: "#616161" }) }}>
                      {STATUS_LABEL[e.status] || e.status}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actionsCell}>
                      <button style={styles.openBtn} onClick={() => navigate(`/belepok/${e.id}`)}>
                        {e.status === "folyamatban" ? "Megnyit" : "Megtekintés"}
                      </button>
                      {e.status === "folyamatban" && (
                        <button style={styles.deleteBtn} onClick={() => handleDelete(e)}>
                          Törlés
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  pageWrapper: {
    padding: "24px",
    maxWidth: "900px",
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
    fontSize: "1.3rem",
    color: "#1a1a2e",
  },
  filterBar: {
    background: "#fff",
    border: "0.5px solid #e2e4e9",
    borderRadius: "12px",
    padding: "20px 24px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginBottom: "12px",
  },
  searchInput: {
    width: "100%",
    maxWidth: "none",
    padding: "7px 10px",
    border: "0.5px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "13px",
    color: "#1a1a2e",
    background: "#fff",
    outline: "none",
    boxSizing: "border-box",
  },
  statusStepper: {
    display: "flex",
    borderTop: "0.5px solid #e2e4e9",
    paddingTop: "14px",
  },
  statusStepButton: {
    flex: 1,
    padding: "0 8px",
    textAlign: "center",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    font: "inherit",
  },
  statusStepNumber: {
    width: "26px",
    height: "26px",
    borderRadius: "50%",
    margin: "0 auto 6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: 500,
    background: "#fff",
    color: "#9ca3af",
    border: "0.5px solid #d1d5db",
  },
  statusStepNumberActive: {
    background: "#534AB7",
    color: "#fff",
    border: "0.5px solid #534AB7",
  },
  statusStepLabel: {
    fontSize: "11px",
    color: "#6b7280",
    fontWeight: 400,
  },
  statusStepLabelActive: {
    color: "#1a1a2e",
    fontWeight: 500,
  },
  emptyState: {
    background: "#fff",
    border: "0.5px solid #e2e4e9",
    borderRadius: "12px",
    padding: "20px 24px",
    fontSize: "12.5px",
    color: "#9ca3af",
  },
  tableWrapper: {
    background: "#fff",
    border: "0.5px solid #e2e4e9",
    borderRadius: "12px",
    overflow: "hidden",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    padding: "14px 24px",
    textAlign: "left",
    background: "#fff",
    fontSize: "11px",
    color: "#6b7280",
    fontWeight: 500,
    borderBottom: "0.5px solid #e2e4e9",
    textTransform: "uppercase",
    letterSpacing: "0.4px",
  },
  td: {
    padding: "12px 24px",
    borderTop: "0.5px solid #f0f0f0",
    fontSize: "12.5px",
    color: "#1a1a2e",
  },
  row: {
    cursor: "default",
    transition: "background 0.1s",
  },
  badge: {
    display: "inline-block",
    padding: "2px 9px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: 500,
  },
  actionsCell: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  openBtn: {
    background: "#fff",
    border: "0.5px solid #d1d5db",
    color: "#534AB7",
    padding: "5px 12px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 500,
  },
  deleteBtn: {
    background: "#fff",
    border: "0.5px solid #f1b8b8",
    color: "#c0392b",
    padding: "5px 12px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 500,
  },
  toastConfirm: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    fontSize: "13px",
    lineHeight: 1.35,
    color: "#1a1a2e",
  },
  toastActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "8px",
  },
  toastCancelBtn: {
    background: "#fff",
    border: "0.5px solid #d1d5db",
    color: "#6b7280",
    padding: "4px 10px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 500,
  },
  toastDeleteBtn: {
    background: "#d93025",
    border: "0.5px solid #d93025",
    color: "#fff",
    padding: "4px 10px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 500,
  },
};
