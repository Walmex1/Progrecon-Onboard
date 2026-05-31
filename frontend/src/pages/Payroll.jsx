import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import client from "../api/client";

const STATUS_LABEL = {
  elküldve: "Feldolgozásra vár",
  csv_letöltve: "CSV letöltve",
  lezarva: "Lezárva",
};

const STATUS_BADGE = {
  elküldve: { background: "#E3F2FD", color: "#1565C0" },
  csv_letöltve: { background: "#E8F5E9", color: "#2E7D32" },
  lezarva: { background: "#F5F5F5", color: "#616161" },
};

function getDownloadFilename(contentDisposition, entryId) {
  const fallback = `belep_${entryId}.csv`;
  if (!contentDisposition) return fallback;

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1].replace(/"/g, ""));

  const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  return filenameMatch?.[1] || fallback;
}

export default function Payroll() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);
  const [selected, setSelected] = useState(new Set());

  useEffect(() => {
    client.get("/entries/", { params: { record_type: "belep" } }).then((res) => {
      setEntries(res.data);
    }).finally(() => setLoading(false));
  }, []);

  async function downloadCsv(entryId) {
    setDownloading(entryId);
    try {
      const res = await client.post(`/exports/${entryId}`, {}, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = getDownloadFilename(res.headers["content-disposition"], entryId);
      a.click();
      URL.revokeObjectURL(url);
      setEntries((prev) =>
        prev.map((e) => e.id === entryId ? { ...e, status: "csv_letöltve" } : e)
      );
      toast.success("CSV sikeresen letöltve");
    } catch {
      toast.error("CSV letöltés sikertelen. Próbáld újra.");
    } finally {
      setDownloading(null);
    }
  }

  async function downloadSelected() {
    for (const id of selected) {
      await downloadCsv(id);
    }
    setSelected(new Set());
  }

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll(ids) {
    if (ids.every((id) => selected.has(id))) {
      setSelected((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      });
    }
  }

  if (loading) return (
    <div style={styles.pageWrapper}>
      <p style={{ color: "#9ca3af", fontSize: "13px" }}>Betöltés...</p>
    </div>
  );

  const waiting = entries.filter((e) => e.status === "elküldve");
  const done = entries.filter((e) => e.status === "csv_letöltve" || e.status === "lezarva");
  const waitingIds = waiting.map((e) => e.id);
  const allSelected = waitingIds.length > 0 && waitingIds.every((id) => selected.has(id));

  return (
    <div style={styles.pageWrapper}>
      <div style={styles.pageHeader}>
        <button style={styles.backLink} onClick={() => navigate(-1)}>← Vissza</button>
        <h2 style={styles.title}>Bérszámfejtés</h2>
      </div>

      {/* Feldolgozásra váró */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <span style={styles.cardTitle}>Feldolgozásra váró rekordok</span>
          <span style={styles.cardCount}>{waiting.length}</span>
          {selected.size > 0 && (
            <button style={styles.bulkBtn} onClick={downloadSelected} disabled={downloading !== null}>
              Összes kijelölt ({selected.size}) → CSV
            </button>
          )}
        </div>

        {waiting.length === 0 ? (
          <p style={styles.empty}>Nincs feldolgozásra váró rekord.</p>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => toggleSelectAll(waitingIds)}
                      style={{ cursor: "pointer" }}
                    />
                  </th>
                  <th style={styles.th}>Adóazonosító</th>
                  <th style={styles.th}>Név</th>
                  <th style={styles.th}>Elküldve</th>
                  <th style={styles.th}>CSV letöltés</th>
                </tr>
              </thead>
              <tbody>
                {waiting.map((e) => (
                  <tr
                    key={e.id}
                    style={{ ...styles.row, ...(selected.has(e.id) ? { background: "rgba(83,74,183,0.04)" } : {}) }}
                    onMouseEnter={(ev) => { if (!selected.has(e.id)) ev.currentTarget.style.background = "#fafafa"; }}
                    onMouseLeave={(ev) => { if (!selected.has(e.id)) ev.currentTarget.style.background = ""; }}
                  >
                    <td style={styles.td}>
                      <input
                        type="checkbox"
                        checked={selected.has(e.id)}
                        onChange={() => toggleSelect(e.id)}
                        style={{ cursor: "pointer" }}
                      />
                    </td>
                    <td style={styles.td}>{e.form_data?.adoazonosito || "—"}</td>
                    <td style={styles.td}>
                      {e.form_data?.vezeteknev && e.form_data?.keresztnev
                        ? `${e.form_data.vezeteknev} ${e.form_data.keresztnev}`
                        : "—"}
                    </td>
                    <td style={styles.td}>
                      {e.submitted_at ? new Date(e.submitted_at).toLocaleDateString("hu-HU") : "—"}
                    </td>
                    <td style={styles.td}>
                      <button
                        style={styles.dlBtn}
                        onClick={() => downloadCsv(e.id)}
                        disabled={downloading === e.id}
                      >
                        {downloading === e.id ? "Generálás..." : "⬇ CSV letöltése"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Letöltési előzmények */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <span style={styles.cardTitle}>Letöltési előzmények</span>
          <span style={styles.cardCount}>{done.length}</span>
        </div>

        {done.length === 0 ? (
          <p style={styles.empty}>Nincs korábbi letöltés.</p>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Adóazonosító</th>
                  <th style={styles.th}>Név</th>
                  <th style={styles.th}>Státusz</th>
                  <th style={styles.th}>CSV letöltés</th>
                </tr>
              </thead>
              <tbody>
                {done.map((e) => (
                  <tr
                    key={e.id}
                    style={styles.row}
                    onMouseEnter={(ev) => ev.currentTarget.style.background = "#fafafa"}
                    onMouseLeave={(ev) => ev.currentTarget.style.background = ""}
                  >
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
                      <button
                        style={{ ...styles.dlBtn, background: "#6b7280" }}
                        onClick={() => downloadCsv(e.id)}
                        disabled={downloading === e.id}
                      >
                        {downloading === e.id ? "Generálás..." : "⬇ Újra letöltés"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  pageWrapper: {
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  pageHeader: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  backLink: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#6b7280",
    fontSize: "12px",
    padding: 0,
    textAlign: "left",
  },
  title: {
    margin: 0,
    fontWeight: 500,
    fontSize: "15px",
    color: "#1a1a2e",
  },
  card: {
    background: "#fff",
    border: "0.5px solid #e2e4e9",
    borderRadius: "12px",
    padding: "20px 24px",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "14px",
  },
  cardTitle: {
    fontSize: "13px",
    fontWeight: 500,
    color: "#1a1a2e",
  },
  cardCount: {
    fontSize: "11px",
    background: "#f5f6fa",
    border: "0.5px solid #e2e4e9",
    borderRadius: "10px",
    padding: "1px 7px",
    color: "#6b7280",
  },
  bulkBtn: {
    marginLeft: "auto",
    background: "#534AB7",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "5px 12px",
    fontSize: "12px",
    cursor: "pointer",
    fontWeight: 400,
  },
  empty: {
    color: "#9ca3af",
    fontSize: "12.5px",
    margin: 0,
  },
  tableWrapper: {
    border: "0.5px solid #e2e4e9",
    borderRadius: "8px",
    overflow: "hidden",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    padding: "9px 12px",
    textAlign: "left",
    background: "#f5f6fa",
    fontSize: "11px",
    color: "#6b7280",
    fontWeight: 500,
    borderBottom: "0.5px solid #e2e4e9",
    textTransform: "uppercase",
    letterSpacing: "0.4px",
  },
  td: {
    padding: "9px 12px",
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
    padding: "2px 8px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: 500,
  },
  dlBtn: {
    background: "#534AB7",
    color: "#fff",
    border: "none",
    padding: "5px 12px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 400,
  },
};
