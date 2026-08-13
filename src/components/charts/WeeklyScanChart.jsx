import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useTheme } from "../../context/ThemeContext";

export default function WeeklyScanChart({ data = [] }) {
  const { t } = useTheme();

  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -22, bottom: 0 }}>
          <defs>
            <linearGradient id="xrayGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="ctGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={t.grid} vertical={false} />
          <XAxis dataKey="day" stroke={t.dim} fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke={t.dim} fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 10, fontSize: 13, color: t.text }}
            labelStyle={{ color: t.text, fontWeight: 600 }} />
          <Legend wrapperStyle={{ fontSize: 12, color: t.dim }} iconType="circle" iconSize={8} />
          <Area type="monotone" dataKey="xray" name="X-ray" stroke="#3b82f6" strokeWidth={2.5} fill="url(#xrayGrad)" />
          <Area type="monotone" dataKey="ct" name="CT Scan" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#ctGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
