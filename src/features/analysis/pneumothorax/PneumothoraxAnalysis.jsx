import { useState } from "react";
import { ScanLine, CheckCircle } from "lucide-react";
import { useTheme } from "../../../context/ThemeContext";
import { predictPneumothorax } from "../../../api/component1Api";
import PageHeader from "../../../components/ui/PageHeader";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import PatientSelector from "../shared/PatientSelector";
import ScanUploader from "../shared/ScanUploader";
import HeatmapViewer from "../shared/HeatmapViewer";
import DiagnosticConclusion from "../shared/DiagnosticConclusion";
import BiomarkersCard from "../shared/BiomarkersCard";
import ClinicalGuidance from "../shared/ClinicalGuidance";

const GUIDANCE = {
  High: [
    "Urgent physician assessment required — check oxygenation, respiratory rate, and haemodynamic stability.",
    "Evaluate for immediate needle decompression or chest tube placement per institutional protocol.",
    "Obtain confirmatory upright chest radiograph or CT before intervention where time allows.",
  ],
  Moderate: [
    "Physician review recommended within the current shift.",
    "Consider serial imaging to assess for progression.",
    "Monitor oxygen saturation and symptom development.",
  ],
  Low: [
    "Routine radiologist review recommended.",
    "Correlate with clinical presentation and patient history.",
    "Repeat imaging if symptoms develop or worsen.",
  ],
};

const SEVERITY_NOTE = {
  High:     "Large pneumothorax — risk of tension physiology",
  Moderate: "Moderate collapse — close monitoring indicated",
  Low:      "Small pneumothorax — conservative management may apply",
};

export default function PneumothoraxAnalysis({ navigate }) {
  const { t } = useTheme();
  const [patientId, setPatientId] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function onFile(f) {
    if (!f || !f.type.startsWith("image/")) return setError("Please select a valid image file.");
    setError(""); setFile(f); setResult(null);
    const r = new FileReader();
    r.onload = (e) => setPreview(e.target.result);
    r.readAsDataURL(f);
  }

  function clearFile() { setFile(null); setPreview(null); setResult(null); }

  async function run() {
    setError(""); setLoading(true); setResult(null);
    try {
      setResult(await predictPneumothorax(patientId, file));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const isPos   = Boolean(result?.prediction?.includes("Detected"));
  const urgency = result?.urgency || "Low";

  const metrics = result && isPos ? [
    ...(result.affected_lung_pct > 0 ? [{
      label: "Attention Coverage", value: `${result.affected_lung_pct}%`,
      sub: "of lung field",
    }] : []),
    ...(result.boundary_length_pct > 0 ? [{
      label: "Boundary Extent", value: `${result.boundary_length_pct}%`,
      sub: "of image area", color: "#f59e0b",
    }] : []),
    ...(result.segmented_area_pct > 0 ? [{
      label: "Segmented Region", value: `${result.segmented_area_pct}%`,
      sub: "U-Net enhancement", color: "#8b5cf6",
    }] : []),
    {
      label: "Pleural Separation",
      value: result.pleural_separation ? "Present" : "Absent",
      sub: "boundary detected",
      color: result.pleural_separation ? "#ef4444" : "#22c55e",
    },
  ] : [];

  const synthesis = result && isPos
      ? `Attention is constrained to the lung fields and covers ${result.affected_lung_pct ?? "—"}% of that region. ` +
      `The cyan contour marks where model attention drops off, indicating the likely pleural boundary. ` +
      `Toggle to Standard Grad-CAM above to compare.`
      : null;

  return (
      <div>
        <PageHeader
            title="Pneumothorax Analysis"
            subtitle="Chest Radiograph · EfficientNetB0 + Boundary-Aware Grad-CAM"
            onBack={() => navigate("analysis")}
        />

        <div style={{
          display: "grid",
          gridTemplateColumns: result ? "minmax(320px, 1fr) minmax(340px, 1.15fr)" : "1fr",
          gap: 18, alignItems: "start", maxWidth: result ? "none" : 660,
        }}>
          {/* ── LEFT: input + scan ─────────────────────────────── */}
          <Card>
            <PatientSelector value={patientId} onChange={setPatientId} navigate={navigate} />

            {result?.heatmap_base64 ? (
                <HeatmapViewer
                    originalPreview={preview}
                    heatmap={result.heatmap_base64}
                    standardHeatmap={result.standard_heatmap_base64}
                    modelName="EfficientNetB0"
                    onClear={clearFile}
                />
            ) : (
                <ScanUploader preview={preview} onFile={onFile} onClear={clearFile} />
            )}

            {error && <div style={{ marginTop: 14, color: "#ef4444", fontSize: 13 }}>{error}</div>}

            <div style={{ marginTop: 18 }}>
              <Button onClick={run} disabled={!patientId || !file || loading} full>
                <ScanLine size={15} /> {loading ? "Analyzing…" : "Run AI Analysis"}
              </Button>
            </div>
          </Card>

          {/* ── RIGHT: results ─────────────────────────────────── */}
          {result && (
              <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
                <DiagnosticConclusion
                    verdict={isPos ? "PNEUMOTHORAX DETECTED" : "NO PNEUMOTHORAX"}
                    isPositive={isPos}
                    confidence={result.confidence}
                    summary={isPos
                        ? `Pleural line pattern detected with ${result.confidence}% statistical certainty.`
                        : "No pleural separation pattern identified in this radiograph."}
                    severity={isPos ? urgency : null}
                    severityNote={isPos ? SEVERITY_NOTE[urgency] : null}
                />

                {isPos && <BiomarkersCard metrics={metrics} synthesis={synthesis} />}

                {isPos ? (
                    <ClinicalGuidance
                        steps={GUIDANCE[urgency]}
                        alert={urgency === "High"
                            ? "Urgent clinical review required — escalate if patient is unstable."
                            : null}
                    />
                ) : (
                    <Card style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <CheckCircle size={22} color="#22c55e" />
                      <div>
                        <div style={{ fontWeight: 600 }}>No region highlighting required</div>
                        <div style={{ fontSize: 13, color: t.dim }}>
                          No pneumothorax detected — attention mapping was not generated.
                        </div>
                      </div>
                    </Card>
                )}
              </div>
          )}
        </div>
      </div>
  );
}