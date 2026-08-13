import { useTheme } from "../../../context/ThemeContext";
import Card from "../../../components/ui/Card";
import Pill from "../../../components/ui/Pill";
import ConfidenceBar from "../../../components/ui/ConfidenceBar";
import { URGENCY_COLORS } from "../../../utils/constants";

export default function ResultCard({ prediction, confidence, isPositive, urgency, extras = [] }) {
  const { t } = useTheme();
  return (
    <Card style={{ borderLeft: `4px solid ${isPositive ? "#ef4444" : "#22c55e"}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: t.dim, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>Diagnosis</span>
        <Pill tone={isPositive ? "danger" : "success"}>{isPositive ? "Positive" : "Normal"}</Pill>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: isPositive ? "#ef4444" : "#22c55e", marginBottom: 14 }}>{prediction}</div>
      <div style={{ display: "grid", gap: 11 }}>
        <div>
          <div style={{ fontSize: 12, color: t.dim, marginBottom: 5 }}>Confidence</div>
          <ConfidenceBar value={confidence} status={isPositive ? "Positive" : "Normal"} />
        </div>
        {urgency && (
          <Row t={t} label="Urgency"><strong style={{ color: URGENCY_COLORS[urgency] }}>{urgency}</strong></Row>
        )}
        {extras.map(({ label, value }) => (
          <Row key={label} t={t} label={label}><strong>{value}</strong></Row>
        ))}
      </div>
    </Card>
  );
}

function Row({ t, label, children }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
      <span style={{ color: t.dim }}>{label}</span>{children}
    </div>
  );
}
