import { useTheme } from "../../context/ThemeContext";
import Card from "./Card";

export default function StatCard({ label, value, sub, icon: Icon }) {
  const { t } = useTheme();
  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: 13, color: t.dim }}>{label}</span>
        {Icon && (
          <div style={{ width: 34, height: 34, borderRadius: 8, background: t.accentSoft, display: "grid", placeItems: "center" }}>
            <Icon size={16} color={t.accent} />
          </div>
        )}
      </div>
      <div style={{ fontSize: 30, fontWeight: 800, margin: "10px 0 2px", letterSpacing: "-0.02em" }}>{value}</div>
      <div style={{ fontSize: 12, color: t.dim }}>{sub}</div>
    </Card>
  );
}
