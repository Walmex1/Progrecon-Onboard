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

function deltaStyle(value) {
  if (value > 0) return styles.deltaPositive;
  if (value < 0) return styles.deltaNegative;
  return styles.deltaNeutral;
}

function StatCard({ label, value, hint }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statLabel}>{label}</div>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statHint}>{hint}</div>
    </div>
  );
}

function WelcomeCard({ role }) {
  return (
    <div style={styles.card}>
      <h1 style={styles.title}>Üdvözöl a Progrecon Onboard rendszer</h1>
      <p style={styles.role}>
        Bejelentkezett felhasználó szerepköre: <strong>{role || "-"}</strong>
      </p>
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
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <div style={styles.card}>Betöltés...</div>;
  }

  if (error) {
    return <div style={styles.errorBox}>{error}</div>;
  }

  return (
    <div style={styles.page}>
      <div style={styles.statGridThree}>
        <StatCard label="Összes munkavállaló" value={stats.total_all} hint="fő összesen" />
        <StatCard label="Folyamatban lévő belépők" value={draftCount} hint="rekord félkész" />
        <StatCard label="Elküldve" value={sentCount} hint="bérszámfejtőnél" />
      </div>

      <div style={styles.companyGrid}>
        {stats.cost_centers.map((cc) => (
          <div key={cc.cost_center_id} style={styles.companyCard}>
            <div style={styles.companyCode}>{cc.code}</div>
            <div style={styles.companyName}>{cc.name}</div>
            <div style={styles.companyTotal}>{cc.total} fő</div>
            <div style={styles.deltaRow}>
              <span>
                Ma: <strong style={deltaStyle(cc.delta_today)}>{formatDelta(cc.delta_today)}</strong>
              </span>
              <span style={styles.separator}>|</span>
              <span>
                7 nap: <strong style={deltaStyle(cc.delta_week)}>{formatDelta(cc.delta_week)}</strong>
              </span>
              <span style={styles.separator}>|</span>
              <span>
                30 nap: <strong style={deltaStyle(cc.delta_month)}>{formatDelta(cc.delta_month)}</strong>
              </span>
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
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <div style={styles.card}>Betöltés...</div>;
  }

  if (error) {
    return <div style={styles.errorBox}>{error}</div>;
  }

  return (
    <div style={styles.page}>
      <div style={styles.statGridFour}>
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
              <div style={styles.quickDescription}>{link.description}</div>
            </div>
          </button>
        ))}
      </div>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Munkavállalók költséghelyenként</h2>
        <div style={styles.companyGrid}>
          {pvStats.cost_centers.map((cc) => (
            <div key={cc.cost_center_id} style={styles.companyCard}>
              <div style={styles.companyCode}>{cc.code}</div>
              <div style={styles.companyName}>{cc.name}</div>
              <div style={styles.companyTotal}>{cc.total} fő</div>
              <div style={styles.deltaRow}>
                <span>
                  Ma: <strong style={deltaStyle(cc.delta_today)}>{formatDelta(cc.delta_today)}</strong>
                </span>
                <span style={styles.separator}>|</span>
                <span>
                  7 nap: <strong style={deltaStyle(cc.delta_week)}>{formatDelta(cc.delta_week)}</strong>
                </span>
                <span style={styles.separator}>|</span>
                <span>
                  30 nap: <strong style={deltaStyle(cc.delta_month)}>{formatDelta(cc.delta_month)}</strong>
                </span>
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
  page: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  card: {
    background: "#fff",
    borderRadius: "8px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
    padding: "2rem",
  },
  title: {
    margin: "0 0 1rem",
    fontWeight: 500,
    fontSize: "1.5rem",
    color: "#2c3e50",
  },
  role: {
    margin: 0,
    color: "#555",
    fontSize: "0.95rem",
  },
  sectionTitle: {
    margin: "0 0 1rem",
    fontWeight: 500,
    fontSize: "1.2rem",
    color: "#2c3e50",
  },
  statGridThree: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "1rem",
  },
  statGridFour: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "1rem",
  },
  statCard: {
    background: "#f8f9fa",
    borderRadius: "6px",
    padding: "1rem 1.25rem",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  },
  statLabel: {
    color: "#555",
    fontSize: "0.85rem",
    marginBottom: "0.5rem",
  },
  statValue: {
    color: "#2c3e50",
    fontSize: "2rem",
    fontWeight: 600,
    lineHeight: 1,
  },
  statHint: {
    color: "#777",
    fontSize: "0.85rem",
    marginTop: "0.5rem",
  },
  companyGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "1rem",
  },
  companyCard: {
    background: "#fff",
    border: "1px solid #e0e0e0",
    borderRadius: "8px",
    padding: "1.25rem",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  },
  companyCode: {
    color: "#2c3e50",
    fontSize: "1.05rem",
    fontWeight: 600,
    marginBottom: "0.25rem",
  },
  companyName: {
    color: "#777",
    fontSize: "0.9rem",
    minHeight: "2.4rem",
  },
  companyTotal: {
    color: "#2c3e50",
    fontSize: "2rem",
    fontWeight: 600,
    margin: "1.25rem 0",
  },
  deltaRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
    alignItems: "center",
    color: "#555",
    fontSize: "0.85rem",
  },
  separator: {
    color: "#ccc",
  },
  deltaPositive: {
    color: "#2e7d32",
  },
  deltaNeutral: {
    color: "#888",
  },
  deltaNegative: {
    color: "#b71c1c",
  },
  quickGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "1rem",
  },
  quickCard: {
    display: "flex",
    alignItems: "flex-start",
    gap: "1rem",
    textAlign: "left",
    background: "#fff",
    border: "1px solid #e0e0e0",
    borderRadius: "8px",
    padding: "1.25rem",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
    cursor: "pointer",
  },
  quickIcon: {
    width: "34px",
    height: "34px",
    borderRadius: "6px",
    background: "#e3f2fd",
    color: "#1565c0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    flexShrink: 0,
  },
  quickTitle: {
    color: "#2c3e50",
    fontSize: "1rem",
    fontWeight: 600,
    marginBottom: "0.35rem",
  },
  quickDescription: {
    color: "#666",
    fontSize: "0.88rem",
    lineHeight: 1.4,
  },
  errorBox: {
    background: "#fdecea",
    border: "1px solid #f5c6cb",
    color: "#b71c1c",
    borderRadius: "4px",
    padding: "0.8rem 1rem",
    fontSize: "0.9rem",
  },
};
