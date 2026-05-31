import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth.jsx";

const PV_MENU = [
  { label: "Belépők", children: [
    { label: "Új belépő rögzítése", to: "/belepok/uj" },
    { label: "Folyamatban lévők", to: "/belepok/folyamatban" },
    { label: "Lezártak", to: "/belepok/lezartak" },
  ]},
  { label: "Kilépők", children: [
    { label: "Új kilépő rögzítése", to: "/kilepok/uj" },
    { label: "Folyamatban lévők", to: "/kilepok/folyamatban" },
    { label: "Lezártak", to: "/kilepok/lezartak" },
  ]},
  { label: "Módosítások", children: [
    { label: "Új módosítás", to: "/modositasok/uj" },
    { label: "Folyamatban lévők", to: "/modositasok/folyamatban" },
    { label: "Lezártak", to: "/modositasok/lezartak" },
  ]},
];

const BERSZAMFEJTO_MENU = [
  { label: "Bérszámfejtés", children: [
    { label: "Feldolgozásra váró rekordok", to: "/berszamfejtes/feldolgozas" },
    { label: "CSV generálás / letöltés", to: "/berszamfejtes/csv" },
    { label: "Letöltési előzmények", to: "/berszamfejtes/elozmeny" },
  ]},
];

const ADMIN_MENU = [
  { label: "Adminisztráció", children: [
    { label: "Felhasználók", to: "/admin/felhasznalok" },
    { label: "Költséghelyek", to: "/admin/koltseghelyek" },
    { label: "Régió", to: "/admin/regio" },
    { label: "Munkavállalói adatbázis", to: "/admin/munkavallalok" },
    { label: "Napló / Log", to: "/admin/naplo" },
  ]},
];

const ROLE_LABEL = {
  pv: "Projektvezető",
  berszamfejto: "Bérszámfejtő",
  admin: "Admin",
};

const DEFAULT_OPEN_SECTIONS = [
  ...PV_MENU,
  ...BERSZAMFEJTO_MENU,
  ...ADMIN_MENU,
].reduce((acc, section) => {
  acc[section.label] = false;
  return acc;
}, {});

export default function Sidebar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [openSections, setOpenSections] = useState(DEFAULT_OPEN_SECTIONS);

  let menu = [];
  if (user?.role === "pv") menu = PV_MENU;
  if (user?.role === "berszamfejto") menu = BERSZAMFEJTO_MENU;
  if (user?.role === "admin") menu = [...PV_MENU, ...BERSZAMFEJTO_MENU, ...ADMIN_MENU];

  const roleLabel = ROLE_LABEL[user?.role] || user?.role || "";
  const footerName = user?.person
    ? `${user.person.first_name} ${user.person.last_name}`
    : roleLabel;
  const initial = footerName.charAt(0).toUpperCase();

  const toggleSection = (label) => {
    setOpenSections((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  return (
    <aside style={styles.sidebar}>
      <div style={styles.logoSection} onClick={() => navigate("/")} role="button">
        <span style={styles.logoText}>Progrecon Onboard</span>
      </div>
      <div style={styles.divider} />
      <nav style={styles.nav}>
        {menu.map((section) => (
          <div key={section.label} style={styles.section}>
            <div
              style={styles.sectionTitle}
              onClick={() => toggleSection(section.label)}
            >
              <span>{section.label}</span>
              <span>{openSections[section.label] ? "▼" : "▶"}</span>
            </div>
            {openSections[section.label] &&
              section.children.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  style={({ isActive }) => ({
                    ...styles.link,
                    ...(isActive ? styles.linkActive : {}),
                  })}
                >
                  {item.label}
                </NavLink>
              ))}
          </div>
        ))}
      </nav>
      <div style={styles.divider} />
      <div style={styles.footer}>
        <div style={styles.avatar}>{initial}</div>
        <div style={styles.footerInfo}>
          <div style={styles.footerName}>{footerName}</div>
          <div style={styles.footerRole}>{user?.role}</div>
        </div>
      </div>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: "232px",
    minHeight: "100vh",
    background: "#1e2330",
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
  },
  logoSection: {
    padding: "18px 16px",
    cursor: "pointer",
    userSelect: "none",
  },
  logoText: {
    fontSize: "13px",
    fontWeight: 500,
    color: "#fff",
    letterSpacing: "0.01em",
  },
  divider: {
    height: "0.5px",
    background: "rgba(255,255,255,0.08)",
    margin: "0",
  },
  nav: {
    flex: 1,
    overflowY: "auto",
    padding: "8px 0",
  },
  section: {
    marginBottom: "4px",
  },
  sectionTitle: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 16px 4px",
    fontSize: "10px",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.35)",
    letterSpacing: "0.8px",
    fontWeight: 500,
    cursor: "pointer",
  },
  link: {
    display: "block",
    padding: "7px 16px 7px 20px",
    fontSize: "12.5px",
    color: "rgba(255,255,255,0.6)",
    textDecoration: "none",
    borderRadius: "0",
    transition: "background 0.1s",
  },
  linkActive: {
    background: "rgba(255,255,255,0.1)",
    color: "#fff",
  },
  footer: {
    padding: "14px 16px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  avatar: {
    width: "30px",
    height: "30px",
    borderRadius: "50%",
    background: "#534AB7",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: 500,
    flexShrink: 0,
  },
  footerInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "1px",
    minWidth: 0,
  },
  footerName: {
    fontSize: "12.5px",
    color: "rgba(255,255,255,0.85)",
    fontWeight: 500,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  footerRole: {
    fontSize: "11px",
    color: "rgba(255,255,255,0.35)",
  },
};
