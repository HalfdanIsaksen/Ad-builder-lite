import { useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function LoginForm({ onDone }: { onDone?: () => void }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <Card className="p-4">
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
        className="grid gap-2"
      >
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
        <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" type="password" />
        {err && <div className="text-destructive text-xs">{err}</div>}
        <Button type="submit" disabled={busy}>
          {busy ? "Logging in…" : "Login"}
        </Button>
      </form>
    </Card>
  );
}
