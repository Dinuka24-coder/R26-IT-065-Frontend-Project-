import { CheckCircle } from "lucide-react";
import { useTheme } from "../../../context/ThemeContext";
import Card from "../../../components/ui/Card";
import SectionLabel from "../../../components/ui/SectionLabel";

export default function HeatmapCard({ heatmap, title = "Grad-CAM Heatmap", caption, emptyText = "No abnormality detected in this scan." }) {
  const { t } = useTheme();

  if (!heatmap) {
    return (
      <Card style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <CheckCircle size={22} color="#22c55e" />
        <div>
          <div style={{ fontWeight: 600 }}>No region highlighting required</div>
          <div style={{ fontSize: 13, color: t.dim }}>{emptyText}</div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <SectionLabel>{title}</SectionLabel>
      <img src={`data:image/png;base64,${heatmap}`} alt={title} style={{ width: "100%", borderRadius: 10, display: "block" }} />
      <div style={{ marginTop: 10, fontSize: 12, color: t.dim, textAlign: "center" }}>
        <span style={{ color: "#0000ff" }}>■</span> Low &nbsp;
        <span style={{ color: "#00ff00" }}>■</span> Medium &nbsp;
        <span style={{ color: "#ffff00" }}>■</span> High &nbsp;
        <span style={{ color: "#ff0000" }}>■</span> Very High
      </div>
      {caption && <div style={{ marginTop: 8, fontSize: 12, color: t.dim, textAlign: "center" }}>{caption}</div>}
    </Card>
  );
}
