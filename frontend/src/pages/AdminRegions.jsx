import { useEffect, useMemo, useState } from "react";
import client from "../api/client";

const UNASSIGNED_KEY = "__unassigned__";
const UNASSIGNED_LABEL = "Nincs régióhoz rendelve";

function getUserName(u) {
  if (u.person) return `${u.person.last_name} ${u.person.first_name}`;
  return u.username;
}

function getInitials(u) {
  if (u.person) {
    return `${u.person.last_name?.charAt(0) ?? ""}${u.person.first_name?.charAt(0) ?? ""}`.toUpperCase();
  }
  return (u.username ?? "").slice(0, 2).toUpperCase();
}

export default function AdminRegions() {
  const [costCenters, setCostCenters] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(null);
  const [hoveredTab, setHoveredTab] = useState(null);

  async function fetchAll() {
    setLoading(true);
    setError(null);
    try {
      const [ccRes, usersRes] = await Promise.all([
        client.get("/admin/cost-centers/"),
        client.get("/admin/users/"),
      ]);
      setCostCenters(ccRes.data);
      setUsers(usersRes.data);
    } catch (e) {
      setError(e.response?.data?.detail || "Hiba a betöltés során");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchAll();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const activeCc = useMemo(() => costCenters.filter((cc) => cc.is_active), [costCenters]);
  const activePv = useMemo(() => users.filter((u) => u.role === "pv" && u.is_active), [users]);
  const regions = useMemo(
    () => [...new Set(activeCc.map((cc) => cc.region).filter(Boolean))].sort(),
    [activeCc]
  );
  const unassignedCc = useMemo(() => activeCc.filter((cc) => !cc.region), [activeCc]);
  const unassignedPv = useMemo(() => activePv.filter((u) => !u.region), [activePv]);
  const hasUnassigned = unassignedCc.length > 0 || unassignedPv.length > 0;

  const tabs = useMemo(
    () => [
      ...regions.map((region) => ({
        key: region,
        label: region,
        count: activeCc.filter((cc) => cc.region === region).length,
        warning: false,
      })),
      ...(hasUnassigned
        ? [{
            key: UNASSIGNED_KEY,
            label: UNASSIGNED_LABEL,
            count: unassignedCc.length,
            warning: true,
          }]
        : []),
    ],
    [activeCc, hasUnassigned, regions, unassignedCc.length]
  );

  const currentTab = tabs.some((tab) => tab.key === activeTab) ? activeTab : tabs[0]?.key ?? null;
  const currentCc = currentTab === UNASSIGNED_KEY
    ? unassignedCc
    : activeCc.filter((cc) => cc.region === currentTab);
  const currentPv = currentTab === UNASSIGNED_KEY
    ? unassignedPv
    : activePv.filter((u) => u.region === currentTab);

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <h1 style={styles.title}>Régiók</h1>
        <div style={styles.metrics}>
          <MetricCard label="Régiók" value={regions.length + (hasUnassigned ? 1 : 0)} />
          <MetricCard label="Költséghelyek" value={activeCc.length} />
          <MetricCard label="Projektvezetők" value={activePv.length} />
        </div>
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      {loading ? (
        <p style={styles.loading}>Betöltés...</p>
      ) : (
        <>
          <div style={styles.tabs}>
            {tabs.map((tab) => {
              const isActive = tab.key === currentTab;
              const isHovered = tab.key === hoveredTab;

              return (
                <button
                  key={tab.key}
                  type="button"
                  style={{
                    ...styles.tab,
                    ...(isActive ? styles.tabActive : {}),
                    ...(!isActive && isHovered ? styles.tabHover : {}),
                  }}
                  onClick={() => setActiveTab(tab.key)}
                  onMouseEnter={() => setHoveredTab(tab.key)}
                  onMouseLeave={() => setHoveredTab(null)}
                >
                  {tab.label}
                  <span style={tab.warning ? styles.tabBadgeWarning : styles.tabBadge}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {currentTab ? (
            <div style={styles.contentGrid}>
              <CostCenterList items={currentCc} />
              <PvList items={currentPv} />
            </div>
          ) : (
            <div style={styles.emptyState}>Nincs megjeleníthető régió</div>
          )}
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div style={styles.metricCard}>
      <div style={styles.metricValue}>{value}</div>
      <div style={styles.metricLabel}>{label}</div>
    </div>
  );
}

function CostCenterList({ items }) {
  return (
    <section>
      <div style={styles.sectionLabel}>Költséghelyek</div>
      <div style={styles.list}>
        {items.length === 0 ? (
          <div style={styles.emptyList}>Nincs elem</div>
        ) : (
          items.map((cc) => (
            <div key={cc.id} style={styles.ccRow}>
              <span style={styles.ccName}>{cc.name}</span>
              <span style={styles.ccCode}>{cc.code}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function PvList({ items }) {
  return (
    <section>
      <div style={styles.sectionLabel}>Projektvezetők</div>
      <div style={styles.list}>
        {items.length === 0 ? (
          <div style={styles.emptyList}>Nincs elem</div>
        ) : (
          items.map((u) => (
            <div key={u.id} style={styles.pvRow}>
              <div style={styles.avatar}>{getInitials(u)}</div>
              <div style={styles.pvName}>{getUserName(u)}</div>
            </div>
          ))
        )}
      </div>
    </section>
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
    marginBottom: "1.5rem",
  },
  title: {
    margin: "0 0 1rem",
    fontWeight: 500,
    fontSize: "1.5rem",
    color: "#2c3e50",
  },
  metrics: {
    display: "flex",
    gap: "1rem",
  },
  metricCard: {
    background: "#f8f9fa",
    borderRadius: "8px",
    padding: "12px 20px",
    minWidth: "130px",
  },
  metricValue: {
    fontSize: "1.5rem",
    fontWeight: 500,
    color: "#2c3e50",
  },
  metricLabel: {
    marginTop: "2px",
    fontSize: "0.78rem",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
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
  tabs: {
    display: "flex",
    gap: "1.25rem",
    borderBottom: "1px solid #e5e7eb",
    marginBottom: "1.5rem",
    overflowX: "auto",
  },
  tab: {
    background: "transparent",
    border: "none",
    borderBottom: "2px solid transparent",
    color: "#6b7280",
    cursor: "pointer",
    fontSize: "0.92rem",
    padding: "0 0 10px",
    whiteSpace: "nowrap",
  },
  tabActive: {
    borderBottom: "2px solid #2c3e50",
    color: "#2c3e50",
    fontWeight: 500,
  },
  tabHover: {
    color: "#2c3e50",
  },
  tabBadge: {
    fontSize: "11px",
    background: "#f3f4f6",
    border: "1px solid #e5e7eb",
    borderRadius: "4px",
    padding: "1px 5px",
    marginLeft: "6px",
    color: "#6b7280",
  },
  tabBadgeWarning: {
    fontSize: "11px",
    background: "#fff7e6",
    border: "1px solid #f7d08a",
    borderRadius: "4px",
    padding: "1px 5px",
    marginLeft: "6px",
    color: "#b45309",
  },
  contentGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1.5rem",
  },
  sectionLabel: {
    fontSize: "0.78rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    color: "#6b7280",
    marginBottom: "0.75rem",
  },
  list: {
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    overflow: "hidden",
    overflowY: "auto",
    maxHeight: "calc(100vh - 320px)",
  },
  ccRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "1rem",
    padding: "9px 14px",
    borderBottom: "1px solid #f3f4f6",
    fontSize: "0.88rem",
  },
  ccName: {
    color: "#2c3e50",
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  ccCode: {
    color: "#9ca3af",
    fontSize: "0.78rem",
    fontFamily: "monospace",
    flexShrink: 0,
  },
  pvRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px 14px",
    borderBottom: "1px solid #f3f4f6",
  },
  avatar: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    background: "#f3f4f6",
    border: "1px solid #e5e7eb",
    fontSize: "10px",
    fontWeight: 500,
    color: "#6b7280",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  pvName: {
    fontSize: "0.88rem",
    color: "#2c3e50",
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  emptyList: {
    color: "#9ca3af",
    fontStyle: "italic",
    padding: "16px 14px",
    textAlign: "center",
  },
  emptyState: {
    color: "#9ca3af",
    fontStyle: "italic",
    padding: "16px 14px",
    textAlign: "center",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
  },
};
