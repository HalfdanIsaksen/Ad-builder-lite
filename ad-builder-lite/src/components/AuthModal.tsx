import { useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  defaultTab?: "login" | "signup";
}

export default function AuthModal({ open, onClose, defaultTab = "login" }: AuthModalProps) {
  const { login, register } = useAuth();

  const [tab, setTab] = useState<string>(defaultTab);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Login fields
  const [loginId, setLoginId] = useState("");
  const [loginPw, setLoginPw] = useState("");

  // Sign-up fields
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPw, setRegPw] = useState("");

  const reset = () => {
    setError(null);
    setLoginId("");
    setLoginPw("");
    setRegUsername("");
    setRegEmail("");
    setRegPw("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId || !loginPw) { setError("All fields are required"); return; }
    setBusy(true);
    setError(null);
    try {
      await login(loginId, loginPw);
      reset();
      onClose();
    } catch (err: any) {
      setError(err?.message ?? "Login failed");
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername || !regEmail || !regPw) { setError("All fields are required"); return; }
    setBusy(true);
    setError(null);
    try {
      await register(regUsername, regEmail, regPw);
      reset();
      onClose();
    } catch (err: any) {
      setError(err?.message ?? "Registration failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Welcome</DialogTitle>
          <DialogDescription>Log in or create an account to continue.</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => { setTab(v); setError(null); }}>
          <TabsList className="w-full">
            <TabsTrigger value="login" className="flex-1">Login</TabsTrigger>
            <TabsTrigger value="signup" className="flex-1">Sign Up</TabsTrigger>
          </TabsList>

          {/* ---- Login Tab ---- */}
          <TabsContent value="login">
            <form onSubmit={handleLogin} className="grid gap-3 pt-2">
              <div className="grid gap-1.5">
                <Label htmlFor="login-id">Username or Email</Label>
                <Input
                  id="login-id"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="username"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="login-pw">Password</Label>
                <Input
                  id="login-pw"
                  type="password"
                  value={loginPw}
                  onChange={(e) => setLoginPw(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
              {error && <p className="text-destructive text-xs">{error}</p>}
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? "Logging in…" : "Login"}
              </Button>
            </form>
          </TabsContent>

          {/* ---- Sign Up Tab ---- */}
          <TabsContent value="signup">
            <form onSubmit={handleRegister} className="grid gap-3 pt-2">
              <div className="grid gap-1.5">
                <Label htmlFor="reg-username">Username</Label>
                <Input
                  id="reg-username"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="cooluser"
                  autoComplete="username"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="reg-email">Email</Label>
                <Input
                  id="reg-email"
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="reg-pw">Password</Label>
                <Input
                  id="reg-pw"
                  type="password"
                  value={regPw}
                  onChange={(e) => setRegPw(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
              {error && <p className="text-destructive text-xs">{error}</p>}
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? "Creating account…" : "Sign Up"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
