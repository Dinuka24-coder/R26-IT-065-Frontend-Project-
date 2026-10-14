import { AlertTriangle, Download, Loader, Minus, Plus, RotateCcw, Square, Trash2 } from "lucide-react";
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

// Region marking
const MARK_COLOR = "#ff3b30";
const MIN_BOX_PX = 5; // ignore accidental clicks

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
    const wheelHandlerRef = useRef(null);

    const [seriesId, setSeriesId] = useState(null);
    const [totalSlices, setTotalSlices] = useState(0);
    const [patientId, setPatientId] = useState("");

    const [sliceIndex, setSliceIndex] = useState(0);
    // Kept in sync with totalSlices state via the effect below - used by
    // the wheel handler (attached once, in the setup effect) to clamp
    // correctly without depending on a stale closure over totalSlices.
    const totalSlicesRef = useRef(0);

    // Lung is the default visualization preset, matching the AI model's
    // intended use (lung-cancer analysis).
    const [wc, setWc] = useState(PRESETS.lung.wc);
    const [ww, setWw] = useState(PRESETS.lung.ww);

    const [viewerError, setViewerError] = useState("");
    const [setupError, setSetupError] = useState("");
    const [imageLoading, setImageLoading] = useState(false);

    const [analyzing, setAnalyzing] = useState(false);
    const [analyzeError, setAnalyzeError] = useState("");

    // --- Region marking (clinician-drawn boxes) ---------------------------
    // Boxes live in browser memory only (nothing is sent to the backend or
    // stored). Each box is kept as two WORLD points so it stays attached to
    // the anatomy while the user zooms/pans; they are projected back to
    // canvas pixels on every redraw.
    const [markMode, setMarkMode] = useState(false);
    const [boxes, setBoxes] = useState({}); // { [sliceIndex]: [{ a: [x,y,z], b: [x,y,z] }] }
    const [draft, setDraft] = useState(null); // { x0, y0, x1, y1 } in CSS px
    const [saveError, setSaveError] = useState("");
    const wrapRef = useRef(null);
    const overlayRef = useRef(null);
    const sliceIndexRef = useRef(0);
    const drawRef = useRef(() => {});

    const activePreset = Object.entries(PRESETS).find(
        ([, p]) => p.wc === wc && p.ww === ww
    )?.[0];

    sliceIndexRef.current = sliceIndex;
    const sliceBoxes = boxes[sliceIndex] || [];

    // Draws the boxes of the current slice (and the box being dragged) onto
    // a 2D context. `scale` converts CSS px to the target canvas' pixels
    // (devicePixelRatio for the overlay, canvas.width / clientWidth for the
    // exported PNG).
    function paintBoxes(ctx, scale, draftRect) {
        const viewport = viewportRef.current;
        if (!viewport) return;
        ctx.save();
        ctx.lineWidth = 2 * scale;
        ctx.strokeStyle = MARK_COLOR;
        ctx.fillStyle = MARK_COLOR;
        ctx.font = `bold ${12 * scale}px sans-serif`;
        sliceBoxes.forEach((b, i) => {
            const pa = viewport.worldToCanvas(b.a);
            const pb = viewport.worldToCanvas(b.b);
            const x = Math.min(pa[0], pb[0]) * scale;
            const y = Math.min(pa[1], pb[1]) * scale;
            const w = Math.abs(pa[0] - pb[0]) * scale;
            const h = Math.abs(pa[1] - pb[1]) * scale;
            ctx.strokeRect(x, y, w, h);
            ctx.fillText(String(i + 1), x + 3 * scale, y >= 16 * scale ? y - 4 * scale : y + 14 * scale);
        });
        if (draftRect) {
            ctx.setLineDash([6 * scale, 4 * scale]);
            ctx.strokeRect(
                Math.min(draftRect.x0, draftRect.x1) * scale,
                Math.min(draftRect.y0, draftRect.y1) * scale,
                Math.abs(draftRect.x1 - draftRect.x0) * scale,
                Math.abs(draftRect.y1 - draftRect.y0) * scale
            );
        }
        ctx.restore();
    }

    function redrawOverlay() {
        const canvas = overlayRef.current;
        const el = elementRef.current;
        if (!canvas || !el) return;
        const dpr = window.devicePixelRatio || 1;
        const w = Math.round(el.clientWidth * dpr);
        const h = Math.round(el.clientHeight * dpr);
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
        }
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // While a new slice is loading the old image is still on screen, so
        // do not draw the new slice's boxes over it.
        if (imageLoading) return;
        try {
            paintBoxes(ctx, dpr, draft);
        } catch {
            // Viewport not ready yet - the next render event redraws.
        }
    }
    drawRef.current = redrawOverlay;

    // Redraw after every React render (boxes / draft / slice / loading)...
    useEffect(() => {
        redrawOverlay();
    });

    // ...and whenever Cornerstone itself re-renders or the camera moves
    // (pan, zoom, reset, window change), so boxes follow the image.
    useEffect(() => {
        const el = elementRef.current;
        if (!el) return;
        const redraw = () => drawRef.current();
        el.addEventListener(CoreEnums.Events.CAMERA_MODIFIED, redraw);
        el.addEventListener(CoreEnums.Events.IMAGE_RENDERED, redraw);
        window.addEventListener("resize", redraw);
        return () => {
            el.removeEventListener(CoreEnums.Events.CAMERA_MODIFIED, redraw);
            el.removeEventListener(CoreEnums.Events.IMAGE_RENDERED, redraw);
            window.removeEventListener("resize", redraw);
        };
    }, [seriesId]);

    // Drag-to-draw while Mark Region is on. The mousedown is caught in the
    // CAPTURE phase on the wrapper and stopped, so Cornerstone's Pan tool
    // never sees the left-button drag. Right-drag zoom and the wheel are
    // untouched.
    useEffect(() => {
        const wrap = wrapRef.current;
        const el = elementRef.current;
        if (!markMode || !wrap || !el) return;

        const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
        const pos = (e) => {
            const r = el.getBoundingClientRect();
            return [clamp(e.clientX - r.left, 0, r.width), clamp(e.clientY - r.top, 0, r.height)];
        };
        let start = null;

        const onMove = (e) => {
            if (!start) return;
            const [x, y] = pos(e);
            setDraft({ x0: start[0], y0: start[1], x1: x, y1: y });
        };
        const stopListening = () => {
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
        };
        function onUp(e) {
            stopListening();
            if (!start) return;
            const [x, y] = pos(e);
            const [sx, sy] = start;
            start = null;
            setDraft(null);
            if (Math.abs(x - sx) < MIN_BOX_PX || Math.abs(y - sy) < MIN_BOX_PX) return;
            const viewport = viewportRef.current;
            const a = viewport?.canvasToWorld([sx, sy]);
            const b = viewport?.canvasToWorld([x, y]);
            if (!a || !b) return;
            const idx = sliceIndexRef.current;
            setBoxes((prev) => ({
                ...prev,
                [idx]: [...(prev[idx] || []), { a: [...a], b: [...b] }],
            }));
        }
        const onDown = (e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            start = pos(e);
            document.addEventListener("mousemove", onMove);
            document.addEventListener("mouseup", onUp);
        };

        wrap.addEventListener("mousedown", onDown, true);
        return () => {
            wrap.removeEventListener("mousedown", onDown, true);
            stopListening();
            setDraft(null);
        };
    }, [markMode]);

    function undoBox() {
        setBoxes((prev) => {
            const rest = (prev[sliceIndex] || []).slice(0, -1);
            const next = { ...prev };
            if (rest.length) next[sliceIndex] = rest;
            else delete next[sliceIndex];
            return next;
        });
    }

    function clearBoxes() {
        setBoxes((prev) => {
            const next = { ...prev };
            delete next[sliceIndex];
            return next;
        });
    }

    // Saves the slice exactly as displayed (current window, zoom and pan)
    // with the boxes drawn on top, as a PNG download. Nothing is uploaded.
    // The filename contains only the slice number - no patient data.
    function handleSaveMarked() {
        setSaveError("");
        const viewport = viewportRef.current;
        const el = elementRef.current;
        if (!viewport || !el) return;
        try {
            const src = viewport.getCanvas();
            const out = document.createElement("canvas");
            out.width = src.width;
            out.height = src.height;
            const ctx = out.getContext("2d");
            ctx.drawImage(src, 0, 0);
            const scale = src.width / el.clientWidth;
            paintBoxes(ctx, scale, null);
            ctx.save();
            ctx.font = `${11 * scale}px sans-serif`;
            ctx.fillStyle = "rgba(255,255,255,0.75)";
            ctx.fillText("Clinician-marked region(s)", 8 * scale, out.height - 8 * scale);
            ctx.restore();
            out.toBlob((blob) => {
                if (!blob) {
                    setSaveError("Could not create the image.");
                    return;
                }
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `slice-${String(sliceIndex + 1).padStart(3, "0")}-marked.png`;
                document.body.appendChild(link);
                link.click();
                link.remove();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            }, "image/png");
        } catch (err) {
            console.error("Save marked slice failed:", err);
            setSaveError("Could not save this slice as an image.");
        }
    }

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
        totalSlicesRef.current = dicomMetadata.number_of_slices;
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
                // zoomToCenter: true - confirmed from the real installed
                // ZoomTool source that this defaults to false, which anchors
                // zoom toward wherever the drag STARTED rather than the
                // viewport's true center - the likely cause of zoom appearing
                // to drift/misbehave. Forcing true anchors zoom consistently
                // around center.
                toolGroup.addTool(ZoomTool.toolName, { configuration: { zoomToCenter: true } });
                toolGroup.setToolActive(PanTool.toolName, {
                    bindings: [{ mouseButton: ToolEnums.MouseBindings.Primary }],
                });
                toolGroup.setToolActive(ZoomTool.toolName, {
                    bindings: [{ mouseButton: ToolEnums.MouseBindings.Secondary }],
                });
            }
            toolGroup.addViewport(VIEWPORT_ID, RENDERING_ENGINE_ID);

            // Wheel-based slice navigation. NOT implemented via
            // StackScrollTool: this viewer re-fetches a single-image
            // "stack" from the backend on every slice change, driven by
            // React state (sliceIndex), not by Cornerstone's own native
            // multi-image stack/volume concept - StackScrollTool scrolls
            // through a Cornerstone-tracked stack index, which would have
            // no effect here since the viewport's stack always contains
            // exactly one image. A direct wheel listener updating React
            // state is the correct mechanism for this architecture.
            const handleWheel = (e) => {
                e.preventDefault();
                const delta = e.deltaY > 0 ? 1 : -1;
                setSliceIndex((i) => {
                    const max = Math.max(totalSlicesRef.current - 1, 0);
                    return Math.min(Math.max(i + delta, 0), max);
                });
            };
            elementRef.current.addEventListener("wheel", handleWheel, { passive: false });
            wheelHandlerRef.current = handleWheel;
        } catch (err) {
            console.error("Cornerstone viewer setup failed:", err);
            setSetupError(
                "The DICOM viewer could not be initialized in this browser."
            );
        }

        return () => {
            if (wheelHandlerRef.current && elementRef.current) {
                elementRef.current.removeEventListener("wheel", wheelHandlerRef.current);
                wheelHandlerRef.current = null;
            }
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

    // Uses Cornerstone's own public getZoom()/setZoom() API (confirmed
    // real from the installed source: Viewport.js's getZoom() returns
    // initialParallelScale/currentParallelScale, so a LARGER returned
    // value means MORE zoomed in) rather than manually reading/writing
    // camera.parallelScale directly - delegating to Cornerstone's own
    // tested implementation rather than reimplementing the same math by
    // hand, which is the safer fix regardless of the exact mechanism
    // behind the previously reported Zoom Out behavior.
    function handleZoom(direction) {
        const viewport = viewportRef.current;
        if (!viewport) return;
        const currentZoom = viewport.getZoom();
        const factor = direction === "in" ? 1.15 : 1 / 1.15;
        viewport.setZoom(currentZoom * factor);
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
                actions={
                    <Button
                        variant="primary"
                        disabled={!seriesId}
                        onClick={onOpenVolumeViewer}
                    >
                        Open 3D Volume Viewer
                    </Button>
                }
            />

            <div className="card padded dicom-viewer-card">
                <div
                    ref={wrapRef}
                    className="dicom-viewport-wrap"
                    style={{ height: 480, minHeight: 480 }}
                >
                    <div
                        ref={elementRef}
                        className="dicom-viewport"
                        style={{ width: "100%", height: 480, minHeight: 480, cursor: markMode ? "crosshair" : undefined }}
                    />
                    <canvas
                        ref={overlayRef}
                        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}
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
            <span className="dicom-slice-label" style={{ color: t.text }}>
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
                        <span className="dicom-tool-hint" style={{ color: t.dim }}>
              Drag to pan · right-drag to zoom
            </span>
                    </div>

                    <div className="dicom-tool-row">
                        <Button
                            variant={markMode ? "primary" : "secondary"}
                            onClick={() => setMarkMode((m) => !m)}
                        >
                            <Square size={14} /> {markMode ? "Marking: On" : "Mark Region"}
                        </Button>
                        <Button variant="secondary" disabled={sliceBoxes.length === 0} onClick={undoBox}>
                            Undo
                        </Button>
                        <Button variant="secondary" disabled={sliceBoxes.length === 0} onClick={clearBoxes}>
                            <Trash2 size={14} /> Clear
                        </Button>
                        <Button variant="secondary" disabled={sliceBoxes.length === 0} onClick={handleSaveMarked}>
                            <Download size={14} /> Save Marked Slice
                        </Button>
                        <span className="dicom-tool-hint" style={{ color: t.dim }}>
                            {markMode
                                ? "Drag on the image to draw a box"
                                : `${sliceBoxes.length} region${sliceBoxes.length === 1 ? "" : "s"} marked on this slice`}
                        </span>
                    </div>
                    {saveError && (
                        <div className="error-box">
                            <AlertTriangle size={16} />
                            <span>{saveError}</span>
                        </div>
                    )}

                    <div className="dicom-window-section">
                        <div className="dicom-window-row">
                            <span className="dicom-window-label" style={{ color: t.text }}>Window:</span>
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
                                <label htmlFor="dicom-wc-slider" className="dicom-window-slider-label" style={{ color: t.dim }}>
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
                                <span className="dicom-window-slider-value" style={{ color: t.text }}>{wc}</span>
                            </div>

                            <div className="dicom-window-slider-row">
                                <label htmlFor="dicom-ww-slider" className="dicom-window-slider-label" style={{ color: t.dim }}>
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
                                <span className="dicom-window-slider-value" style={{ color: t.text }}>{ww}</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {analyzeError && <div className="error-box" style={{ marginTop: 16 }}>{analyzeError}</div>}

            {/*<Button
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
            </Button>*/}
        </div>
    );
}