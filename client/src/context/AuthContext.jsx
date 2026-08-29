import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import api from "../api/axios";
import { connectSocket, disconnectSocket } from "../lib/socket";

/**
 * The single source of truth for who is signed in.
 *
 * The session lives in httpOnly cookies the browser sends automatically, so
 * this context holds the *profile* rather than a token. On boot it asks the
 * server who the caller is instead of trusting anything cached locally — a
 * localStorage copy can be stale or edited, a server answer cannot.
 */

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null);
  // `loading` starts true so route guards wait for the answer rather than
  // redirecting a signed-in user to /login on first paint.
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/current-user");
      setUser(data.data.user);
      setWallet(data.data.wallet);
      connectSocket();
      return data.data.user;
    } catch {
      setUser(null);
      setWallet(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
    return () => disconnectSocket();
  }, [loadSession]);

  const login = useCallback(
    async (credentials) => {
      const inviteToken = localStorage.getItem("inviteToken");
      await api.post("/auth/login", { ...credentials, ...(inviteToken && { inviteToken }) });

      localStorage.removeItem("inviteToken");

      // Make sure every user has a wallet before they reach the dashboard.
      await api.post("/wallet/add_new").catch(() => {});

      return loadSession();
    },
    [loadSession]
  );

  const register = useCallback(async (details) => {
    const inviteToken = localStorage.getItem("inviteToken");
    const { data } = await api.post("/auth/register", {
      ...details,
      ...(inviteToken && { inviteToken }),
    });
    return data.data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Clearing local state matters even if the network call fails.
    }
    disconnectSocket();
    localStorage.removeItem("inviteToken");
    setUser(null);
    setWallet(null);
  }, []);

  const refreshWallet = useCallback(async () => {
    try {
      const { data } = await api.get("/wallet/balance");
      setWallet((current) => ({ ...current, ...data.data }));
      return data.data;
    } catch {
      return null;
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      wallet,
      loading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
      refreshWallet,
      reloadSession: loadSession,
    }),
    [user, wallet, loading, login, register, logout, refreshWallet, loadSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return context;
}
