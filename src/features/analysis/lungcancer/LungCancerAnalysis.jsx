import "./lungcancer.css";
import { useState, lazy, Suspense } from "react";
import { FileImage, Layers3, AlertTriangle, Loader } from "lucide-react";
import { predictLungCancer } from "../../../api/component4Api";
import { useTheme } from "../../../context/ThemeContext";
import AnalysisLayout from "../shared/AnalysisLayout";
import PatientSelector from "../shared/PatientSelector";
import ScanUploader from "../shared/ScanUploader";
import PageHeader from "../../../components/ui/PageHeader";
import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";
import DicomFileSelector from "./DicomFileSelector";
// Component-4-specific result presentation (Prediction Information
// panel: prediction, confidence, class probabilities, View Grad-CAM
// toggle) - deliberately SEPARATE from the shared ResultCard.jsx used
// by Components 1-3, which is NOT imported or modified here at all.
// GradCamImage (the real fix for heatmap_url being a relative path,
// not base64) now lives inside LungResultCard.jsx, toggled via its own
// "View Grad-CAM" button rather than always rendered.
import LungResultCard from "./LungResultCard";
// Lazy-loaded: these import @cornerstonejs/core, which transitively
// requires @kitware/vtk.js -> xmlbuilder2 -> Node's events module -
// evaluating that chain eagerly (via a static import) was crashing the
// app on EVERY page load, including the login page, before any user was
// authenticated (confirmed root cause: App.jsx statically imports this
// file at the top level, unconditionally, regardless of which page is
// actually shown). Code-splitting these into separate chunks means
// Cornerstone is only fetched/evaluated once the user actually opens
// the DICOM CT Viewer.
const DicomViewerPage = lazy(() => import("./DicomViewerPage"));
const VolumeViewerPage = lazy(() => import("./VolumeViewerPage"));

// Small loading state shown while the lazy-loaded DICOM viewer chunk
// (and its Cornerstone dependency tree) is being fetched/evaluated -
// only reached after the user explicitly opens the DICOM CT Viewer.
function DicomLoadingFallback({ t }) {
    return (
        <div style={{ textAlign: "center", padding: 48, color: t.dim }}>
            <Loader size={28} className="spin" />
            <div style={{ marginTop: 10, fontSize: 13 }}>Loading DICOM viewer...</div>
        </div>
    );
}

// Component 4 (Lung Cancer) orchestrator. Follows the EXACT patient-ID
// flow already used by Pneumothorax (src/features/analysis/pneumothorax/
// PneumothoraxAnalysis.jsx) - PatientSelector's onChange gives the raw
// patient "id" string directly, stored here, passed straight into the
// API calls. No second patient-selection mechanism.
//
// Internally offers two sub-flows under the SAME page-key
// ("analysis-lungcancer", already registered in App.jsx - unmodified):
//   "png"   - existing PNG/JPG prediction template, using the shared
//             ScanUploader/LungResultCard/AnalysisLayout exactly
//             as Pneumothorax already does.
//   "dicom" - Component-4-specific DICOM CT flow, with its own internal
//             sub-navigation (dicomSubView) rather than a separate
//             top-level route:
//               "select" - DicomFileSelector (patient must be chosen first)
//               "2d"     - DicomViewerPage (slice scroll, window/level,
//                          analyze-current-slice)
//               "3d"     - VolumeViewerPage (MPR Axial/Coronal/Sagittal +
//                          VOLUME_3D, reached from DicomViewerPage's
//                          "Open 3D Volume Viewer" button)
//               "result" - DICOM slice analysis result (from
//                          DicomViewerPage's "Analyze Current Slice"),
//                          shown inline via the SAME LungResultCard
//                          the PNG flow uses - no separate results page
//                          exists in this architecture.
export default function LungCancerAnalysis({ navigate }) {
    const { t } = useTheme();
    const [viewMode, setViewMode] = useState("png"); // "png" | "dicom"

    // --- Shared across both sub-flows: ONE patient selection ---------------
    const [patientId, setPatientId] = useState("");

    // --- PNG/JPG sub-flow state - unchanged from Stage 1 --------------------
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

    // "normal" vs the three real cancer subtypes - confirmed in Stage 1's
    // correction. Reused identically below for the DICOM analysis result,
    // so both sub-flows classify positive/negative the same way.
    function isPositiveResult(r) {
        return Boolean(r?.prediction && r.prediction !== "normal");
    }

    const isPos = isPositiveResult(result);
    const extras = result && isPos ? [] : [];

    // --- DICOM sub-flow state ------------------------------------------------
    const [dicomSubView, setDicomSubView] = useState("select"); // "select" | "2d" | "3d" | "result"
    const [dicomInfo, setDicomInfo] = useState(null); // real inspectDicom() result
    const [dicomAnalysisResult, setDicomAnalysisResult] = useState(null); // { result, fileName, previewUrl }

    function handleDicomInspected(inspectResult) {
        setDicomInfo(inspectResult);
        setDicomSubView("2d");
    }

    function handleDicomAnalysisResult(payload) {
        setDicomAnalysisResult(payload);
        setDicomSubView("result");
    }

    function resetDicomFlow() {
        setDicomInfo(null);
        setDicomAnalysisResult(null);
        setDicomSubView("select");
    }

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
        // --- 3D volume viewer - reached from the 2D viewer's button ----------
        if (dicomSubView === "3d") {
            return (
                <Suspense fallback={<DicomLoadingFallback t={t} />}>
                    <VolumeViewerPage
                        seriesId={dicomInfo?.series_id}
                        onBack={() => setDicomSubView("2d")}
                    />
                </Suspense>
            );
        }

        // --- DICOM slice analysis result - reuses the SAME LungResultCard
        // the PNG flow uses, with the SAME isPositiveResult()
        // classification, for consistency between both sub-flows. --------------
        if (dicomSubView === "result" && dicomAnalysisResult) {
            const dResult = dicomAnalysisResult.result;
            const dIsPos = isPositiveResult(dResult);
            return (
                <div>
                    <PageHeader
                        title="Lung Cancer Analysis"
                        subtitle={dicomAnalysisResult.fileName}
                        onBack={() => setDicomSubView("2d")}
                    />
                    {/* DICOM /analyze response was deliberately NOT changed
              this step - it has no class_probabilities field.
              LungResultCard handles this gracefully (section hidden,
              never fabricated) since classProbabilities is optional. */}
                    <LungResultCard
                        prediction={dResult.prediction}
                        confidence={dResult.confidence}
                        isPositive={dIsPos}
                        urgency={dResult.urgency}
                        classProbabilities={dResult.class_probabilities}
                        heatmapPath={dResult.heatmap_url}
                        extras={dResult && dIsPos ? [] : []}
                    />
                    <Button variant="secondary" onClick={() => setDicomSubView("2d")} style={{ marginTop: 16 }}>
                        Back to Viewer
                    </Button>
                </div>
            );
        }

        // --- 2D DICOM viewer - reached once a series has been inspected ------
        if (dicomSubView === "2d" && dicomInfo) {
            return (
                <Suspense fallback={<DicomLoadingFallback t={t} />}>
                    <DicomViewerPage
                        seriesId={dicomInfo.series_id}
                        patientId={patientId}
                        dicomMetadata={dicomInfo}
                        onBack={resetDicomFlow}
                        onOpenVolumeViewer={() => setDicomSubView("3d")}
                        onAnalysisResult={handleDicomAnalysisResult}
                    />
                </Suspense>
            );
        }

        // --- DICOM file selection - the default DICOM sub-view ---------------
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
                    {!patientId && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, color: t.dim, fontSize: 13 }}>
                            <AlertTriangle size={14} />
                            Select a patient before uploading a DICOM series.
                        </div>
                    )}
                    <div style={{ marginTop: 16 }}>
                        <DicomFileSelector onInspected={handleDicomInspected} disabled={!patientId} />
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
                    // Phase 1 Step 1: real class_probabilities now flows
                    // straight from the backend (predict()'s already-computed
                    // raw_scores, exposed unchanged by run_prediction()).
                    <LungResultCard
                        prediction={result.prediction}
                        confidence={result.confidence}
                        isPositive={isPos}
                        urgency={result.urgency}
                        classProbabilities={result.class_probabilities}
                        inputCheck={result.input_check}
                        originalImageSrc={preview}
                        heatmapOnlyPath={result.heatmap_only_url}
                        heatmapPath={result.heatmap_url}
                        extras={extras}
                    />
                )}
            >
                <PatientSelector value={patientId} onChange={setPatientId} navigate={navigate} />
                <ScanUploader preview={preview} onFile={onFile} onClear={clearFile} hint="PNG · JPG" />
            </AnalysisLayout>
        </div>
    );
}