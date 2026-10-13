import { FileX2, AlertTriangle } from "lucide-react";
import { useTheme } from "../../../context/ThemeContext";
import Card from "../../../components/ui/Card";
import SectionLabel from "../../../components/ui/SectionLabel";
import TbGatekeeperRows from "./TbGatekeeperRows";

// Component 3 (Tuberculosis) only. Shown on the right when the gatekeeper turns
// an upload away (result.status === "rejected"). Explains *why* the scan was not
// analyzed, shows the gatekeeper metrics, and gives image-acquisition guidance.

const NOT_CXR_TIPS = [
  "Upload a frontal (PA or AP) chest radiograph.",
  "Use the real X-ray image file — not a photo of a screen or a report page.",
  "Keep both lung fields fully inside the frame.",
];

const LOW_QUALITY_TIPS = [
  "Re-export or re-take the film without motion blur.",
  "Correct the exposure — the image should not be too dark or washed out.",
  "Keep the patient upright and unrotated.",
  "Include both lung apices and both costophrenic angles.",
];

export default function TbRejectionPanel({ result, preview }) {
  const { t } = useTheme();
  if (!result) return null;

  const notCxr = result.is_cxr === false;
  const lowQuality = result.is_cxr === true;

  const accent = notCxr ? "#ef4444" : lowQuality ? "#f59e0b" : "#ef4444";
  const Icon = notCxr ? FileX2 : AlertTriangle;
  const heading = notCxr
    ? "Not a chest X-ray"
    : lowQuality
    ? "Image quality too low"
    : "Scan not accepted";
  const tips = notCxr ? NOT_CXR_TIPS : LOW_QUALITY_TIPS;

  return (
    <Card style={{ borderLeft: `4px solid ${accent}` }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <Icon size={22} color={accent} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: accent }}>
            {heading}
          </div>
          <div style={{ fontSize: 13, color: t.dim, marginTop: 4 }}>
            This upload was not analyzed for tuberculosis.
          </div>
          {result.message && (
            <div style={{ fontSize: 13, color: t.text, marginTop: 8, lineHeight: 1.5 }}>
              {result.message}
            </div>
          )}
        </div>
      </div>

      {preview && (
        <div style={{ marginTop: 16 }}>
          <img
            src={preview}
            alt="Rejected upload"
            style={{
              maxHeight: 160,
              maxWidth: "100%",
              borderRadius: 8,
              display: "block",
              filter: "grayscale(0.3)",
              opacity: 0.75,
              border: `1px solid ${t.border}`,
            }}
          />
          <div style={{ fontSize: 11, color: t.dim, marginTop: 6 }}>
            Rejected upload
          </div>
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        <SectionLabel>Gatekeeper detail</SectionLabel>
        <TbGatekeeperRows result={result} />
      </div>

      <div style={{ marginTop: 18 }}>
        <SectionLabel>How to get an acceptable scan</SectionLabel>
        <ul
          style={{
            margin: 0,
            paddingLeft: 18,
            fontSize: 13,
            color: t.text,
            lineHeight: 1.7,
          }}
        >
          {tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
