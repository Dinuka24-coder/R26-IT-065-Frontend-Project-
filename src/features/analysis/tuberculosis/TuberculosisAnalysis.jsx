import { useState } from "react";
import { predictTuberculosis } from "../../../api/component3Api";
import AnalysisLayout from "../shared/AnalysisLayout";
import PatientSelector from "../shared/PatientSelector";
import ScanUploader from "../shared/ScanUploader";
import ResultCard from "../shared/ResultCard";
import HeatmapCard from "../shared/HeatmapCard";
import { useTbAnalysisStages } from "./useTbAnalysisStages";
import TbAnalyzingPanel from "./TbAnalyzingPanel";
import TbGatekeeperPanel from "./TbGatekeeperPanel";
import TbRejectionPanel from "./TbRejectionPanel";
import TbResultTabs from "./TbResultTabs";

// Component 3 only. Scoped rules that keep the page inside the viewport without
// touching shared components or global CSS (same injection pattern as
// TbScanAnimation.jsx).
const TB_VIEWPORT_CSS = `
.tb-analysis-scope .tb-uploader-cap img { max-height: 34vh; object-fit: contain; }
.tb-analysis-scope .tb-results-tabs img { max-height: 50vh; object-fit: contain; }
`;

export default function TuberculosisAnalysis({ navigate }) {
  const [patientId, setPatientId] = useState("");
  const patientIdForAnalysis = patientId || "anonymous";
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { stages, activeIndex, done, finish } = useTbAnalysisStages(loading);

  function onFile(f) {
    if (!f || !f.type.startsWith("image/"))
      return setError("Please select a valid image file.");
    setError("");
    setFile(f);
    setResult(null);
    const r = new FileReader();
    r.onload = (e) => setPreview(e.target.result);
    r.readAsDataURL(f);
  }

  function clearFile() {
    setFile(null);
    setPreview(null);
    setResult(null);
  }

  async function run() {
    setError("");
    setLoading(true);
    // TODO - remove this after the check
    setPatientId(patientIdForAnalysis);
    setResult(null);
    try {
      setResult(await predictTuberculosis(patientId, file));
    } catch (e) {
      setError(e.message);
    } finally {
      finish();
      setLoading(false);
    }
  }

  const rejected = result?.status === "rejected";
  const isPos = !rejected && result?.diagnosis === "Tuberculosis";
  const predictionLabel = isPos ? "Tuberculosis Detected" : result?.diagnosis;

  const extras =
    result && isPos && result.bounding_box
      ? [
          {
            label: "Localization Box (normalized)",
            value: result.bounding_box.map((n) => n.toFixed(2)).join(", "),
          },
        ]
      : [];

  let resultItems = null;
  if (loading) {
    resultItems = [
      {
        key: "analyzing",
        label: "Analyzing",
        node: (
          <TbAnalyzingPanel
            preview={preview}
            stages={stages}
            activeIndex={activeIndex}
            done={done}
          />
        ),
      },
    ];
  } else if (rejected) {
    resultItems = [
      {
        key: "rejection",
        label: "Rejected",
        node: <TbRejectionPanel result={result} preview={preview} />,
      },
    ];
  } else if (result) {
    resultItems = [
      {
        key: "diagnosis",
        label: "Diagnosis",
        node: (
          <ResultCard
            prediction={predictionLabel}
            confidence={result.confidence_score}
            isPositive={isPos}
            extras={extras}
          />
        ),
      },
      {
        key: "heatmap",
        label: "Heatmap",
        node: (
          <HeatmapCard
            heatmap={result.heatmap_base64}
            title="Grad-CAM Heatmap"
            emptyText="No tuberculosis detected in this scan."
          />
        ),
      },
      {
        key: "gatekeeper",
        label: "Gatekeeper",
        node: <TbGatekeeperPanel result={result} />,
      },
    ];
  }

  return (
    <div className="tb-analysis-scope">
      <style>{TB_VIEWPORT_CSS}</style>
      <AnalysisLayout
        title="Tuberculosis Analysis"
        subtitle="X-ray · Multi-task classification + localization + Grad-CAM"
        navigate={navigate}
        onRun={run}
        canRun={Boolean(patientId && file)}
        loading={loading}
        error={error}
        results={resultItems && <TbResultTabs items={resultItems} />}
      >
        <PatientSelector
          value={patientId}
          onChange={setPatientId}
          navigate={navigate}
        />
        <div className="tb-uploader-cap">
          <ScanUploader preview={preview} onFile={onFile} onClear={clearFile} />
        </div>
      </AnalysisLayout>
    </div>
  );
}
