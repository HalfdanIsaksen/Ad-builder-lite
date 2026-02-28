// src/auth/AuthProvider.tsx
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as api from "../lib/api";

type AuthCtx = {
  user: api.User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<api.User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const u = await api.me();
      setUser(u);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      loading,
      refresh,
      login: async (email, password) => {
        const u = await api.login(email, password);
        setUser(u);
      },
      register: async (email, password) => {
        const u = await api.register(email, password);
        setUser(u);
      },
      logout: async () => {
        await api.logout();
        setUser(null);
      },
    }),
    [user, loading, refresh]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
