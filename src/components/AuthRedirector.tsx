import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAccessToken } from "../lib/auth";

export default function AuthRedirector() {
  const token = useAccessToken();
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    const publicPaths = ["/", "/login", "/register", "/join"];
    const onPublicPage = publicPaths.includes(loc.pathname);
    if (!token && !onPublicPage) {
      nav("/login", { replace: true, state: { from: loc.pathname + loc.search } });
    }
  }, [token, loc.pathname, loc.search, nav]);

  return null;
}
