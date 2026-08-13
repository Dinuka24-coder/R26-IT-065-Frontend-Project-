import { ChevronRight } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { COMPONENTS } from "../../utils/constants";
import PageHeader from "../../components/ui/PageHeader";

export default function AnalysisHubPage({ navigate }) {
  const { t } = useTheme();
  return (
    <div>
      <PageHeader title="AI Analysis" subtitle="Select a diagnostic component to run" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        {COMPONENTS.map((c) => (
          <button key={c.id} onClick={() => navigate(c.route)}
            style={{
              background: t.card, border: `1px solid ${t.border}`, borderLeft: `4px solid ${c.accent}`,
              borderRadius: 14, padding: 20, textAlign: "left", cursor: "pointer",
              color: t.text, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
            }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 17 }}>{c.label}</div>
              <div style={{ fontSize: 13, color: t.dim, marginTop: 4 }}>{c.scan} · AI detection + Grad-CAM</div>
            </div>
            <ChevronRight size={20} color={t.dim} />
          </button>
        ))}
      </div>
    </div>
  );
}
