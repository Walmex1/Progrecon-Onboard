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
    { label: "Munkavállalói adatbázis", to: "/admin/munkavallalok" },
    { label: "Napló / Log", to: "/admin/naplo" },
  ]},
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  let menu = [];
  if (user?.role === "pv") menu = PV_MENU;
  if (user?.role === "berszamfejto") menu = BERSZAMFEJTO_MENU;
  if (user?.role === "admin") menu = [...PV_MENU, ...BERSZAMFEJTO_MENU, ...ADMIN_MENU];

  return (
    <aside style={styles.sidebar}>
      <div style={styles.logo} onClick={() => navigate("/")} role="button">
        Progrecon Onboard
      </div>
      <nav style={styles.nav}>
        {menu.map((section) => (
          <div key={section.label} style={styles.section}>
            <div style={styles.sectionTitle}>{section.label}</div>
            {section.children.map((item) => (
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
      <div style={styles.footer}>
        <span style={styles.username}>{user?.role}</span>
        <button style={styles.logoutBtn} onClick={handleLogout}>Kilépés</button>
      </div>
    </aside>
  );
}

const styles = {
  sidebar: { width: "240px", minHeight: "100vh", background: "#2c3e50", color: "#ecf0f1", display: "flex", flexDirection: "column", flexShrink: 0 },
  logo: { padding: "1.2rem 1rem", fontWeight: 600, fontSize: "1rem", borderBottom: "1px solid #3d5166", cursor: "pointer", userSelect: "none" },
  nav: { flex: 1, overflowY: "auto", padding: "0.5rem 0" },
  section: { marginBottom: "0.5rem" },
  sectionTitle: { padding: "0.6rem 1rem 0.3rem", fontSize: "0.75rem", textTransform: "uppercase", color: "#95a5a6", letterSpacing: "0.05em" },
  link: { display: "block", padding: "0.45rem 1rem 0.45rem 1.4rem", fontSize: "0.9rem", color: "#bdc3c7", textDecoration: "none" },
  linkActive: { color: "#fff", background: "#3d5166", borderLeft: "3px solid #3498db" },
  footer: { padding: "1rem", borderTop: "1px solid #3d5166", display: "flex", justifyContent: "space-between", alignItems: "center" },
  username: { fontSize: "0.85rem", color: "#95a5a6" },
  logoutBtn: { background: "none", border: "1px solid #7f8c8d", color: "#bdc3c7", padding: "4px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "0.8rem" },
};
