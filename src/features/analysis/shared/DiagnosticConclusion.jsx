import { Clock, AlertTriangle } from "lucide-react";
import { useTheme } from "../../../context/ThemeContext";
import Card from "../../../components/ui/Card";
import Pill from "../../../components/ui/Pill";

export default function DiagnosticConclusion({
                                                 verdict, isPositive, confidence, summary, severity, severityNote,
                                             }) {
    const { t } = useTheme();
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    return (
        <Card style={{ borderLeft: `4px solid ${isPositive ? "#ef4444" : "#22c55e"}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 11, fontWeight: 700,
                    letterSpacing: "0.08em", color: t.dim, textTransform: "uppercase" }}>
                    Diagnostic Conclusion
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 500, letterSpacing: 0 }}>
            <Clock size={12} /> {time}
          </span>
                </div>
                <Pill tone={isPositive ? "danger" : "success"}>
                    {isPositive ? "Positive" : "Negative"}
                </Pill>
            </div>

            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em",
                color: isPositive ? "#ef4444" : "#22c55e", marginBottom: 6 }}>
                {verdict}
            </div>
            {summary && <div style={{ fontSize: 14, color: t.dim, marginBottom: 18, lineHeight: 1.5 }}>{summary}</div>}

            <div style={{ background: t.bg, borderRadius: 10, padding: "14px 16px", marginBottom: severity ? 14 : 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: t.dim }}>Statistical Confidence</span>
                    <strong style={{ fontSize: 18, fontWeight: 800 }}>{confidence}%</strong>
                </div>
                <div style={{ height: 6, background: t.border, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{
                        width: `${confidence}%`, height: "100%",
                        background: "linear-gradient(90deg, #2563eb 0%, #8b5cf6 55%, #ef4444 100%)",
                        transition: "width 0.6s ease",
                    }} />
                </div>
            </div>

            {severity && (
                <div style={{
                    display: "flex", gap: 11, alignItems: "flex-start", padding: "13px 15px",
                    borderRadius: 10, background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.25)",
                }}>
                    <AlertTriangle size={17} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#ef4444" }}>Severity: {severity}</div>
                        {severityNote && <div style={{ fontSize: 13, color: t.dim, marginTop: 3 }}>{severityNote}</div>}
                    </div>
                </div>
            )}
        </Card>
    );
}