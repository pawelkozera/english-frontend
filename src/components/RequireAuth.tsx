import { Navigate, useLocation } from "react-router-dom";
import { useAccessToken } from "../lib/auth";
import type { ReactNode } from "react";

export default function RequireAuth({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const token = useAccessToken();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  }

  return <>{children}</>;
}