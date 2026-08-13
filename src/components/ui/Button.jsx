import { useTheme } from "../../context/ThemeContext";

export default function Button({ children, onClick, variant = "primary", disabled, full, style = {}, title }) {
  const { t } = useTheme();
  const variants = {
    primary:   { background: t.accent, color: "#fff", border: "none" },
    secondary: { background: "transparent", color: t.text, border: `1px solid ${t.border}` },
    danger:    { background: "rgba(239,68,68,0.14)", color: "#ef4444", border: "none" },
  };
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      style={{
        display: "inline-flex", gap: 7, alignItems: "center",
        justifyContent: full ? "center" : "flex-start",
        padding: "10px 16px", borderRadius: 9, fontSize: 14, fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
        width: full ? "100%" : "auto", transition: "opacity 0.15s",
        ...variants[variant], ...style,
      }}>
      {children}
    </button>
  );
}
