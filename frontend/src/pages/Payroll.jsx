import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";

const STATUS_LABEL = {
  "elküldve": "Feldolgozásra vár",
  csv_letöltve: "CSV letöltve",
  lezarva: "Lezárva",
};

export default function Payroll() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);

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
      a.download = `belep_${entryId}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      setEntries((prev) =>
        prev.map((e) => e.id === entryId ? { ...e, status: "csv_letöltve" } : e)
      );
    } catch (err) {
      alert(err.response?.data?.detail?.validation_errors
        ? "Validációs hiba — ellenőrizd az adatokat"
        : "Hiba a CSV generálás során");
    } finally {
      setDownloading(null);
    }
  }

  if (loading) return <p>Betöltés...</p>;

  const waiting = entries.filter((e) => e.status === "elküldve");
  const done = entries.filter((e) => e.status !== "elküldve");

  return (
    <div>
      <button style={styles.backBtn} onClick={() => navigate(-1)}>← Vissza</button>
      <h2 style={styles.title}>Bérszámfejtés</h2>

      <h3 style={styles.sub}>Feldolgozásra váró rekordok ({waiting.length})</h3>
      {waiting.length === 0 ? (
        <p style={styles.empty}>Nincs feldolgozásra váró rekord.</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Azonosító</th>
              <th style={styles.th}>Adóazonosító</th>
              <th style={styles.th}>Név</th>
              <th style={styles.th}>Elküldve</th>
              <th style={styles.th}>CSV letöltés</th>
            </tr>
          </thead>
          <tbody>
            {waiting.map((e) => (
              <tr key={e.id}>
                <td style={styles.td}>#{e.id}</td>
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
      )}

      <h3 style={{ ...styles.sub, marginTop: "2rem" }}>Letöltési előzmények</h3>
      {done.length === 0 ? (
        <p style={styles.empty}>Nincs korábbi letöltés.</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Azonosító</th>
              <th style={styles.th}>Név</th>
              <th style={styles.th}>Státusz</th>
              <th style={styles.th}>CSV letöltés</th>
            </tr>
          </thead>
          <tbody>
            {done.map((e) => (
              <tr key={e.id}>
                <td style={styles.td}>#{e.id}</td>
                <td style={styles.td}>
                  {e.form_data?.vezeteknev && e.form_data?.keresztnev
                    ? `${e.form_data.vezeteknev} ${e.form_data.keresztnev}`
                    : "—"}
                </td>
                <td style={styles.td}>{STATUS_LABEL[e.status] || e.status}</td>
                <td style={styles.td}>
                  <button
                    style={{ ...styles.dlBtn, background: "#7f8c8d" }}
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
      )}
    </div>
  );
}

const styles = {
  backBtn: { background: "none", border: "none", cursor: "pointer", color: "#3498db", fontSize: "0.9rem", padding: "0 0 1rem 0", display: "block" },
  title: { margin: "0 0 1.5rem", fontWeight: 500, fontSize: "1.3rem" },
  sub: { fontWeight: 500, fontSize: "1rem", margin: "0 0 0.75rem", color: "#2c3e50" },
  empty: { color: "#888", fontSize: "0.9rem" },
  table: { width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "8px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", marginBottom: "1rem" },
  th: { padding: "12px 16px", textAlign: "left", background: "#f1f2f6", fontSize: "0.85rem", color: "#555", fontWeight: 500 },
  td: { padding: "12px 16px", borderTop: "1px solid #f0f0f0", fontSize: "0.9rem" },
  dlBtn: { background: "#27ae60", color: "#fff", border: "none", padding: "6px 14px", borderRadius: "4px", cursor: "pointer", fontSize: "0.85rem" },
};
