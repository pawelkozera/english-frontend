import { Navigate, useLocation } from "react-router-dom";
import { refreshAccessToken, useAccessToken } from "../lib/auth";
import { useEffect, useState, type ReactNode } from "react";

export default function RequireAuth({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const token = useAccessToken();
  const [checking, setChecking] = useState(() => !token);

  useEffect(() => {
    let cancelled = false;

    if (token) {
      setChecking(false);
      return;
    }

    setChecking(true);

    (async () => {
      await refreshAccessToken();
      if (!cancelled) setChecking(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (checking) return null;

  if (!token) {
    return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  }

  return <>{children}</>;
}
