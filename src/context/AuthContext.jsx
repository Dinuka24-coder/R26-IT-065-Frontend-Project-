import { createContext, useContext, useState } from "react";
import { login as apiLogin } from "../api/authApi";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("pulmo_user")); }
    catch { return null; }
  });

  async function signIn(email, password) {
    const data = await apiLogin(email, password);
    localStorage.setItem("pulmo_token", data.access_token);
    localStorage.setItem("pulmo_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  function signOut() {
    localStorage.removeItem("pulmo_token");
    localStorage.removeItem("pulmo_user");
    setUser(null);
  }

  function updateUser(patch) {
    const updated = { ...user, ...patch };
    localStorage.setItem("pulmo_user", JSON.stringify(updated));
    setUser(updated);
  }

  return (
    <AuthContext.Provider value={{ user, setUser, updateUser, signIn, signOut, isAdmin: user?.role === "admin" }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
