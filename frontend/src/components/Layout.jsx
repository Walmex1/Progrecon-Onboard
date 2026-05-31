import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth.jsx";
import Sidebar from "./Sidebar";

const BREADCRUMB = {
  "/": "Kezdőlap",
  "/belepok/uj": "Belépők › Új belépő rögzítése",
  "/belepok/folyamatban": "Belépők › Folyamatban lévők",
  "/belepok/lezartak": "Belépők › Lezártak",
  "/berszamfejtes/feldolgozas": "Bérszámfejtés › Feldolgozásra váró",
  "/berszamfejtes/csv": "Bérszámfejtés › CSV generálás",
  "/berszamfejtes/elozmeny": "Bérszámfejtés › Letöltési előzmények",
  "/admin/koltseghelyek": "Adminisztráció › Költséghelyek",
  "/admin/felhasznalok": "Adminisztráció › Felhasználók",
  "/admin/munkavallalok": "Adminisztráció › Munkavállalói adatbázis",
};

const ROLE_LABEL = {
  pv: "Projektvezető",
  berszamfejto: "Bérszámfejtő",
  admin: "Admin",
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return <Navigate to="/login" replace />;

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const breadcrumb =
    BREADCRUMB[location.pathname] ||
    (location.pathname.startsWith("/belepok/") ? "Belépők › Rekord szerkesztése" : "");

  const roleLabel = ROLE_LABEL[user?.role] || user?.role || "";

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f5f6fa" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header style={styles.topbar}>
          <span style={styles.breadcrumb}>{breadcrumb}</span>
          <div style={styles.topbarRight}>
            <span style={styles.topbarUser}>{roleLabel}</span>
            <button style={styles.logoutBtn} onClick={handleLogout}>Kilépés</button>
          </div>
        </header>
        <main style={{ flex: 1, padding: 0, overflowY: "auto" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

const styles = {
  topbar: {
    height: "52px",
    background: "#fff",
    borderBottom: "0.5px solid #e2e4e9",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 24px",
    flexShrink: 0,
  },
  breadcrumb: {
    fontSize: "12.5px",
    color: "#6b7280",
    fontWeight: 400,
  },
  topbarRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  topbarUser: {
    fontSize: "12.5px",
    color: "#1a1a2e",
    fontWeight: 500,
  },
  logoutBtn: {
    background: "none",
    border: "0.5px solid #e2e4e9",
    color: "#6b7280",
    padding: "5px 12px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 400,
  },
};
