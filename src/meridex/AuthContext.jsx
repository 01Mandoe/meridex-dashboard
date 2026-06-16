import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const AuthCtx = createContext(null);

async function jsonAuth(url, opts = {}) {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const e = new Error(body.detail || res.statusText);
    e.status = res.status;
    throw e;
  }
  return res.json();
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    return jsonAuth(`${API}/auth/me`)
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = useCallback((email, password) =>
    jsonAuth(`${API}/auth/login`, { method: "POST", body: JSON.stringify({ email, password }) })
      .then((u) => { setUser(u); return u; }), []);

  const register = useCallback((email, password, name) =>
    jsonAuth(`${API}/auth/register`, { method: "POST", body: JSON.stringify({ email, password, name }) })
      .then((u) => { setUser(u); return u; }), []);

  const googleLogin = useCallback((session_id) =>
    jsonAuth(`${API}/auth/google`, { method: "POST", body: JSON.stringify({ session_id }) })
      .then((u) => { setUser(u); return u; }), []);

  const logout = useCallback(() =>
    jsonAuth(`${API}/auth/logout`, { method: "POST" }).then(() => setUser(null)), []);

  const updateWebhook = useCallback((discord_webhook_url) =>
    jsonAuth(`${API}/auth/me/webhook`, { method: "PATCH", body: JSON.stringify({ discord_webhook_url }) })
      .then(() => refresh()), [refresh]);

  const value = useMemo(
    () => ({ user, loading, login, register, googleLogin, logout, updateWebhook, refresh }),
    [user, loading, login, register, googleLogin, logout, updateWebhook, refresh]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be inside <AuthProvider>");
  return ctx;
}
