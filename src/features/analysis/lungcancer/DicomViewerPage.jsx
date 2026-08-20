import { AlertTriangle, Loader, Minus, Plus, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "../../../context/ThemeContext";
import { RenderingEngine, Enums as CoreEnums } from "@cornerstonejs/core";
import { addTool, ZoomTool, PanTool, ToolGroupManager, Enums as ToolEnums } from "@cornerstonejs/tools";
import { analyzeDicomSlice, getDicomSliceUrl } from "./component4DicomApi.js";
import {
    ensureCornerstoneInitialized,
    ensureCPUModeForStackViewer,
    registerSeriesMetadata,
    setDisplayWindow,
    toWebImageId,
    REFERENCE_WC,
    REFERENCE_WW,
} from "./cornerstoneSetup.js";
import Button from "../../../components/ui/Button.jsx";
import PageHeader from "../../../components/ui/PageHeader.jsx";

// Component 4 (CT Lung Cancer) DICOM viewer. Isolated under src/pages/ct/.
//
// One backend fetch per SLICE (a wide reference-windowed render - see
// cornerstoneSetup.js). Window/level changes (presets or WC/WW sliders)
// are applied live to that already-loaded image via Cornerstone's own
// VOI LUT mechanism - no re-fetch. "Analyze Current Slice" is separate:
// it always requests a fresh, full-precision backend render at the exact
// chosen WC/WW for the model, independent of what the live viewer shows.

const RENDERING_ENGINE_ID = "ct-dicom-rendering-engine";
const VIEWPORT_ID = "ct-dicom-viewport";
const TOOL_GROUP_ID = "ct-dicom-tool-group";

const PRESETS = {
    lung: { label: "Lung", wc: -600, ww: 1500 },
    mediastinal: { label: "Mediastinal", wc: 50, ww: 350 },
    bone: { label: "Bone", wc: 400, ww: 1800 },
};

// Slider bounds, kept comfortably inside the wide reference window
// (REFERENCE_WC +/- REFERENCE_WW/2) fetched once per slice, so dragging
// to either end still reflects real reference-image data rather than a
// flat clipped region.
const WC_MIN = -1000;
const WC_MAX = 1000;
const WC_STEP = 10;
const WW_MIN = 50;
const WW_MAX = 3000;
const WW_STEP = 10;

let toolsRegisteredGlobally = false;

export default function DicomViewerPage({
                                            seriesId: initialSeriesId,
                                            patientId: initialPatientId,
                                            dicomMetadata,
                                            onBack,
                                            onOpenVolumeViewer,
                                            onAnalysisResult,
                                        }) {
    const { t } = useTheme();
    const elementRef = useRef(null);
    const renderingEngineRef = useRef(null);
    const viewportRef = useRef(null);

    const [seriesId, setSeriesId] = useState(null);
    const [totalSlices, setTotalSlices] = useState(0);
    const [patientId, setPatientId] = useState("");

    const [sliceIndex, setSliceIndex] = useState(0);

    // Lung is the default visualization preset, matching the AI model's
    // intended use (lung-cancer analysis).
    const [wc, setWc] = useState(PRESETS.lung.wc);
    const [ww, setWw] = useState(PRESETS.lung.ww);

    const [viewerError, setViewerError] = useState("");
    const [setupError, setSetupError] = useState("");
    const [imageLoading, setImageLoading] = useState(false);

    const [analyzing, setAnalyzing] = useState(false);
    const [analyzeError, setAnalyzeError] = useState("");

    const activePreset = Object.entries(PRESETS).find(
        ([, p]) => p.wc === wc && p.ww === ww
    )?.[0];

    // --- Initialize from props (handed off by DicomFileSelector's
    // inspectDicom() result via the parent, LungCancerAnalysis.jsx) ------
    useEffect(() => {
        if (!initialSeriesId || !dicomMetadata?.number_of_slices) {
            setSetupError("No DICOM series found. Please select DICOM files again.");
            return;
        }

        // Registers the REAL backend-verified metadata (modality from the
        // Level 1 CT check that already passed, and actual DICOM PixelSpacing
        // when the source file had it) with the Cornerstone metadata provider
        // in cornerstoneSetup.js. Without this, Cornerstone's internal CPU
        // metadata build crashes on load (see cornerstoneSetup.js for the
        // full explanation) - this must happen before the viewport requests
        // any slice for this series.
        const [rowSpacing, columnSpacing] = dicomMetadata.pixel_spacing || [];
        registerSeriesMetadata(initialSeriesId, {
            modality: dicomMetadata.modality,
            rowPixelSpacing: rowSpacing,
            columnPixelSpacing: columnSpacing,
        });

        setSeriesId(initialSeriesId);
        setTotalSlices(dicomMetadata.number_of_slices);
        setPatientId(initialPatientId || "");
    }, [initialSeriesId, initialPatientId, dicomMetadata]);

    // --- Cornerstone viewport setup, once we have a valid element --------
    useEffect(() => {
        if (setupError || !elementRef.current) return;

        try {
            ensureCornerstoneInitialized();
            // Must be called immediately before constructing this page's
            // RenderingEngine, every mount - not a one-time global setting.
            // See cornerstoneSetup.js for why (useCPURendering is captured
            // once, at RenderingEngine/Viewport construction time).
            ensureCPUModeForStackViewer();

            if (!toolsRegisteredGlobally) {
                addTool(ZoomTool);
                addTool(PanTool);
                toolsRegisteredGlobally = true;
            }

            const renderingEngine = new RenderingEngine(RENDERING_ENGINE_ID);
            renderingEngineRef.current = renderingEngine;

            renderingEngine.enableElement({
                viewportId: VIEWPORT_ID,
                type: CoreEnums.ViewportType.STACK,
                element: elementRef.current,
                defaultOptions: { background: [0, 0, 0] },
            });

            const viewport = renderingEngine.getViewport(VIEWPORT_ID);
            viewportRef.current = viewport;

            let toolGroup = ToolGroupManager.getToolGroup(TOOL_GROUP_ID);
            if (!toolGroup) {
                toolGroup = ToolGroupManager.createToolGroup(TOOL_GROUP_ID);
                toolGroup.addTool(PanTool.toolName);
                toolGroup.addTool(ZoomTool.toolName);
                toolGroup.setToolActive(PanTool.toolName, {
                    bindings: [{ mouseButton: ToolEnums.MouseBindings.Primary }],
                });
                toolGroup.setToolActive(ZoomTool.toolName, {
                    bindings: [{ mouseButton: ToolEnums.MouseBindings.Secondary }],
                });
            }
            toolGroup.addViewport(VIEWPORT_ID, RENDERING_ENGINE_ID);
        } catch (err) {
            console.error("Cornerstone viewer setup failed:", err);
            setSetupError(
                "The DICOM viewer could not be initialized in this browser."
            );
        }

        return () => {
            try {
                const toolGroup = ToolGroupManager.getToolGroup(TOOL_GROUP_ID);
                toolGroup?.removeViewports(RENDERING_ENGINE_ID, VIEWPORT_ID);
                renderingEngineRef.current?.destroy();
            } catch {
                // Best-effort cleanup only.
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [setupError]);

    // --- Load the wide reference-windowed image for the selected slice ---
    // Fires ONLY on slice changes (new pixel data needed). Window/level
    // changes are handled entirely by the separate effect below, with no
    // backend call.
    useEffect(() => {
        if (!seriesId || !viewportRef.current) return;

        const url = getDicomSliceUrl(seriesId, sliceIndex, {
            wc: REFERENCE_WC,
            ww: REFERENCE_WW,
        });
        const imageId = toWebImageId(url);

        let cancelled = false;
        setImageLoading(true);
        setViewerError("");

        const isFirstLoad = !viewportRef.current.getImageIds || viewportRef.current.getImageIds().length === 0;

        viewportRef.current
            .setStack([imageId], 0)
            .then(() => {
                if (cancelled) return;
                // Preserve zoom/pan across slice changes; only reset the camera
                // on the very first slice this viewport has ever shown.
                if (isFirstLoad) {
                    viewportRef.current.resetCamera();
                }
                // Apply whatever window the doctor currently has selected (not
                // necessarily the Lung default baked into a fresh image) so
                // switching slices preserves the current window instead of
                // resetting it.
                setDisplayWindow(viewportRef.current, wc, ww);
                viewportRef.current.render();
                setImageLoading(false);
            })
            .catch((err) => {
                if (cancelled) return;
                console.error("Failed to load DICOM slice:", err);
                setViewerError(
                    "Failed to load this slice. The DICOM series may have expired — please upload it again."
                );
                setImageLoading(false);
            });

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [seriesId, sliceIndex]);

    // --- Apply window/level changes live, with no backend call -----------
    useEffect(() => {
        if (!viewportRef.current) return;
        const currentImageIds = viewportRef.current.getImageIds?.();
        if (!currentImageIds || currentImageIds.length === 0) return;

        setDisplayWindow(viewportRef.current, wc, ww);
        viewportRef.current.render();
    }, [wc, ww]);

    function applyPreset(name) {
        const p = PRESETS[name];
        setWc(p.wc);
        setWw(p.ww);
    }

    function handleZoom(direction) {
        const viewport = viewportRef.current;
        if (!viewport) return;
        const camera = viewport.getCamera();
        const currentScale = camera.parallelScale || 1;
        const factor = direction === "in" ? 0.85 : 1 / 0.85;
        viewport.setCamera({ parallelScale: currentScale * factor });
        viewport.render();
    }

    function handleReset() {
        const viewport = viewportRef.current;
        if (!viewport) return;
        viewport.resetCamera();
        viewport.render();
    }

    async function handleAnalyze() {
        if (analyzing || !seriesId) return;

        setAnalyzeError("");
        setAnalyzing(true);

        try {
            const result = await analyzeDicomSlice({
                patientId,
                seriesId,
                sliceIndex,
                windowCenter: wc,
                windowWidth: ww,
            });

            // No separate results page exists in this architecture - hands
            // the result to the parent (LungCancerAnalysis.jsx) via a
            // callback instead of localStorage+navigate(). This is a fresh,
            // full-precision backend render at the exact chosen window - not
            // the wide-reference image used for the live viewer.
            onAnalysisResult({
                result,
                fileName: `DICOM slice ${sliceIndex + 1} of ${totalSlices}`,
                previewUrl: getDicomSliceUrl(seriesId, sliceIndex, { wc, ww }),
            });
        } catch (err) {
            setAnalyzeError(
                err.message || "Analysis failed. Please check the backend server."
            );
        } finally {
            setAnalyzing(false);
        }
    }

    if (setupError) {
        return (
            <div className="page-enter">
                <PageHeader
                    title="CT DICOM Viewer"
                    subtitle="DICOM series unavailable"
                    onBack={onBack}
                />
                <div className="card padded">
                    <div className="error-box">
                        <AlertTriangle size={16} />
                        <span>{setupError}</span>
                    </div>
                    <Button variant="primary" onClick={onBack} style={{ marginTop: 16 }}>
                        Back to Upload
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="page-enter">
            <PageHeader
                title="CT DICOM Viewer"
                subtitle="Adjust the slice and window, then explicitly analyze"
                onBack={onBack}
            />

            <div className="card padded dicom-viewer-card">
                <div
                    className="dicom-viewport-wrap"
                    style={{ height: 480, minHeight: 480 }}
                >
                    <div
                        ref={elementRef}
                        className="dicom-viewport"
                        style={{ width: "100%", height: 480, minHeight: 480 }}
                    />
                    {imageLoading && (
                        <div className="dicom-viewport-loading">
                            <Loader size={28} className="spin" color="#fff" />
                        </div>
                    )}
                </div>

                {viewerError && (
                    <div className="error-box" style={{ marginTop: 12 }}>
                        <AlertTriangle size={16} />
                        <span>{viewerError}</span>
                    </div>
                )}

                <div className="dicom-controls">
                    <div className="dicom-slice-row">
            <span className="dicom-slice-label">
              Slice: {sliceIndex + 1} / {totalSlices}
            </span>
                        <input
                            type="range"
                            min={0}
                            max={Math.max(totalSlices - 1, 0)}
                            value={sliceIndex}
                            onChange={(e) => setSliceIndex(parseInt(e.target.value, 10))}
                            className="dicom-slice-slider"
                            disabled={totalSlices <= 1}
                        />
                        <div className="dicom-slice-buttons">
                            <Button
                                variant="secondary"
                                disabled={sliceIndex <= 0}
                                onClick={() => setSliceIndex((i) => Math.max(0, i - 1))}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="secondary"
                                disabled={sliceIndex >= totalSlices - 1}
                                onClick={() => setSliceIndex((i) => Math.min(totalSlices - 1, i + 1))}
                            >
                                Next
                            </Button>
                        </div>
                    </div>

                    <div className="dicom-tool-row">
                        <Button variant="secondary" onClick={() => handleZoom("in")}>
                            <Plus size={14} /> Zoom In
                        </Button>
                        <Button variant="secondary" onClick={() => handleZoom("out")}>
                            <Minus size={14} /> Zoom Out
                        </Button>
                        <Button variant="secondary" onClick={handleReset}>
                            <RotateCcw size={14} /> Reset
                        </Button>
                        <span className="dicom-tool-hint">
              Drag to pan · right-drag to zoom
            </span>
                    </div>

                    <div className="dicom-window-section">
                        <div className="dicom-window-row">
                            <span className="dicom-window-label">Window:</span>
                            {Object.entries(PRESETS).map(([key, p]) => (
                                <Button
                                    key={key}
                                    variant={activePreset === key ? "primary" : "secondary"}
                                    onClick={() => applyPreset(key)}
                                >
                                    {p.label}
                                </Button>
                            ))}
                        </div>

                        <div className="dicom-window-sliders">
                            <div className="dicom-window-slider-row">
                                <label htmlFor="dicom-wc-slider" className="dicom-window-slider-label">
                                    Window Center (WC)
                                </label>
                                <input
                                    id="dicom-wc-slider"
                                    type="range"
                                    min={WC_MIN}
                                    max={WC_MAX}
                                    step={WC_STEP}
                                    value={wc}
                                    onChange={(e) => setWc(parseFloat(e.target.value))}
                                    className="dicom-window-slider"
                                />
                                <span className="dicom-window-slider-value">{wc}</span>
                            </div>

                            <div className="dicom-window-slider-row">
                                <label htmlFor="dicom-ww-slider" className="dicom-window-slider-label">
                                    Window Width (WW)
                                </label>
                                <input
                                    id="dicom-ww-slider"
                                    type="range"
                                    min={WW_MIN}
                                    max={WW_MAX}
                                    step={WW_STEP}
                                    value={ww}
                                    onChange={(e) => setWw(parseFloat(e.target.value))}
                                    className="dicom-window-slider"
                                />
                                <span className="dicom-window-slider-value">{ww}</span>
                            </div>
                        </div>
                    </div>

                    <div className="dicom-tool-row" style={{ marginTop: 12 }}>
                        <Button
                            variant="secondary"
                            disabled={!seriesId}
                            onClick={onOpenVolumeViewer}
                        >
                            Open 3D Volume Viewer
                        </Button>
                    </div>
                </div>
            </div>

            {analyzeError && <div className="error-box" style={{ marginTop: 16 }}>{analyzeError}</div>}

            <Button
                variant="primary"
                onClick={handleAnalyze}
                disabled={analyzing || !seriesId}
                style={{ width: "100%", justifyContent: "center", padding: "14px", fontSize: 15, fontWeight: 600, marginTop: 16 }}
            >
                {analyzing ? (
                    <>
                        <Loader size={17} className="spin" color={t.card} /> Analyzing…
                    </>
                ) : (
                    "Analyze Current Slice"
                )}
            </Button>
        </div>
    );
}