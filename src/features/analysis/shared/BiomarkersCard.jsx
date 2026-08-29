import { Layers } from "lucide-react";
import { useTheme } from "../../../context/ThemeContext";
import Card from "../../../components/ui/Card";

export default function BiomarkersCard({ metrics = [], synthesis }) {
    const { t } = useTheme();
    if (!metrics.length) return null;

    return (
        <Card>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16,
                fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
                color: t.dim, textTransform: "uppercase" }}>
                <Layers size={14} color={t.accent} /> Grad-CAM Attention Biomarkers
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
                {metrics.map((m) => (
                    <div key={m.label} style={{ background: t.bg, borderRadius: 10, padding: "14px 16px" }}>
                        <div style={{ fontSize: 12, color: t.dim, marginBottom: 6 }}>{m.label}</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: m.color || "#ef4444", letterSpacing: "-0.01em" }}>
                            {m.value}
                        </div>
                        {m.sub && <div style={{ fontSize: 11, color: t.dim, marginTop: 3 }}>{m.sub}</div>}
                    </div>
                ))}
            </div>

            {synthesis && (
                <div style={{ marginTop: 14, padding: "13px 15px", background: t.bg,
                    borderRadius: 10, fontSize: 13, lineHeight: 1.55 }}>
                    <strong>AI Synthesis: </strong>
                    <span style={{ color: t.dim }}>{synthesis}</span>
                </div>
            )}
        </Card>
    );
}