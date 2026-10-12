import "./lungcancer.css";
import { useState, lazy, Suspense } from "react";
import { FileImage, Layers3, AlertTriangle, Loader, ScanLine } from "lucide-react";
import { predictLungCancer } from "../../../api/component4Api";
import { useTheme } from "../../../context/ThemeContext";
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
// GradCamExplorer is now also imported directly (named export, same
// component, not duplicated) so the PNG flow's Grad-CAM visualization
// can be rendered in its own full-width section below the two-column
// analysis row, instead of inline inside LungResultCard's right-hand
// column.
import LungResultCard, { GradCamExplorer } from "./LungResultCard";
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
//   "png"   - existing PNG/JPG prediction template. PREVIOUSLY composed
//             via the shared AnalysisLayout; now built directly here
//             with PageHeader/Card/Button/PatientSelector/ScanUploader
//             (all unmodified shared components, just composed
//             differently) because AnalysisLayout's `results` slot is
//             one column inside its own fixed grid row and has no slot
//             for content spanning full width below both columns.
//             AnalysisLayout.jsx itself is NOT imported or modified.
//             The two-column desktop grid below uses the exact same
//             `repeat(auto-fit, minmax(330px, 1fr))` technique
//             AnalysisLayout already used, so it collapses to a single
//             stacked column on narrow/tablet/mobile widths exactly as
//             before - no new CSS needed (lungcancer.css inspected;
//             it has no existing layout classes for this page, and
//             this file was already 100% inline-styled).
//   "dicom" - Component-4-specific DICOM CT flow, with its own internal
//             sub-navigation (dicomSubView) rather than a separate
//             top-level route - UNCHANGED:
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
//                          exists in this architecture. This call site
//                          does NOT pass onToggleGradCam/gradCamVisible,
//                          so LungResultCard falls back to its original,
//                          uncontrolled, inline Grad-CAM behavior
//                          (GradCamImage fallback since no original PNG
//                          image is available here) - completely
//                          unaffected by this change.
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

    // NEW: Grad-CAM visibility, lifted out of LungResultCard so the PNG
    // flow can render the Grad-CAM section as a separate, full-width
    // element below the two-column row rather than inline inside
    // LungResultCard. Reset in run()/clearFile() so it behaves the same
    // way the old inline (mount/unmount driven) state already did -
    // hidden again whenever a new file is picked or a new prediction
    // starts.
    const [showGradCam, setShowGradCam] = useState(false);

    function onFile(f) {
        if (!f || !f.type.startsWith("image/")) return setError("Please select a valid image file.");
        setError(""); setFile(f); setResult(null); setShowGradCam(false);
        const r = new FileReader();
        r.onload = (e) => setPreview(e.target.result);
        r.readAsDataURL(f);
    }

    function clearFile() { setFile(null); setPreview(null); setResult(null); setShowGradCam(false); }

    async function run() {
        setError(""); setLoading(true); setResult(null); setShowGradCam(false);
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
    const canRun = Boolean(patientId && file);

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
        // classification, for consistency between both sub-flows.
        // No onToggleGradCam/gradCamVisible passed here - LungResultCard
        // falls back to its original uncontrolled inline Grad-CAM
        // behavior, unchanged. --------------------------------------------
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
                {modeToggle}
                <PageHeader
                    title="Lung Cancer Analysis"
                    subtitle="DICOM CT · MPR + 3D volume visualization"
                    onBack={() => navigate("analysis")}
                />

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

    // --- PNG/JPG analysis - built directly here instead of through
    // AnalysisLayout (shared, unmodified, not imported). Everything below
    // shares ONE content width (.lung-page, see lungcancer.css) so the
    // patient card, the two-column row and the Grad-CAM section all line up
    // on the same left and right edges. Before a result exists the width
    // is the original narrow 660px single column; once a result exists it
    // widens to the two-column dashboard. -----------------------------------
    return (
        <div>
            {modeToggle}
            <PageHeader
                title="Lung Cancer Analysis"
                subtitle="CT Scan · AI detection + Grad-CAM"
                onBack={() => navigate("analysis")}
            />

            <div className={result ? "lung-page" : "lung-page lung-page--narrow"}>
                {/* Patient selection - same PatientSelector component and
                    patientId state as before. */}
                <Card style={{ marginBottom: 18 }}>
                    <PatientSelector value={patientId} onChange={setPatientId} navigate={navigate} />
                </Card>

                {/* Analysis row: scan + controls on the left, prediction
                    summary on the right, aligned at the top. Stacks on
                    narrow viewports (see .lung-analysis-grid). */}
                <div className={result ? "lung-analysis-grid" : undefined}>
                    <Card>
                        {/* .lung-scan-wrap caps the preview height so the Run
                            button stays in view. */}
                        <div className="lung-scan-wrap">
                            <ScanUploader preview={preview} onFile={onFile} onClear={clearFile} hint="PNG · JPG" />
                        </div>
                        {error && <div style={{ marginTop: 14, color: "#ef4444", fontSize: 13 }}>{error}</div>}
                        <div style={{ marginTop: 18 }}>
                            <Button onClick={run} disabled={!canRun || loading} full>
                                <ScanLine size={15} /> {loading ? "Analyzing…" : "Run AI Analysis"}
                            </Button>
                        </div>
                    </Card>

                    {/* Prediction summary only - the Grad-CAM toggle is
                        controlled from here, but the visualization renders
                        in the full-width section below. Real
                        class_probabilities etc. flow straight from the
                        backend response, unchanged. */}
                    {result && (
                        <LungResultCard
                            prediction={result.prediction}
                            confidence={result.confidence}
                            isPositive={isPos}
                            urgency={result.urgency}
                            classProbabilities={result.class_probabilities}
                            inputCheck={result.input_check}
                            heatmapPath={result.heatmap_url}
                            extras={extras}
                            gradCamVisible={showGradCam}
                            onToggleGradCam={() => setShowGradCam((v) => !v)}
                        />
                    )}
                </div>

                {/* Full-width Grad-CAM section, below the whole row, same
                    18px spacing as everything else (cardStyle zeroes the
                    explorer's own default top margin so it isn't doubled). */}
                {result && showGradCam && (
                    <div style={{ marginTop: 18 }}>
                        <GradCamExplorer
                            originalImageSrc={preview}
                            densenetGradcamUrl={result.densenet_gradcam_url}
                            customGradcamUrl={result.custom_gradcam_url}
                            combinedGradcamUrl={result.combined_gradcam_url}
                            comparisonMetrics={result.comparison_metrics}
                            cardStyle={{ marginTop: 0 }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}