import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { login } from "../api/authApi";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

export default function LoginPage() {
  const nav = useNavigate();
  const loc = useLocation() as any;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const from = loc.state?.from ?? "/app";

  return (
    <div className="mx-auto mt-16 w-full max-w-md rounded-2xl border bg-card/80 p-6 shadow-sm backdrop-blur">
      <div className="mb-6 space-y-2">
        <h2 className="text-2xl font-semibold text-foreground">Welcome back</h2>
        <p className="text-sm text-muted-foreground">Sign in to keep your group progress in sync.</p>
      </div>

      {err && <p className="mb-4 text-sm text-destructive">{err}</p>}

      <form
        className="grid gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setErr(null);
          setPending(true);
          try {
            await login(email, password);
            nav(from, { replace: true });
          } catch (e: any) {
            setErr(e?.message ?? "Login failed");
          } finally {
            setPending(false);
          }
        }}
      >
        <Input
          disabled={pending}
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          disabled={pending}
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Logging in..." : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        No account?{" "}
        <Link className="font-medium text-primary hover:underline" to="/register">
          Register
        </Link>
      </p>
    </div>
  );
}
