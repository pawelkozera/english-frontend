import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { acceptInvite, previewInvite } from "../api/invitesApi";
import { getAccessToken } from "../lib/auth";
import { Button } from "../components/ui/button";

function useQueryParam(name: string) {
  const loc = useLocation();
  return useMemo(() => new URLSearchParams(loc.search).get(name), [loc.search, name]);
}

export default function JoinInvitePage() {
  const nav = useNavigate();
  const token = useQueryParam("token") ?? "";
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [preview, setPreview] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setErr(null);
      if (!token) return;
      setState("loading");
      try {
        const p = await previewInvite(token);
        setPreview(p);
        setState("ready");
        // Drop the token from the URL to keep history clean.
        window.history.replaceState({}, "", "/join");
      } catch (e: any) {
        setErr(e.message ?? "Preview failed");
        setState("error");
      }
    })();
  }, [token]);

  const isLoggedIn = !!getAccessToken();

  return (
    <div className="mx-auto mt-16 w-full max-w-2xl rounded-2xl border bg-card/80 p-6 shadow-sm backdrop-blur">
      <div className="mb-4 space-y-2">
        <h2 className="text-2xl font-semibold text-foreground">Join via invite</h2>
        <p className="text-sm text-muted-foreground">Accept your group invitation and jump into the routine.</p>
      </div>

      {!token && <p className="text-sm text-muted-foreground">Missing token in URL. Use /join?token=...</p>}

      {state === "loading" && <p className="text-sm text-muted-foreground">Loading preview...</p>}
      {err && <p className="text-sm text-destructive">{err}</p>}

      {preview && (
        <div className="mt-4 space-y-3 text-sm text-muted-foreground">
          <p className="text-base text-foreground">
            Group: <span className="font-semibold">{preview.groupName}</span>
          </p>
          <p>Role: {preview.roleGranted}</p>
          <p>Valid: {String(preview.valid)}</p>

          {!isLoggedIn && (
            <p>
              Please{" "}
              <Link className="font-medium text-primary hover:underline" to="/login">
                login
              </Link>{" "}
              to accept invite.
            </p>
          )}

          {isLoggedIn && preview.valid && (
            <Button
              onClick={async () => {
                try {
                  await acceptInvite(token);
                  nav("/app");
                } catch (e: any) {
                  setErr(e.message ?? "Accept failed");
                }
              }}
            >
              Accept invite
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
