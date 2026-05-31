import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const region = localStorage.getItem("region") || null;
    const person = JSON.parse(localStorage.getItem("person") || "null");
    if (token && role) return { token, role, region, person };
    return null;
  });

  function login(token, role, region, person = null) {
    localStorage.setItem("token", token);
    localStorage.setItem("role", role);
    if (region) {
      localStorage.setItem("region", region);
    } else {
      localStorage.removeItem("region");
    }
    localStorage.setItem("person", JSON.stringify(person ?? null));
    setUser({ token, role, region: region ?? null, person: person ?? null });
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
