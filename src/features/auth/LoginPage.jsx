import { useState } from "react";
import { Activity, Shield, ScanLine } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email || !password) return setError("Enter your email and password.");
    setError(""); setLoading(true);
    try { await signIn(email, password); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  const onEnter = (e) => e.key === "Enter" && submit();

  return (
    <div style={{ display: "flex", minHeight: "100vh", flexWrap: "wrap" }}>
      <div style={{ flex: "1 1 420px", background: "#0a1628", color: "#fff", padding: "56px 60px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 40 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "#2563eb", display: "grid", placeItems: "center" }}>
            <Activity size={22} color="#fff" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 20 }}>PulmoAI</span>
        </div>
        <h1 style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: 18, maxWidth: 520 }}>
          Multi-Model Pulmonary Disease Detection
        </h1>
        <p style={{ color: "#94a3b8", fontSize: 15, maxWidth: 480, lineHeight: 1.6, marginBottom: 40 }}>
          A clinical decision support dashboard for doctors and administrators to analyze chest X-rays and CT scans from one workspace.
        </p>
        {[[Shield, "Doctor / Admin controlled access"],
          [ScanLine, "4 AI components — X-ray & CT"],
          [Activity, "Hospital-grade dashboard workflow"]].map(([Icon, txt], i) => (
          <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(37,99,235,0.15)", display: "grid", placeItems: "center" }}>
              <Icon size={16} color="#60a5fa" />
            </div>
            <span style={{ fontSize: 14, color: "#cbd5e1" }}>{txt}</span>
          </div>
        ))}
      </div>

      <div style={{ flex: "1 1 420px", background: "#f8fafc", display: "grid", placeItems: "center", padding: 40 }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>Welcome back</h2>
          <p style={{ color: "#64748b", fontSize: 14, marginBottom: 32 }}>Sign in to your PulmoAI account</p>

          <label style={lbl}>Email Address</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={onEnter} style={inp} autoComplete="username" />

          <label style={{ ...lbl, marginTop: 18, display: "block" }}>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={onEnter} style={inp} autoComplete="current-password" />

          {error && (
            <div style={{ marginTop: 16, padding: "10px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, color: "#dc2626", fontSize: 13 }}>
              {error}
            </div>
          )}

          <button onClick={submit} disabled={loading} style={{
            width: "100%", padding: 13, marginTop: 24, borderRadius: 10, border: "none",
            background: "#2563eb", color: "#fff", fontSize: 15, fontWeight: 700,
            cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1,
          }}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
          <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 20, textAlign: "center", lineHeight: 1.5 }}>
            Forgot your password? Contact your system administrator to have it reset.
          </p>
        </div>
      </div>
    </div>
  );
}

const lbl = { fontSize: 13, fontWeight: 600, color: "#334155" };
const inp = { width: "100%", padding: "12px 14px", marginTop: 6, borderRadius: 10, border: "1px solid #cbd5e1", fontSize: 14, color: "#0f172a", background: "#fff" };
