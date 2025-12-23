import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register } from "../api/authApi";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

export default function RegisterPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="mx-auto mt-16 w-full max-w-md rounded-2xl border bg-card/80 p-6 shadow-sm backdrop-blur">
      <div className="mb-6 space-y-2">
        <h2 className="text-2xl font-semibold text-foreground">Create your account</h2>
        <p className="text-sm text-muted-foreground">Start a shared learning routine in minutes.</p>
      </div>
      {err && <p className="mb-4 text-sm text-destructive">{err}</p>}
      <form
        className="grid gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setErr(null);
          try {
            await register(email, password);
            nav("/app");
          } catch (e: any) {
            setErr(e.message ?? "Register failed");
          }
        }}
      >
        <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Button type="submit" className="w-full">
          Create account
        </Button>
      </form>
      <p className="mt-6 text-sm text-muted-foreground">
        Have an account?{" "}
        <Link className="font-medium text-primary hover:underline" to="/login">
          Login
        </Link>
      </p>
    </div>
  );
}
