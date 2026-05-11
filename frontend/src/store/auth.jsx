import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const costCenterIds = JSON.parse(localStorage.getItem("cost_center_ids") || "[]");
    if (token && role) return { token, role, costCenterIds };
    return null;
  });

  function login(token, role, costCenterIds) {
    localStorage.setItem("token", token);
    localStorage.setItem("role", role);
    localStorage.setItem("cost_center_ids", JSON.stringify(costCenterIds ?? []));
    setUser({ token, role, costCenterIds: costCenterIds ?? [] });
  }

  function logout() {
    localStorage.clear();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
