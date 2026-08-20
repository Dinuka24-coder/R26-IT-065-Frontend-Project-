import { useState } from "react";
import { FileImage, Layers3 } from "lucide-react";
import { predictLungCancer } from "../../../api/component4Api";
import { useTheme } from "../../../context/ThemeContext";
import AnalysisLayout from "../shared/AnalysisLayout";
import PatientSelector from "../shared/PatientSelector";
import ScanUploader from "../shared/ScanUploader";
import ResultCard from "../shared/ResultCard";
import HeatmapCard from "../shared/HeatmapCard";
import PageHeader from "../../../components/ui/PageHeader";
import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";

export default function LungCancerAnalysis({ navigate }) {
  const { t } = useTheme();
  const [viewMode, setViewMode] = useState("png"); // "png" | "dicom"

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
    try { setResult(await predictLungCancer(patientId, file)); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  // FIXED: "Detected"-substring matching was wrong for Component 4 -
  // borrowed from Pneumothorax without verifying against the real
  // response. Component 4's actual prediction classes (confirmed):
  // "normal", "adenocarcinoma", "large.cell.carcinoma",
  // "squamous.cell.carcinoma" - none contain "Detected", so the old
  // logic always evaluated to false, meaning every result (including
  // real cancer detections) would have rendered as Normal/green.
  const isPos = Boolean(result?.prediction && result.prediction !== "normal");
  const extras = result && isPos ? [] : [];

  const modeToggle = (
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <Button variant={viewMode === "png" ? "primary" : "secondary"} onClick={() => setViewMode("png")}>
          <FileImage size={15} /> Image Analysis
        </Button>
        <Button variant={viewMode === "dicom" ? "primary" : "secondary"} onClick={() => setViewMode("dicom")}>
          <Layers3 size={15} /> DICOM CT Viewer
        </Button>
      </div>
  );

  if (viewMode === "dicom") {
    return (
        <div>
          <PageHeader
              title="Lung Cancer Analysis"
              subtitle="DICOM CT · MPR + 3D volume visualization"
              onBack={() => navigate("analysis")}
          />
          {modeToggle}
          <Card style={{ maxWidth: 660 }}>
            <PatientSelector value={patientId} onChange={setPatientId} navigate={navigate} />
            <div style={{ color: t.dim, fontSize: 13, marginTop: 10 }}>
              DICOM file selection and the MPR/3D viewer are wired in across
              the next implementation stages.
            </div>
          </Card>
        </div>
    );
  }

  return (
      <div>
        {modeToggle}
        <AnalysisLayout
            title="Lung Cancer Analysis"
            subtitle="CT Scan · AI detection + Grad-CAM"
            navigate={navigate}
            onRun={run} canRun={Boolean(patientId && file)} loading={loading} error={error}
            results={result && (
                <>
                  <ResultCard prediction={result.prediction} confidence={result.confidence}
                              isPositive={isPos} urgency={result.urgency} extras={extras} />
                  {/* heatmap_url matches the real comp4_service.py response field
                name (not heatmap_base64, which was borrowed unverified from
                the Pneumothorax pattern). NOT YET CONFIRMED: whether this
                field's actual VALUE is a raw base64 string (what HeatmapCard
                requires) or a genuine URL - please verify against one real
                response before treating this as fully correct. */}
                  <HeatmapCard heatmap={result.heatmap_url} title="Grad-CAM Heatmap"
                               emptyText="No malignancy detected in this scan." />
                </>
            )}
        >
          <PatientSelector value={patientId} onChange={setPatientId} navigate={navigate} />
          <ScanUploader preview={preview} onFile={onFile} onClear={clearFile} hint="PNG · JPG" />
        </AnalysisLayout>
      </div>
  );
}