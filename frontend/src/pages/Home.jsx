import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";
import { useAuth } from "../store/auth.jsx";

const ADMIN_LINKS = [
  {
    icon: "U",
    title: "Felhasználók kezelése",
    description: "Szerepkörök, hozzáférések és költséghely-hozzárendelések.",
    to: "/admin/felhasznalok",
  },
  {
    icon: "K",
    title: "Költséghelyek kezelése",
    description: "Aktív és inaktív költséghelyek karbantartása.",
    to: "/admin/koltseghelyek",
  },
  {
    icon: "M",
    title: "Munkavállalói adatbázis",
    description: "Munkavállalói törzsadatok áttekintése.",
    to: "/admin/munkavallalok",
  },
  {
    icon: "L",
    title: "Napló / Log",
    description: "Rendszerműveletek és változások követése.",
    to: "/admin/naplo",
  },
];

function formatDelta(value) {
  if (value > 0) return `+${value}`;
  return String(value);
}

function deltaColor(value) {
  if (value > 0) return "#2E7D32";
  if (value < 0) return "#C62828";
  return "#9e9e9e";
}

function StatCard({ label, value, hint }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statLabel}>{label}</div>
      <div style={styles.statValue}>{value}</div>
      {hint && <div style={styles.statHint}>{hint}</div>}
    </div>
  );
}

function WelcomeCard({ role }) {
  return (
    <div style={styles.pageWrapper}>
      <div style={styles.card}>
        <div style={styles.cardTitle}>Üdvözöl a Progrecon Onboard rendszer</div>
        <p style={{ margin: 0, color: "#6b7280", fontSize: "13px" }}>
          Bejelentkezett szerepkör: <strong style={{ fontWeight: 500 }}>{role || "—"}</strong>
        </p>
      </div>
    </div>
  );
}

function PvHome() {
  const [stats, setStats] = useState(null);
  const [draftCount, setDraftCount] = useState(0);
  const [sentCount, setSentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [statsRes, draftRes, sentRes] = await Promise.all([
          client.get("/pv/stats/"),
          client.get("/entries/", { params: { status: "folyamatban" } }),
          client.get("/entries/", { params: { status: "elküldve" } }),
        ]);
        if (!active) return;
        setStats(statsRes.data);
        setDraftCount(draftRes.data.length);
        setSentCount(sentRes.data.length);
      } catch (e) {
        if (!active) return;
        setError(e.response?.data?.detail || "Hiba a PV statisztikák betöltése során");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, []);

  if (loading) return <div style={styles.pageWrapper}><div style={styles.card}>Betöltés...</div></div>;
  if (error) return <div style={styles.pageWrapper}><div style={styles.errorBox}>{error}</div></div>;

  return (
    <div style={styles.pageWrapper}>
      <div style={styles.statGrid3}>
        <StatCard label="Összes munkavállaló" value={stats.total_all} hint="fő összesen" />
        <StatCard label="Folyamatban lévő belépők" value={draftCount} hint="rekord félkész" />
        <StatCard label="Elküldve" value={sentCount} hint="bérszámfejtőnél" />
      </div>

      <div style={styles.ccGrid}>
        {stats.cost_centers.map((cc) => (
          <div key={cc.cost_center_id} style={styles.ccCard}>
            <div style={styles.ccCode}>{cc.code}</div>
            <div style={styles.ccName}>{cc.name}</div>
            <div style={styles.ccTotal}>{cc.total} <span style={styles.ccUnit}>fő</span></div>
            <div style={styles.deltaRow}>
              <span>Ma: <span style={{ color: deltaColor(cc.delta_today), fontWeight: 500 }}>{formatDelta(cc.delta_today)}</span></span>
              <span style={styles.sep}>·</span>
              <span>7 nap: <span style={{ color: deltaColor(cc.delta_week), fontWeight: 500 }}>{formatDelta(cc.delta_week)}</span></span>
              <span style={styles.sep}>·</span>
              <span>30 nap: <span style={{ color: deltaColor(cc.delta_month), fontWeight: 500 }}>{formatDelta(cc.delta_month)}</span></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminHome() {
  const navigate = useNavigate();
  const [adminStats, setAdminStats] = useState(null);
  const [pvStats, setPvStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [usersRes, costCentersRes, statsRes] = await Promise.all([
          client.get("/admin/users/"),
          client.get("/admin/cost-centers/"),
          client.get("/pv/stats/"),
        ]);
        if (!active) return;
        const users = usersRes.data;
        const costCenters = costCentersRes.data;
        setPvStats(statsRes.data);
        setAdminStats({
          usersTotal: users.length,
          usersActive: users.filter((u) => u.is_active).length,
          costCentersTotal: costCenters.length,
          costCentersActive: costCenters.filter((cc) => cc.is_active).length,
        });
      } catch (e) {
        if (!active) return;
        setError(e.response?.data?.detail || "Hiba az admin adatok betöltése során");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, []);

  if (loading) return <div style={styles.pageWrapper}><div style={styles.card}>Betöltés...</div></div>;
  if (error) return <div style={styles.pageWrapper}><div style={styles.errorBox}>{error}</div></div>;

  return (
    <div style={styles.pageWrapper}>
      <div style={styles.statGrid4}>
        <StatCard label="Felhasználók száma" value={adminStats.usersTotal} hint="összesen" />
        <StatCard label="Aktív felhasználók" value={adminStats.usersActive} hint="használatban" />
        <StatCard label="Költséghelyek száma" value={adminStats.costCentersTotal} hint="összesen" />
        <StatCard label="Aktív költséghelyek" value={adminStats.costCentersActive} hint="használatban" />
      </div>

      <div style={styles.quickGrid}>
        {ADMIN_LINKS.map((link) => (
          <button key={link.to} style={styles.quickCard} onClick={() => navigate(link.to)}>
            <div style={styles.quickIcon}>{link.icon}</div>
            <div>
              <div style={styles.quickTitle}>{link.title}</div>
              <div style={styles.quickDesc}>{link.description}</div>
            </div>
          </button>
        ))}
      </div>

      <div style={styles.card}>
        <div style={styles.cardTitle}>Munkavállalók költséghelyenként</div>
        <div style={styles.ccGrid}>
          {pvStats.cost_centers.map((cc) => (
            <div key={cc.cost_center_id} style={styles.ccCard}>
              <div style={styles.ccCode}>{cc.code}</div>
              <div style={styles.ccName}>{cc.name}</div>
              <div style={styles.ccTotal}>{cc.total} <span style={styles.ccUnit}>fő</span></div>
              <div style={styles.deltaRow}>
                <span>Ma: <span style={{ color: deltaColor(cc.delta_today), fontWeight: 500 }}>{formatDelta(cc.delta_today)}</span></span>
                <span style={styles.sep}>·</span>
                <span>7 nap: <span style={{ color: deltaColor(cc.delta_week), fontWeight: 500 }}>{formatDelta(cc.delta_week)}</span></span>
                <span style={styles.sep}>·</span>
                <span>30 nap: <span style={{ color: deltaColor(cc.delta_month), fontWeight: 500 }}>{formatDelta(cc.delta_month)}</span></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();

  if (user?.role === "pv") return <PvHome />;
  if (user?.role === "admin") return <AdminHome />;
  return <WelcomeCard role={user?.role} />;
}

const styles = {
  pageWrapper: {
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  card: {
    background: "#fff",
    border: "0.5px solid #e2e4e9",
    borderRadius: "12px",
    padding: "20px 24px",
  },
  cardTitle: {
    fontSize: "13px",
    fontWeight: 500,
    color: "#1a1a2e",
    marginBottom: "16px",
  },
  statGrid3: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "12px",
  },
  statGrid4: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "12px",
  },
  statCard: {
    background: "#fff",
    border: "0.5px solid #e2e4e9",
    borderRadius: "8px",
    padding: "14px 16px",
  },
  statLabel: {
    fontSize: "11px",
    color: "#6b7280",
    marginBottom: "4px",
  },
  statValue: {
    fontSize: "22px",
    fontWeight: 500,
    color: "#1a1a2e",
    lineHeight: 1,
  },
  statHint: {
    fontSize: "11px",
    color: "#9ca3af",
    marginTop: "4px",
  },
  ccGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "12px",
  },
  ccCard: {
    background: "#fff",
    border: "0.5px solid #e2e4e9",
    borderRadius: "12px",
    padding: "16px 20px",
  },
  ccCode: {
    fontSize: "12px",
    fontWeight: 500,
    color: "#6b7280",
    marginBottom: "2px",
  },
  ccName: {
    fontSize: "12px",
    color: "#9ca3af",
    minHeight: "32px",
  },
  ccTotal: {
    fontSize: "22px",
    fontWeight: 500,
    color: "#1a1a2e",
    margin: "10px 0",
  },
  ccUnit: {
    fontSize: "13px",
    fontWeight: 400,
    color: "#9ca3af",
  },
  deltaRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
    alignItems: "center",
    fontSize: "11px",
    color: "#6b7280",
  },
  sep: {
    color: "#d1d5db",
  },
  quickGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "12px",
  },
  quickCard: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    textAlign: "left",
    background: "#fff",
    border: "0.5px solid #e2e4e9",
    borderRadius: "12px",
    padding: "16px 20px",
    cursor: "pointer",
    width: "100%",
  },
  quickIcon: {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    background: "#eeedfe",
    color: "#534AB7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: 500,
    flexShrink: 0,
  },
  quickTitle: {
    fontSize: "13px",
    fontWeight: 500,
    color: "#1a1a2e",
    marginBottom: "3px",
  },
  quickDesc: {
    fontSize: "12px",
    color: "#6b7280",
    lineHeight: 1.4,
  },
  errorBox: {
    background: "#fef2f2",
    border: "0.5px solid #fecaca",
    color: "#b91c1c",
    borderRadius: "8px",
    padding: "12px 16px",
    fontSize: "12.5px",
  },
};
