import { useState } from "react";
// TODO (Pneumonia owner): uncomment when your backend is ready
// import { predictPneumonia } from "../../../api/component2Api";
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
      // TODO: replace the line below with your real call
      // setResult(await predictPneumonia(patientId, file));
      setError("Pneumonia backend is not connected yet.");
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  const isPos = Boolean(result?.prediction?.includes("Detected"));

  // TODO: add your component-specific result fields here
  const extras = result && isPos ? [
    // { label: "Severity", value: result.severity },
  ] : [];

  return (
    <AnalysisLayout
      title="Pneumonia Analysis"
      subtitle="X-ray · AI detection + Grad-CAM"
      navigate={navigate}
      onRun={run} canRun={Boolean(patientId && file)} loading={loading} error={error}
      results={result && (
        <>
          <ResultCard prediction={result.prediction} confidence={result.confidence}
            isPositive={isPos} urgency={result.urgency} extras={extras} />
          <HeatmapCard heatmap={result.heatmap_base64} title="Grad-CAM Heatmap"
            emptyText="No pneumonia detected in this scan." />
        </>
      )}
    >
      <PatientSelector value={patientId} onChange={setPatientId} navigate={navigate} />
      <ScanUploader preview={preview} onFile={onFile} onClear={clearFile} />
    </AnalysisLayout>
  );
}
