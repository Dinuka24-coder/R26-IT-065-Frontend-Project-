import { Sparkles, ShieldAlert } from "lucide-react";
import { useTheme } from "../../../context/ThemeContext";
import Card from "../../../components/ui/Card";

export default function ClinicalGuidance({ steps = [], alert }) {
    const { t } = useTheme();
    if (!steps.length) return null;

    return (
        <Card>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16,
                fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
                color: t.dim, textTransform: "uppercase" }}>
                <Sparkles size={14} color={t.accent} /> Next Steps &amp; Clinical Guidance
            </div>

            <div style={{ display: "grid", gap: 9 }}>
                {steps.map((s, i) => (
                    <div key={i} style={{
                        display: "flex", gap: 12, padding: "12px 15px",
                        background: t.bg, borderRadius: 9, fontSize: 13, lineHeight: 1.5,
                    }}>
                        <span style={{ color: t.dim, fontWeight: 600, flexShrink: 0 }}>{i + 1}.</span>
                        <span>{s}</span>
                    </div>
                ))}
            </div>

            {alert && (
                <div style={{
                    display: "flex", gap: 10, alignItems: "center", marginTop: 14,
                    padding: "12px 15px", borderRadius: 9,
                    background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
                    fontSize: 13, color: "#ef4444", fontWeight: 600,
                }}>
                    <ShieldAlert size={16} style={{ flexShrink: 0 }} /> {alert}
                </div>
            )}

            <div style={{ marginTop: 12, fontSize: 11, color: t.dim, lineHeight: 1.5 }}>
                Decision support only. All findings require confirmation by a qualified clinician.
            </div>
        </Card>
    );
}