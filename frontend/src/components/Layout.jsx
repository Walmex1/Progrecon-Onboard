import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../store/auth.jsx";
import Sidebar from "./Sidebar";

export default function Layout() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <main style={{ flex: 1, padding: "2rem", background: "#f8f9fa", overflowY: "auto" }}>
        <Outlet />
      </main>
    </div>
  );
}
