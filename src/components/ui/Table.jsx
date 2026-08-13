import { useTheme } from "../../context/ThemeContext";

export default function Table({ head, rows, empty = "No records" }) {
  const { t } = useTheme();
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={i} style={{
                textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700,
                letterSpacing: "0.06em", color: t.dim, textTransform: "uppercase",
                borderBottom: `1px solid ${t.border}`, whiteSpace: "nowrap",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} style={{ padding: "12px", borderBottom: `1px solid ${t.border}` }}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div style={{ textAlign: "center", padding: 30, color: t.dim, fontSize: 14 }}>{empty}</div>
      )}
    </div>
  );
}
