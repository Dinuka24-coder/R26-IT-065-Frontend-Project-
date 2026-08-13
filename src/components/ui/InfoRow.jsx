import { useTheme } from "../../context/ThemeContext";

export default function InfoRow({ label, value, last }) {
  const { t } = useTheme();
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", gap: 16,
      padding: "9px 0", borderBottom: last ? "none" : `1px solid ${t.border}`, fontSize: 14,
    }}>
      <span style={{ color: t.dim }}>{label}</span>
      <strong style={{ fontWeight: 600, textAlign: "right" }}>{value ?? "—"}</strong>
    </div>
  );
}
