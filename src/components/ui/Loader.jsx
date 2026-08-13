import { useTheme } from "../../context/ThemeContext";

export default function Loader({ label = "Loading…" }) {
  const { t } = useTheme();
  return (
    <div style={{ display: "grid", placeItems: "center", padding: 60, color: t.dim, fontSize: 14 }}>
      <div style={{
        width: 30, height: 30, borderRadius: "50%",
        border: `3px solid ${t.border}`, borderTopColor: t.accent,
        animation: "spin 0.8s linear infinite", marginBottom: 12,
      }} />
      {label}
    </div>
  );
}
