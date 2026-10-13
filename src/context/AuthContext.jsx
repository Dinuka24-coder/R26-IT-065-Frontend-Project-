import { createContext, useContext, useState, useEffect } from "react";
import { login as apiLogin } from "../api/authApi";
import { isTokenExpired } from "../utils/helpers";

const AuthContext = createContext(null);

// ── Plain function, NOT a hook — safe at module level ──────────
function loadStoredUser() {
  try {
    const token = sessionStorage.getItem("pulmo_token");
    if (!token || isTokenExpired(token)) {
      sessionStorage.removeItem("pulmo_token");
      sessionStorage.removeItem("pulmo_user");
      return null;
    }
    const raw = sessionStorage.getItem("pulmo_user");
    if (!raw || raw === "undefined") return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to restore session:", e);
    sessionStorage.removeItem("pulmo_token");
    sessionStorage.removeItem("pulmo_user");
    return null;
  }
}

// ── ALL hooks go inside this function ──────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadStoredUser);      // ← inside ✅

  useEffect(() => {
    const handler = () => setUser(null);
    window.addEventListener("pulmo:signout", handler);
    return () => window.removeEventListener("pulmo:signout", handler);
  }, []);

  async function signIn(email, password) {
    const data = await apiLogin(email, password);
    sessionStorage.setItem("pulmo_token", data.access_token);
    sessionStorage.setItem("pulmo_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  function signOut() {
    sessionStorage.removeItem("pulmo_token");
    sessionStorage.removeItem("pulmo_user");
    sessionStorage.removeItem("pulmo_page");
    sessionStorage.removeItem("pulmo_ctx");
    setUser(null);
  }

  function updateUser(patch) {
    const updated = { ...user, ...patch };
    sessionStorage.setItem("pulmo_user", JSON.stringify(updated));
    setUser(updated);
  }

  return (
      <AuthContext.Provider
          value={{ user, setUser, updateUser, signIn, signOut, isAdmin: user?.role === "admin" }}
      >
        {children}
      </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);