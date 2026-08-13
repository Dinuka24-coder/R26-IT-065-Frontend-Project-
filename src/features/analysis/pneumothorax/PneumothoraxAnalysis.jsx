import { useState } from "react";
import { predictPneumothorax } from "../../../api/component1Api";
import AnalysisLayout from "../shared/AnalysisLayout";
import PatientSelector from "../shared/PatientSelector";
import ScanUploader from "../shared/ScanUploader";
import ResultCard from "../shared/ResultCard";
import HeatmapCard from "../shared/HeatmapCard";

export default function PneumothoraxAnalysis({ navigate }) {
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
    try { setResult(await predictPneumothorax(patientId, file)); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  const isPos = Boolean(result?.prediction?.includes("Detected"));

  const extras = result && isPos ? [
    ...(result.affected_lung_pct > 0 ? [{ label: "Affected Lung Area", value: `${result.affected_lung_pct}%` }] : []),
    { label: "Pleural Separation", value: result.pleural_separation ? "Detected" : "Not detected" },
    ...(result.segmented_area_pct > 0 ? [{ label: "Segmented Region", value: `${result.segmented_area_pct}%` }] : []),
  ] : [];

  return (
    <AnalysisLayout
      title="Pneumothorax Analysis"
      subtitle="X-ray · EfficientNetB0 + Boundary-Aware Grad-CAM"
      navigate={navigate}
      onRun={run} canRun={Boolean(patientId && file)} loading={loading} error={error}
      results={result && (
        <>
          <ResultCard prediction={result.prediction} confidence={result.confidence}
            isPositive={isPos} urgency={result.urgency} extras={extras} />
          <HeatmapCard heatmap={result.heatmap_base64}
            title="Boundary-Aware Grad-CAM"
            caption="Cyan outline marks the lung-constrained pleural boundary"
            emptyText="No pneumothorax detected in this scan." />
        </>
      )}
    >
      <PatientSelector value={patientId} onChange={setPatientId} navigate={navigate} />
      <ScanUploader preview={preview} onFile={onFile} onClear={clearFile} />
    </AnalysisLayout>
  );
}
