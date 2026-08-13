import { useTheme } from "../../context/ThemeContext";

export default function Pill({ tone = "info", children }) {
  const { t } = useTheme();
  const tones = {
    success: { bg: "rgba(34,197,94,0.14)", fg: "#22c55e" },
    danger:  { bg: "rgba(239,68,68,0.14)", fg: "#ef4444" },
    warning: { bg: "rgba(245,158,11,0.14)", fg: "#f59e0b" },
    info:    { bg: t.accentSoft, fg: t.accent },
  };
  const c = tones[tone] || tones.info;
  return (
    <span style={{ background: c.bg, color: c.fg, fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}
