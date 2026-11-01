import { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";

const API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "")
    .replace(/\/+$/, "")
    .replace(/\/api\/v1$/, "");

/** Finds the login token saved by the app (works with most key names). */
function getToken() {
    const looksLikeJwt = (v) => typeof v === "string" && v.split(".").length === 3;
    for (const store of [localStorage, sessionStorage]) {
        for (let i = 0; i < store.length; i++) {
            const key = store.key(i);
            if (!/token|auth|user/i.test(key)) continue;
            const raw = store.getItem(key);
            if (looksLikeJwt(raw)) return raw;
            try {
                const obj = JSON.parse(raw);
                const tk = obj?.access_token || obj?.token || obj?.accessToken;
                if (looksLikeJwt(tk)) return tk;
            } catch { /* not JSON */ }
        }
    }
    return null;
}

/** Admin-only switch: turns the public home page on or off. */
export default function LandingPageSwitch() {
    const { t } = useTheme();
    const [enabled, setEnabled] = useState(null);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [isError, setIsError] = useState(false);

    useEffect(() => {
        fetch(`${API_BASE}/api/v1/settings/public`)
            .then((r) => r.json())
            .then((d) => setEnabled(Boolean(d.landing_page_enabled)))
            .catch(() => { setIsError(true); setMessage("Could not load the current setting."); });
    }, []);

    const toggle = async () => {
        setSaving(true);
        setMessage("");
        setIsError(false);
        try {
            const r = await fetch(`${API_BASE}/api/v1/settings/landing-page`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
                body: JSON.stringify({ enabled: !enabled }),
            });
            if (r.status === 401) throw new Error("Your login has expired. Please log in again.");
            if (r.status === 403) throw new Error("Only admins can change this setting.");
            if (!r.ok) throw new Error("Could not save. Please try again.");
            const d = await r.json();
            setEnabled(d.landing_page_enabled);
            setMessage(d.landing_page_enabled
                ? "Saved. Visitors now see the home page first."
                : "Saved. Visitors now go straight to the login page.");
        } catch (e) {
            setIsError(true);
            setMessage(e.message);
        } finally {
            setSaving(false);
        }
    };

    const on = enabled === true;

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <div>
                    <div style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                        Show home page before login
                        {enabled !== null && (
                            <span style={{
                                fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                                color: on ? "#16a34a" : t.dim,
                                background: on ? "rgba(22,163,74,0.12)" : t.accentSoft,
                            }}>
                {on ? "ON" : "OFF"}
              </span>
                        )}
                    </div>
                    <div style={{ fontSize: 13, color: t.dim }}>
                        When ON, visitors see the PulmoAI home page first. When OFF, they go straight to the login page.
                    </div>
                </div>

                <button
                    type="button"
                    onClick={toggle}
                    disabled={enabled === null || saving}
                    style={{
                        padding: "9px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600,
                        cursor: enabled === null || saving ? "not-allowed" : "pointer",
                        border: "none", color: "#fff", whiteSpace: "nowrap",
                        background: on ? "#dc2626" : "#16a34a",
                        opacity: enabled === null || saving ? 0.6 : 1,
                    }}
                >
                    {enabled === null ? "Loading…" : saving ? "Saving…" : on ? "Turn off" : "Turn on"}
                </button>
            </div>

            {message && (
                <div style={{ marginTop: 12, fontSize: 13, color: isError ? "#dc2626" : "#16a34a" }}>
                    {message}
                </div>
            )}
        </div>
    );
}