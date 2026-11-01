import { useEffect, useState } from "react";

// Empty in production: the request goes to /api/... on the same domain (Caddy forwards it).
const API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "")
    .replace(/\/+$/, "")
    .replace(/\/api\/v1$/, "");

/**
 * Asks the backend whether the public home page is switched on.
 * Returns "loading", "on" or "off".
 */
export default function useLandingPage() {
    const [state, setState] = useState("loading");

    useEffect(() => {
        let active = true;
        fetch(`${API_BASE}/api/v1/settings/public`)
            .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
            .then((d) => active && setState(d.landing_page_enabled ? "on" : "off"))
            .catch(() => active && setState("on")); // if the check fails, still show the home page
        return () => { active = false; };
    }, []);

    return state;
}