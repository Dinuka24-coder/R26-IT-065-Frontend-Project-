import { useTheme } from "../../context/ThemeContext";

export default function ConfidenceBar({ value = 0, status }) {
  const { t } = useTheme();
  const color = status === "Positive" ? "#ef4444" : "#22c55e";
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 70, height: 5, background: t.border, borderRadius: 3, overflow: "hidden", flexShrink: 0 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, transition: "width 0.5s ease" }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{Math.round(pct)}%</span>
    </div>
  );
}
