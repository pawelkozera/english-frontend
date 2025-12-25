import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getAccessToken, refreshAccessToken } from "../lib/auth";

const PUBLIC_PATHS = new Set(["/", "/login", "/register", "/join"]);
const AUTH_PAGES = new Set(["/login", "/register"]);

export default function AuthRedirector() {
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    let cancelled = false;

    const onPublicPage = PUBLIC_PATHS.has(loc.pathname);
    const onAuthPage = AUTH_PAGES.has(loc.pathname);
    if (onPublicPage && !onAuthPage) return;

    (async () => {
      // If this tab already has an access token -> route away from auth pages.
      if (getAccessToken()) {
        if (onAuthPage) nav("/app", { replace: true });
        return;
      }

      // New tab => try bootstrap via refresh cookie.
      await refreshAccessToken();

      if (cancelled) return;

      // If auth pages and we now have token -> go to app.
      if (onAuthPage && getAccessToken()) {
        nav("/app", { replace: true });
        return;
      }

      // If still no token -> redirect to login for protected routes.
      if (!onAuthPage && !getAccessToken()) {
        nav("/login", {
          replace: true,
          state: { from: loc.pathname + loc.search },
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loc.pathname, loc.search, nav]);

  return null;
}
