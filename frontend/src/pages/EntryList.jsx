import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import client from "../api/client";

const STATUS_LABEL = {
  folyamatban: "Folyamatban",
  "elküldve": "Elküldve",
  csv_letöltve: "CSV letöltve",
  lezarva: "Lezárva",
};

const STATUS_COLOR = {
  folyamatban: "#f39c12",
  "elküldve": "#2980b9",
  csv_letöltve: "#27ae60",
  lezarva: "#7f8c8d",
};

export default function EntryList() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const statusFilter = location.pathname.includes("folyamatban")
    ? "folyamatban"
    : location.pathname.includes("lezartak")
    ? "lezarva"
    : null;

  useEffect(() => {
    const params = { record_type: "belep" };
    if (statusFilter) params.status = statusFilter;
    client.get("/entries/", { params }).then((res) => {
      setEntries(res.data);
    }).finally(() => setLoading(false));
  }, [location.pathname]);

  if (loading) return <p>Betöltés...</p>;

  return (
    <div>
      <div style={styles.header}>
        <h2 style={styles.title}>
          {statusFilter === "folyamatban" ? "Folyamatban lévő belépők" :
           statusFilter === "lezarva" ? "Lezárt belépők" : "Összes belépő"}
        </h2>
        <button style={styles.newBtn} onClick={() => navigate("/belepok/uj")}>
          + Új belépő
        </button>
      </div>

      {entries.length === 0 ? (
        <p style={{ color: "#888" }}>Nincs megjeleníthető rekord.</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Azonosító</th>
              <th style={styles.th}>Adóazonosító</th>
              <th style={styles.th}>Név</th>
              <th style={styles.th}>Státusz</th>
              <th style={styles.th}>Létrehozva</th>
              <th style={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} style={styles.row}>
                <td style={styles.td}>#{e.id}</td>
                <td style={styles.td}>{e.form_data?.adoazonosito || "—"}</td>
                <td style={styles.td}>
                  {e.form_data?.vezeteknev && e.form_data?.keresztnev
                    ? `${e.form_data.vezeteknev} ${e.form_data.keresztnev}`
                    : "—"}
                </td>
                <td style={styles.td}>
                  <span style={{ ...styles.badge, background: STATUS_COLOR[e.status] || "#ccc" }}>
                    {STATUS_LABEL[e.status] || e.status}
                  </span>
                </td>
                <td style={styles.td}>{new Date(e.created_at).toLocaleDateString("hu-HU")}</td>
                <td style={styles.td}>
                  <button style={styles.editBtn} onClick={() => navigate(`/belepok/${e.id}`)}>
                    Megnyit
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
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" },
  title: { margin: 0, fontWeight: 500, fontSize: "1.3rem" },
  newBtn: { background: "#2c3e50", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "4px", cursor: "pointer", fontSize: "0.9rem" },
  table: { width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "8px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  th: { padding: "12px 16px", textAlign: "left", background: "#f1f2f6", fontSize: "0.85rem", color: "#555", fontWeight: 500 },
  td: { padding: "12px 16px", borderTop: "1px solid #f0f0f0", fontSize: "0.9rem" },
  row: { cursor: "default" },
  badge: { display: "inline-block", padding: "3px 10px", borderRadius: "12px", color: "#fff", fontSize: "0.8rem" },
  editBtn: { background: "none", border: "1px solid #ccc", padding: "4px 12px", borderRadius: "4px", cursor: "pointer", fontSize: "0.85rem" },
};
