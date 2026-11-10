import { createContext, useContext, useState } from "react";

const USER_KEY = "Brew2Basket:user";
const AuthContext = createContext(null);

function readUser() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(USER_KEY) || "null");
    return stored && typeof stored.email === "string" ? stored : null;
  } catch { return null; }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readUser);
  function login(nextUser) {
    const session = { email: String(nextUser.email || "").trim(), cafeName: String(nextUser.cafeName || "Demo café").trim(), displayName: String(nextUser.displayName || "").trim() };
    window.localStorage.setItem(USER_KEY, JSON.stringify(session));
    setUser(session);
  }
  function updateProfile(updates) {
    const session = {
      ...user,
      displayName: String(updates.displayName ?? user?.displayName ?? "").trim(),
      cafeName: String(updates.cafeName ?? user?.cafeName ?? "Demo café").trim(),
    };
    window.localStorage.setItem(USER_KEY, JSON.stringify(session));
    setUser(session);
    return session;
  }
  function logout() {
    window.localStorage.removeItem(USER_KEY);
    setUser(null);
  }
  return <AuthContext.Provider value={{ user, login, logout, updateProfile }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
