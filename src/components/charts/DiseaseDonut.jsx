import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useTheme } from "../../context/ThemeContext";

export default function DiseaseDonut({ data = [] }) {
  const { t } = useTheme();

  if (!data.length) {
    return <div style={{ color: t.dim, fontSize: 14, padding: "40px 0", textAlign: "center" }}>No prediction data yet</div>;
  }

  return (
    <div>
      <div style={{ width: "100%", height: 180 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%"
                 innerRadius={48} outerRadius={78} paddingAngle={2} stroke="none">
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
            <Tooltip contentStyle={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 10, fontSize: 13, color: t.text }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div style={{ marginTop: 14 }}>
        {data.map((d) => (
          <div key={d.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 0", fontSize: 13 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 9, height: 9, borderRadius: 2, background: d.color }} />
              <span>{d.name}</span>
            </span>
            <strong style={{ fontWeight: 700 }}>{d.percent}%</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
