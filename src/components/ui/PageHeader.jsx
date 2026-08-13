import { ArrowLeft } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

export default function PageHeader({ title, subtitle, actions, onBack }) {
  const { t } = useTheme();
  return (
    <div style={{ marginBottom: 24 }}>
      {onBack && (
        <button onClick={onBack} style={{
          display: "flex", gap: 6, alignItems: "center", border: "none",
          background: "transparent", color: t.dim, fontSize: 13, fontWeight: 600,
          cursor: "pointer", marginBottom: 10, padding: 0,
        }}>
          <ArrowLeft size={15} /> Back
        </button>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 4 }}>{title}</h1>
          {subtitle && <p style={{ color: t.dim, fontSize: 14 }}>{subtitle}</p>}
        </div>
        <div style={{ display: "flex", gap: 10 }}>{actions}</div>
      </div>
    </div>
  );
}
