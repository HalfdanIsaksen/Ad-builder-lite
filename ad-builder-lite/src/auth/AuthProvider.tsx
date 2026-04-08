import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as api from "../lib/api";

type AuthCtx = {
  user: api.User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<api.User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.me();
      setUser(res.user);
    } catch {
      setUser(null);
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

      login: async (usernameOrEmail, password) => {
        await api.login(usernameOrEmail, password);
        await refresh();
      },

      register: async (username, email, password) => {
        await api.register(username, email, password);
        await refresh();
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