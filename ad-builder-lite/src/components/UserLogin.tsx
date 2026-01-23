import { useState } from "react";
import { useAuth } from "../auth/AuthProvider";

export function LoginForm({ onDone }: { onDone?: () => void }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        try {
          await login(email, password);
          onDone?.();
        } catch (e: any) {
          setErr(e?.message ?? "Login failed");
        } finally {
          setBusy(false);
        }
      }}
      style={{ display: "grid", gap: 8 }}
    >
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
      <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" type="password" />
      {err && <div style={{ color: "crimson", fontSize: 12 }}>{err}</div>}
      <button type="submit" disabled={busy}>
        {busy ? "Logging in…" : "Login"}
      </button>
    </form>
  );
}
