import { useState } from "react";
import { predictPneumonia } from "../../../api/component2Api";
import AnalysisLayout from "../shared/AnalysisLayout";
import PatientSelector from "../shared/PatientSelector";
import ScanUploader from "../shared/ScanUploader";
import ResultCard from "../shared/ResultCard";
import HeatmapCard from "../shared/HeatmapCard";

export default function PneumoniaAnalysis({ navigate }) {
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
      setResult(await predictPneumonia(patientId, file));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const isPos = Boolean(
    result?.prediction?.toUpperCase().includes("DETECTED") ||
    result?.prediction?.toUpperCase().includes("PNEUMONIA") ||
    result?.diagnosis?.toUpperCase().includes("PNEUMONIA")
  );

  const extras = result && isPos ? [
    ...(result.severity ? [{ label: "Severity", value: result.severity }] : []),
    ...(result.affected_area_percent !== undefined && Number(result.affected_area_percent) > 0
      ? [{ label: "Affected Lung Area", value: `${result.affected_area_percent}%` }]
      : []),
    ...(result.mean_intensity !== undefined && Number(result.mean_intensity) > 0
      ? [{ label: "Activation Intensity", value: `${result.mean_intensity}` }]
      : []),
  ] : [];

  return (
    <AnalysisLayout
      title="Pneumonia Analysis"
      subtitle="X-ray · MobileNetV2 + Grad-CAM"
      navigate={navigate}
      onRun={run} canRun={Boolean(patientId && file)} loading={loading} error={error}
      results={result && (
        <>
          <ResultCard prediction={result.prediction} confidence={result.confidence}
            isPositive={isPos} urgency={result.urgency} extras={extras} />
          <HeatmapCard heatmap={result.heatmap_base64} title="Grad-CAM Heatmap"
            caption="Grad-CAM activation overlay highlighting pneumonia-affected regions"
            emptyText="No pneumonia detected in this scan." />
        </>
      )}
    >
      <PatientSelector value={patientId} onChange={setPatientId} navigate={navigate} />
      <ScanUploader preview={preview} onFile={onFile} onClear={clearFile} />
    </AnalysisLayout>
  );
}
