import { AlertTriangle, Loader } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
    RenderingEngine,
    Enums as CoreEnums,
    setVolumesForViewports,
} from "@cornerstonejs/core";
import { addTool, ZoomTool, PanTool, StackScrollTool, TrackballRotateTool, CrosshairsTool, ToolGroupManager, Enums as ToolEnums } from "@cornerstonejs/tools";
import {
    getDicomVolumeAcquisitions,
    getDicomVolumeMetadata,
    getDicomVolumeData,
} from "./component4DicomApi.js";
import {
    ensureCornerstoneInitialized,
    ensureGPUModeForVolumeViewer,
    createVolumeFromBackendData,
    removeVolumeFromCache,
} from "./cornerstoneSetup.js";
import Button from "../../../components/ui/Button.jsx";
import PageHeader from "../../../components/ui/PageHeader.jsx";

// Component 4 (CT Lung Cancer) 3D volume viewer. SEPARATE from
// DicomViewerPage.jsx (the existing 2D slice viewer) - does not modify
// or replace it. Receives seriesId directly as a prop from the parent
// (LungCancerAnalysis.jsx), which already has it from
// DicomFileSelector's inspectDicom() result - no localStorage, no
// separate top-level route, matching this repository's one-component-
// per-feature architecture.
//
// Uses an ORTHOGRAPHIC viewport (a single MPR plane through the real
// 3D volume, with camera rotate/pan/zoom) - the simplest, most reliable
// Cornerstone3D volume visualization confirmed supported by the
// installed version (5.8.2), rather than full 3D raycasting (VOLUME_3D).
//
// ACQUISITION-AWARE FLOW (new): a series can genuinely contain multiple
// separate CT acquisitions under one SeriesInstanceUID (confirmed real
// case: Lung_Dx-E0003, 3 acquisitions). The backend's /acquisitions
// endpoint is ALWAYS consulted first - the Cornerstone viewport is
// deliberately NOT initialized until a specific, valid acquisition is
// known (either the only one, auto-selected, or the user's explicit
// choice among several) - never before, and never silently guessed.

const RENDERING_ENGINE_ID = "ct-volume-rendering-engine";
// Three separate ORTHOGRAPHIC viewport IDs (Axial/Coronal/Sagittal),
// differing only in defaultOptions.orientation at enableElement() time -
// confirmed from the real installed @cornerstonejs/core source that
// VolumeViewport.js has genuine, first-class handling for CORONAL/
// SAGITTAL as base orientations (they're also the foundation for the
// *_REFORMAT variants), not a narrow AXIAL-only feature. All three
// share the SAME RenderingEngine/ToolGroup as the previous single MPR
// viewport did - no new engine, no new context.
const VIEWPORT_ID_AXIAL = "ct-volume-viewport-axial";
const VIEWPORT_ID_CORONAL = "ct-volume-viewport-coronal";
const VIEWPORT_ID_SAGITTAL = "ct-volume-viewport-sagittal";
const MPR_VIEWPORT_IDS = [VIEWPORT_ID_AXIAL, VIEWPORT_ID_CORONAL, VIEWPORT_ID_SAGITTAL];
const TOOL_GROUP_ID = "ct-volume-tool-group";

// Genuine VOLUME_3D mode - uses a SECOND viewport ID on the SAME shared
// RenderingEngine as MPR (see below), rather than a separate engine
// instance. CONFIRMED from the installed @cornerstonejs/core 5.8.2
// source: ContextPoolRenderingEngine constructs its own WebGLContextPool
// per RenderingEngine instance ("this.contextPool = new WebGLContextPool
// (webGlContextCount, this.id)" in ContextPoolRenderingEngine.js) - it is
// NOT a shared, page-wide singleton. A volume's GPU texture
// (imageVolume.vtkOpenGLTexture) is created once, tied to whichever
// context pool first rendered it, and is NOT valid under a second,
// independent RenderingEngine's separate pool - this was the confirmed
// root cause of "bindTexture: object does not belong to this context"
// in an earlier version of this file that used two separate engines.
// One shared engine, two viewportIds, is the architecture the installed
// version actually supports for this.
const VIEWPORT_ID_3D = "ct-volume-3d-viewport";
const TOOL_GROUP_ID_3D = "ct-volume-3d-tool-group";

let volumeToolsRegisteredGlobally = false;
let volume3DToolsRegisteredGlobally = false;

// MPR window/level presets. Lung/Mediastinal/Bone values are the EXACT
// existing values from the real 2D DicomViewerPage.jsx PRESETS object
// (wc/ww: lung=-600/1500, mediastinal=50/350, bone=400/1800) - reused
// deliberately rather than inventing new numbers, per instruction. The
// suggested Bone value (300/2000) was NOT used - it does not match the
// existing 2D viewer's real Bone preset (400/1800), and the existing
// value takes precedence. "Default" (40/400) has no existing 2D
// equivalent to reuse (the 2D viewer only has Lung/Mediastinal/Bone),
// so the suggested value is used for it specifically.
const MPR_WINDOW_PRESETS = {
    default: { label: "Default", wc: 40, ww: 400 },
    lung: { label: "Lung", wc: -600, ww: 1500 },
    mediastinal: { label: "Mediastinal", wc: 50, ww: 350 },
    bone: { label: "Bone", wc: 400, ww: 1800 },
};

// 3D volume-rendering presets - REAL preset names confirmed directly
// from the installed @cornerstonejs/core source
// (constants/viewportPresets.js): "CT-Lung", "CT-Soft-Tissue", "CT-Bone"
// are genuine, built-in named presets (color/opacity transfer functions
// tuned for CT), applied via viewport.setProperties({ preset: name }).
// No "CT-Default" preset exists in the installed version - "Default"
// is implemented separately (see applyRender3DPreset below) by
// re-attaching the already-cached volume, which resets the actor to
// its natural, unmodified rendering - not a fabricated preset name.
const RENDER_3D_PRESETS = {
    default: { label: "Default", presetName: null },
    lung: { label: "Lung", presetName: "CT-Lung" },
    softTissue: { label: "Soft Tissue", presetName: "CT-Soft-Tissue" },
    bone: { label: "Bone", presetName: "CT-Bone" },
};

/**
 * Formats a raw DICOM AcquisitionTime string ("HHMMSS.ffffff" or
 * "HHMMSS") into "HH:MM:SS" for display. Returns the raw value
 * unchanged if it doesn't match the expected shape - never fabricates
 * a time that isn't actually present.
 */
function formatAcquisitionTime(raw) {
    if (!raw || typeof raw !== "string" || raw.length < 6) return raw;
    const hh = raw.slice(0, 2);
    const mm = raw.slice(2, 4);
    const ss = raw.slice(4, 6);
    return `${hh}:${mm}:${ss}`;
}

export default function VolumeViewerPage({ seriesId: initialSeriesId, onBack }) {
    const elementAxialRef = useRef(null);
    const elementCoronalRef = useRef(null);
    const elementSagittalRef = useRef(null);
    const renderingEngineRef = useRef(null);
    const viewportRef = useRef(null);
    const volumeIdRef = useRef(null);
    // Phase 05B: removed the "orientation" tab-selection state - all
    // three MPR panels are now shown simultaneously, so a single active-
    // orientation selector no longer has a purpose. The three viewport
    // refs/IDs/Cornerstone setup below are completely unchanged.

    // --- Genuine VOLUME_3D mode - separate viewport ref/toolgroup, but
    // SHARES renderingEngineRef above rather than owning its own engine.
    const element3DRef = useRef(null);
    const viewport3DRef = useRef(null);
    const [mode, setMode] = useState("mpr"); // "mpr" | "3d"
    const [mprWindowPresetKey, setMprWindowPresetKey] = useState("default");
    const [render3DPresetKey, setRender3DPresetKey] = useState("default");
    const [background3D, setBackground3D] = useState("black"); // "black" | "white"

    // seriesId comes directly as a prop - the parent already has it from
    // DicomFileSelector's inspectDicom() result (see the "props, not
    // localStorage" adaptation).
    const [seriesId] = useState(initialSeriesId || null);
    const [setupError, setSetupError] = useState(
        initialSeriesId ? "" : "No DICOM series found. Please select DICOM files again."
    );

    // --- Acquisition discovery/selection state --------------------------
    const [acquisitionsLoading, setAcquisitionsLoading] = useState(false);
    const [acquisitionsError, setAcquisitionsError] = useState("");
    const [acquisitions, setAcquisitions] = useState(null); // raw list from backend
    const [classification, setClassification] = useState(null);
    const [selectedAcquisitionNumber, setSelectedAcquisitionNumber] = useState(null);

    // --- Volume loading/rendering state ----------------------------------
    const [loadError, setLoadError] = useState("");
    const [loadingStage, setLoadingStage] = useState("");
    const [setup3DError, setSetup3DError] = useState("");

    // --- Step 2: fetch acquisitions BEFORE touching Cornerstone at all ---
    // Auto-selects if exactly one VALID acquisition exists (covers both
    // the single-acquisition and missing-AcquisitionNumber cases - both
    // resolve to one candidate group on the backend). Never auto-selects
    // when more than one valid acquisition exists - the selector UI
    // below handles that case, requiring an explicit user choice.
    useEffect(() => {
        if (!seriesId) return;

        let cancelled = false;

        async function loadAcquisitions() {
            setAcquisitionsLoading(true);
            setAcquisitionsError("");
            try {
                const result = await getDicomVolumeAcquisitions(seriesId);
                if (cancelled) return;

                setAcquisitions(result.acquisitions);
                setClassification(result.classification);

                const validAcquisitions = result.acquisitions.filter((a) => a.valid);
                if (validAcquisitions.length === 0) {
                    setAcquisitionsError(
                        "This DICOM series does not contain any acquisition that can be "
                        + "reconstructed into a 3D volume."
                    );
                } else if (validAcquisitions.length === 1) {
                    setSelectedAcquisitionNumber(validAcquisitions[0].acquisition_number);
                }
                // else: multiple valid acquisitions - selector UI handles it,
                // selectedAcquisitionNumber stays null until the user chooses.
            } catch (err) {
                if (cancelled) return;
                console.error("Failed to load acquisitions:", err);
                setAcquisitionsError(
                    err.message || "Failed to determine the acquisitions available for this series."
                );
            } finally {
                if (!cancelled) setAcquisitionsLoading(false);
            }
        }

        loadAcquisitions();

        return () => {
            cancelled = true;
        };
    }, [seriesId]);

    // --- Step 3: ONLY once an acquisition has been selected - set up the
    // Cornerstone viewport AND load that acquisition's volume. Combined
    // into one effect (rather than two separate ones) specifically so
    // that changing the selected acquisition correctly tears down the
    // previous RenderingEngine before creating a new one - React runs
    // this effect's cleanup before its next run whenever
    // selectedAcquisitionNumber changes, preventing duplicate rendering
    // engines or stale volumes from accumulating.
    useEffect(() => {
        if (setupError || !selectedAcquisitionNumber
            || !elementAxialRef.current || !elementCoronalRef.current || !elementSagittalRef.current) return;

        let cancelled = false;

        try {
            ensureCornerstoneInitialized();
            // REQUIRED before constructing this page's RenderingEngine -
            // VolumeViewport throws unconditionally if CPU rendering is
            // active (confirmed from the installed @cornerstonejs/core
            // source - no per-instance override exists). Already correct
            // in cornerstoneSetup.js - preserved unchanged here.
            ensureGPUModeForVolumeViewer();

            if (!volumeToolsRegisteredGlobally) {
                addTool(ZoomTool);
                addTool(PanTool);
                addTool(StackScrollTool);
                addTool(CrosshairsTool);
                volumeToolsRegisteredGlobally = true;
            }

            const renderingEngine = new RenderingEngine(RENDERING_ENGINE_ID);
            renderingEngineRef.current = renderingEngine;

            // Three separate ORTHOGRAPHIC viewports, one per orientation,
            // all on this SAME engine - differ only in
            // defaultOptions.orientation, per the verified real API.
            const mprOrientationConfig = [
                { viewportId: VIEWPORT_ID_AXIAL, element: elementAxialRef.current, orientation: CoreEnums.OrientationAxis.AXIAL },
                { viewportId: VIEWPORT_ID_CORONAL, element: elementCoronalRef.current, orientation: CoreEnums.OrientationAxis.CORONAL },
                { viewportId: VIEWPORT_ID_SAGITTAL, element: elementSagittalRef.current, orientation: CoreEnums.OrientationAxis.SAGITTAL },
            ];
            for (const cfg of mprOrientationConfig) {
                renderingEngine.enableElement({
                    viewportId: cfg.viewportId,
                    type: CoreEnums.ViewportType.ORTHOGRAPHIC,
                    element: cfg.element,
                    defaultOptions: {
                        orientation: cfg.orientation,
                        background: [0, 0, 0],
                    },
                });
            }

            const viewport = renderingEngine.getViewport(VIEWPORT_ID_AXIAL);
            viewportRef.current = viewport;

            let toolGroup = ToolGroupManager.getToolGroup(TOOL_GROUP_ID);
            if (!toolGroup) {
                toolGroup = ToolGroupManager.createToolGroup(TOOL_GROUP_ID);
                toolGroup.addTool(PanTool.toolName);
                // zoomToCenter: true - confirmed from the real installed
                // ZoomTool source that this defaults to false, anchoring
                // zoom toward the drag start point rather than the
                // viewport's true center. This is the confirmed root
                // cause of the reported Coronal/Sagittal zoom drift:
                // Axial "happened" to look correct because typical chest
                // CT framing/click position there is closer to center;
                // Coronal/Sagittal's different framing made the same
                // underlying default-config behavior visibly worse.
                // Applied uniformly to all three MPR orientations (not
                // orientation-specific), since it's the same ZoomTool
                // instance/config shared across the one MPR ToolGroup.
                toolGroup.addTool(ZoomTool.toolName, { configuration: { zoomToCenter: true } });
                toolGroup.addTool(StackScrollTool.toolName);
                toolGroup.setToolActive(PanTool.toolName, {
                    bindings: [{ mouseButton: ToolEnums.MouseBindings.Primary }],
                });
                toolGroup.setToolActive(ZoomTool.toolName, {
                    bindings: [{ mouseButton: ToolEnums.MouseBindings.Secondary }],
                });
                // Mouse wheel - does not share a button with Pan (Primary/left)
                // or Zoom (Secondary/right), so this is purely additive. Verified
                // from the real installed StackScrollTool source: it explicitly
                // supports VolumeViewport (calls viewport.getVolumeId() and
                // routes through utilities.scroll()), not just stack viewports,
                // despite the tool's name. Each viewport tracks its own slice
                // position independently (confirmed from source: the tool
                // resolves the SPECIFIC viewport the event occurred on), so
                // scrolling Axial does not affect Coronal/Sagittal.
                toolGroup.setToolActive(StackScrollTool.toolName, {
                    bindings: [{ mouseButton: ToolEnums.MouseBindings.Wheel }],
                });
                // Phase 05A: synchronized MPR crosshair. Confirmed from the
                // real installed CrosshairsTool source that it discovers
                // sibling viewports via getToolGroup(this.toolGroupId)
                // .viewportsInfo - the SAME three Axial/Coronal/Sagittal
                // viewports already registered on this ToolGroup below
                // (toolGroup.addViewport, in the loop after this block) are
                // automatically what it synchronizes against - no separate
                // registration needed. Bound to Auxiliary (middle-drag) -
                // confirmed free in this specific ToolGroup (Primary/
                // Secondary/Wheel are already Pan/Zoom/StackScroll here;
                // Auxiliary is only used in the SEPARATE 3D ToolGroup, for
                // TrackballRotateTool, which this does not touch). Default
                // tool configuration - no custom options passed.
                toolGroup.addTool(CrosshairsTool.toolName);
                toolGroup.setToolActive(CrosshairsTool.toolName, {
                    bindings: [{ mouseButton: ToolEnums.MouseBindings.Auxiliary }],
                });
            }
            // One shared ToolGroup, all three MPR viewports added to it -
            // the standard, supported Cornerstone3D multi-viewport pattern,
            // rather than duplicating identical tool config three times.
            for (const cfg of mprOrientationConfig) {
                toolGroup.addViewport(cfg.viewportId, RENDERING_ENGINE_ID);
            }
        } catch (err) {
            console.error("3D volume viewer setup failed:", err);
            setSetupError("The 3D volume viewer could not be initialized in this browser.");
            return;
        }

        async function loadVolume() {
            try {
                setLoadError("");
                setLoadingStage("Loading volume metadata...");
                const metadata = await getDicomVolumeMetadata(seriesId, selectedAcquisitionNumber);
                if (cancelled) return;

                if (metadata.dtype !== "int16") {
                    throw new Error(`Unexpected volume dtype: ${metadata.dtype}`);
                }
                if (!Array.isArray(metadata.shape) || metadata.shape.length !== 3) {
                    throw new Error(`Invalid volume shape: ${JSON.stringify(metadata.shape)}`);
                }

                setLoadingStage("Loading 3D volume data...");
                const arrayBuffer = await getDicomVolumeData(seriesId, selectedAcquisitionNumber);
                if (cancelled) return;

                const int16Array = new Int16Array(arrayBuffer);
                const expectedVoxels = metadata.shape[0] * metadata.shape[1] * metadata.shape[2];
                if (int16Array.length !== expectedVoxels) {
                    throw new Error(
                        `Binary volume size mismatch: received ${int16Array.length} voxels, ` +
                        `expected ${expectedVoxels} from shape ${JSON.stringify(metadata.shape)}.`
                    );
                }

                setLoadingStage("Rendering volume...");
                // Colon-free deliberately - see cornerstoneSetup.js's
                // createVolumeFromBackendData() for why a colon anywhere in
                // the resulting volumeId breaks Cornerstone's own default-VOI
                // computation for locally-created volumes.
                const volumeKey = `${seriesId}-${selectedAcquisitionNumber}`;
                const { volumeId } = createVolumeFromBackendData(volumeKey, metadata, int16Array);
                volumeIdRef.current = volumeId;

                await setVolumesForViewports(
                    renderingEngineRef.current,
                    [{ volumeId }],
                    MPR_VIEWPORT_IDS
                );
                if (cancelled) return;

                for (const vpId of MPR_VIEWPORT_IDS) {
                    renderingEngineRef.current.getViewport(vpId)?.resetCamera();
                }
                renderingEngineRef.current.render();
                setLoadingStage("");
            } catch (err) {
                if (cancelled) return;
                console.error("Failed to load 3D volume:", err);
                setLoadError(
                    err.message || "Failed to load the 3D volume. The DICOM series may have "
                    + "expired, or this acquisition's geometry may not support 3D reconstruction."
                );
                setLoadingStage("");
            }
        }

        loadVolume();

        return () => {
            cancelled = true;
            removeVolumeFromCache(volumeIdRef.current);
            volumeIdRef.current = null;
            try {
                const toolGroup = ToolGroupManager.getToolGroup(TOOL_GROUP_ID);
                // viewportId omitted deliberately - confirmed from the real
                // ToolGroup.removeViewports() source that this removes ALL
                // viewports registered for this renderingEngineId at once
                // (all three MPR orientations), rather than one at a time.
                toolGroup?.removeViewports(RENDERING_ENGINE_ID);
                // The 3D viewport (if currently enabled) lives on this SAME
                // shared engine - destroy() below tears it down too, but
                // its ToolGroup is cleaned up explicitly here for hygiene.
                const toolGroup3D = ToolGroupManager.getToolGroup(TOOL_GROUP_ID_3D);
                toolGroup3D?.removeViewports(RENDERING_ENGINE_ID, VIEWPORT_ID_3D);
                renderingEngineRef.current?.destroy();
            } catch {
                // Best-effort cleanup only, matching the project's existing pattern.
            }
            renderingEngineRef.current = null;
            viewportRef.current = null;
            viewport3DRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [setupError, selectedAcquisitionNumber, seriesId]);

    // --- Genuine VOLUME_3D mode - enables a SECOND viewport on the SAME
    // shared RenderingEngine (renderingEngineRef.current), created and
    // owned by the MPR effect above. Does NOT construct a new
    // RenderingEngine - this is the confirmed fix for
    // "bindTexture: object does not belong to this context" (the volume's
    // GPU texture is tied to whichever WebGLContextPool first rendered
    // it; a second, independent RenderingEngine has its own separate
    // pool, and the two are not GPU-resource-compatible - verified from
    // the installed @cornerstonejs/core source). Gated on
    // renderingEngineRef.current already existing - by the time the user
    // can click the 3D toggle at all, the MPR effect has already run and
    // created it (the toggle only renders after acquisition selection,
    // which is strictly after the MPR effect's synchronous engine
    // construction).
    //
    // Deliberately does NOT fetch metadata/data again and does NOT call
    // createVolumeFromBackendData() again - reuses the exact same
    // already-cached volumeId. This effect's cleanup NEVER calls
    // renderingEngine.destroy() - only disableElement() for the 3D
    // viewport specifically, per instruction: switching mode must not
    // destroy the shared engine the MPR viewport still needs. Full
    // engine teardown remains solely the MPR effect's responsibility
    // (acquisition change/unmount).
    useEffect(() => {
        if (mode !== "3d" || !renderingEngineRef.current || !element3DRef.current) return;

        const renderingEngine = renderingEngineRef.current;

        try {
            setSetup3DError("");
            ensureGPUModeForVolumeViewer();

            if (!volume3DToolsRegisteredGlobally) {
                addTool(TrackballRotateTool);
                volume3DToolsRegisteredGlobally = true;
            }

            renderingEngine.enableElement({
                viewportId: VIEWPORT_ID_3D,
                type: CoreEnums.ViewportType.VOLUME_3D,
                element: element3DRef.current,
                defaultOptions: { background: [0, 0, 0] },
            });

            const viewport3D = renderingEngine.getViewport(VIEWPORT_ID_3D);
            viewport3DRef.current = viewport3D;

            let toolGroup3D = ToolGroupManager.getToolGroup(TOOL_GROUP_ID_3D);
            if (!toolGroup3D) {
                toolGroup3D = ToolGroupManager.createToolGroup(TOOL_GROUP_ID_3D);
                toolGroup3D.addTool(PanTool.toolName);
                toolGroup3D.addTool(ZoomTool.toolName);
                toolGroup3D.addTool(TrackballRotateTool.toolName);
                toolGroup3D.setToolActive(PanTool.toolName, {
                    bindings: [{ mouseButton: ToolEnums.MouseBindings.Primary }],
                });
                toolGroup3D.setToolActive(ZoomTool.toolName, {
                    bindings: [{ mouseButton: ToolEnums.MouseBindings.Secondary }],
                });
                // Middle-drag - does not conflict with Pan (left)/Zoom
                // (right)/StackScroll (wheel, intentionally NOT registered
                // on this ToolGroup at all - slice scrolling belongs only
                // to the MPR viewport, per requirement).
                toolGroup3D.setToolActive(TrackballRotateTool.toolName, {
                    bindings: [{ mouseButton: ToolEnums.MouseBindings.Auxiliary }],
                });
            }
            // Same RENDERING_ENGINE_ID as MPR - this IS the shared engine.
            toolGroup3D.addViewport(VIEWPORT_ID_3D, RENDERING_ENGINE_ID);

            setVolumesForViewports(
                renderingEngine,
                [{ volumeId: volumeIdRef.current }],
                [VIEWPORT_ID_3D]
            ).then(() => {
                viewport3DRef.current?.resetCamera();
                renderingEngine.render();
            }).catch((err) => {
                console.error("Failed to attach volume to 3D viewport:", err);
                setSetup3DError(err.message || "Failed to render the 3D volume.");
            });
        } catch (err) {
            console.error("3D volume viewport setup failed:", err);
            setSetup3DError("The 3D volume view could not be initialized in this browser.");
        }

        return () => {
            try {
                const toolGroup3D = ToolGroupManager.getToolGroup(TOOL_GROUP_ID_3D);
                toolGroup3D?.removeViewports(RENDERING_ENGINE_ID, VIEWPORT_ID_3D);
                // disableElement (NOT destroy) - removes ONLY this viewport
                // from the shared engine, leaving the engine itself and the
                // MPR viewport fully intact. Wrapped in try/catch: if the
                // MPR effect's cleanup has already destroyed the whole
                // engine first (e.g. on unmount, where both effects' cleanups
                // run), this call becomes a safe no-op rather than a crash.
                renderingEngineRef.current?.disableElement(VIEWPORT_ID_3D);
            } catch {
                // Best-effort cleanup only, matching the project's existing pattern.
            }
            viewport3DRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode]);

    // Phase 05B: the three MPR panels changed from tab-switched
    // (one panel at near-full size at a time) to a simultaneous grid
    // (all three at roughly 1/2-1/4 the previous size). Cornerstone's
    // viewports were sized correctly at creation time for the OLD
    // layout; when the panels first appear in the new, smaller grid
    // (or when returning to MPR mode after visiting 3D), their actual
    // DOM size has changed and Cornerstone needs to be told, via its
    // own real, public resize() API (confirmed from the installed
    // @cornerstonejs/core source: RenderingEngine.resize(immediate,
    // keepCamera) re-reads each viewport's current DOM element size and
    // re-fits VTK's render targets/cameras accordingly - keepCamera=true
    // preserves the current pan/zoom/slice position rather than
    // resetting it). requestAnimationFrame ensures the browser has
    // actually completed layout for the new grid before Cornerstone
    // reads element sizes - not just assumed React's commit is enough.
    useEffect(() => {
        if (mode !== "mpr" || !renderingEngineRef.current) return;
        const raf = requestAnimationFrame(() => {
            renderingEngineRef.current?.resize(true, true);
        });
        return () => cancelAnimationFrame(raf);
    }, [mode]);

    // --- MPR window/level presets - applied to ALL THREE MPR viewports
    // at once (Axial/Coronal/Sagittal), so the chosen window stays
    // consistent when switching between orientations, matching how
    // real radiology viewers apply windowing per-study rather than
    // per-plane. Uses the SAME setProperties({voiRange}) mechanism the
    // existing 2D DicomViewerPage.jsx already uses for StackViewport -
    // confirmed from the installed @cornerstonejs/core source that
    // BaseVolumeViewport.setProperties() accepts the identical
    // { voiRange: { lower, upper } } shape.
    function applyMprWindowPreset(key) {
        const preset = MPR_WINDOW_PRESETS[key];
        if (!preset || !renderingEngineRef.current) return;
        const lower = preset.wc - preset.ww / 2;
        const upper = preset.wc + preset.ww / 2;
        for (const vpId of MPR_VIEWPORT_IDS) {
            renderingEngineRef.current.getViewport(vpId)?.setProperties({ voiRange: { lower, upper } });
        }
        renderingEngineRef.current.render();
        setMprWindowPresetKey(key);
    }

    // --- 3D volume-rendering presets - REAL named presets applied via
    // viewport.setProperties({ preset: name }), confirmed from the
    // installed source to resolve through VIEWPORT_PRESETS and call
    // applyPreset() on the existing volume actor already attached to
    // the VOLUME_3D viewport - does not create a new actor, does not
    // touch the volume mapper's data, only its color/opacity transfer
    // functions. "Default" has no equivalent named preset in this
    // installed version - implemented instead by re-attaching the
    // already-cached volume (same volumeIdRef.current, no re-fetch),
    // which resets the actor to its natural, unmodified rendering.
    function applyRender3DPreset(key) {
        const preset = RENDER_3D_PRESETS[key];
        const renderingEngine = renderingEngineRef.current;
        if (!preset || !renderingEngine || !volumeIdRef.current) return;

        if (preset.presetName === null) {
            setVolumesForViewports(
                renderingEngine,
                [{ volumeId: volumeIdRef.current }],
                [VIEWPORT_ID_3D]
            ).then(() => {
                renderingEngine.render();
            }).catch((err) => {
                console.error("Failed to reset 3D rendering to default:", err);
            });
        } else {
            renderingEngine.getViewport(VIEWPORT_ID_3D)?.setProperties({ preset: preset.presetName });
            renderingEngine.render();
        }
        setRender3DPresetKey(key);
    }

    // Background color is only consumed ONCE by Cornerstone, at the
    // moment the underlying VTK renderer is first created (confirmed
    // from the real installed ContextPoolRenderingEngine source - no
    // public Cornerstone API re-applies it afterward). Changing it later
    // requires reaching the underlying VTK renderer directly via the
    // real, public viewport.getRenderer() method and calling its own
    // setBackground() (a genuine VTK.js Renderer API) - not a Cornerstone
    // workaround, this is the actual supported way to reach VTK-level
    // rendering state Cornerstone doesn't wrap.
    function applyBackground3D(mode) {
        const renderingEngine = renderingEngineRef.current;
        const viewport3D = renderingEngine?.getViewport(VIEWPORT_ID_3D);
        const renderer = viewport3D?.getRenderer?.();
        if (!renderer) return;
        renderer.setBackground(mode === "white" ? [1, 1, 1] : [0, 0, 0]);
        renderingEngine.render();
        setBackground3D(mode);
    }

    if (setupError) {
        return (
            <div className="page-enter">
                <PageHeader
                    title="3D Volume Viewer"
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

    // --- Acquisition loading / error states, shown BEFORE any viewport --
    if (acquisitionsLoading || (!acquisitions && !acquisitionsError)) {
        return (
            <div className="page-enter">
                <PageHeader
                    title="3D Volume Viewer"
                    subtitle="Checking available acquisitions..."
                    onBack={onBack}
                />
                <div className="card padded" style={{ textAlign: "center", padding: 48 }}>
                    <Loader size={28} className="spin" />
                </div>
            </div>
        );
    }

    if (acquisitionsError && !selectedAcquisitionNumber) {
        return (
            <div className="page-enter">
                <PageHeader
                    title="3D Volume Viewer"
                    subtitle="Unable to load this series"
                    onBack={onBack}
                />
                <div className="card padded">
                    <div className="error-box">
                        <AlertTriangle size={16} />
                        <span>{acquisitionsError}</span>
                    </div>
                    {acquisitions && acquisitions.length > 0 && (
                        <div style={{ marginTop: 16 }}>
                            {acquisitions.map((a) => (
                                <div key={a.acquisition_number ?? "default"} className="dicom-tool-hint" style={{ marginBottom: 6 }}>
                                    Acquisition {a.acquisition_number ?? "(default)"}: {a.slice_count} slices -
                                    {a.valid ? " usable" : ` unavailable (${a.rejection_reason || "geometry invalid"})`}
                                </div>
                            ))}
                        </div>
                    )}
                    <Button variant="primary" onClick={onBack} style={{ marginTop: 16 }}>
                        Back to 2D Viewer
                    </Button>
                </div>
            </div>
        );
    }

    // --- Acquisition SELECTOR - shown only when multiple valid
    // acquisitions exist and none has been chosen yet. The viewport has
    // NOT been initialized at this point. ---------------------------------
    if (classification === "multiple_acquisitions" && !selectedAcquisitionNumber) {
        return (
            <div className="page-enter">
                <PageHeader
                    title="3D Volume Viewer"
                    subtitle="This series contains multiple acquisitions - select one"
                    onBack={onBack}
                />
                <div className="card padded">
                    {acquisitions.map((a) => (
                        <div
                            key={a.acquisition_number}
                            className="dicom-controls"
                            style={{ marginBottom: 12, opacity: a.valid ? 1 : 0.5 }}
                        >
                            <div className="dicom-window-row" style={{ justifyContent: "space-between" }}>
                                <div>
                                    <div style={{ fontWeight: 600 }}>Acquisition {a.acquisition_number}</div>
                                    <div className="dicom-tool-hint">
                                        {a.slice_count} slices
                                        {a.acquisition_time && a.acquisition_time.length > 0
                                            ? ` \u00b7 Acquisition time: ${formatAcquisitionTime(a.acquisition_time[0])}`
                                            : ""}
                                        {!a.valid && ` \u00b7 Unavailable: ${a.rejection_reason || "geometry invalid"}`}
                                    </div>
                                </div>
                                <Button
                                    variant="primary"
                                    disabled={!a.valid}
                                    onClick={() => setSelectedAcquisitionNumber(a.acquisition_number)}
                                >
                                    Open 3D Volume
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // --- Viewport - only reached once an acquisition is selected --------
    return (
        <div className="page-enter">
            <PageHeader
                title="3D Volume Viewer"
                subtitle={
                    selectedAcquisitionNumber
                        ? `Acquisition ${selectedAcquisitionNumber} - rotate, pan, and zoom`
                        : "Reconstructed CT volume - rotate, pan, and zoom"
                }
                onBack={onBack}
            />

            <div className="card padded dicom-viewer-card">
                <div className="dicom-tool-row" style={{ marginBottom: 12 }}>
                    <Button
                        variant={mode === "mpr" ? "primary" : "secondary"}
                        onClick={() => setMode("mpr")}
                    >
                        MPR
                    </Button>
                    <Button
                        variant={mode === "3d" ? "primary" : "secondary"}
                        onClick={() => setMode("3d")}
                    >
                        3D
                    </Button>
                </div>

                {mode === "mpr" && (
                    <div className="dicom-tool-row" style={{ marginBottom: 12 }}>
                        <span className="dicom-window-label">Window:</span>
                        {Object.entries(MPR_WINDOW_PRESETS).map(([key, preset]) => (
                            <Button
                                key={key}
                                variant={mprWindowPresetKey === key ? "primary" : "secondary"}
                                onClick={() => applyMprWindowPreset(key)}
                            >
                                {preset.label}
                            </Button>
                        ))}
                    </div>
                )}

                {mode === "3d" && (
                    <div className="dicom-tool-row" style={{ marginBottom: 12 }}>
                        <span className="dicom-window-label">Rendering:</span>
                        {Object.entries(RENDER_3D_PRESETS).map(([key, preset]) => (
                            <Button
                                key={key}
                                variant={render3DPresetKey === key ? "primary" : "secondary"}
                                onClick={() => applyRender3DPreset(key)}
                            >
                                {preset.label}
                            </Button>
                        ))}
                    </div>
                )}

                {mode === "3d" && (
                    <div className="dicom-tool-row" style={{ marginBottom: 12 }}>
                        <span className="dicom-window-label">Background:</span>
                        <Button
                            variant={background3D === "black" ? "primary" : "secondary"}
                            onClick={() => applyBackground3D("black")}
                        >
                            Black
                        </Button>
                        <Button
                            variant={background3D === "white" ? "primary" : "secondary"}
                            onClick={() => applyBackground3D("white")}
                        >
                            White
                        </Button>
                    </div>
                )}

                {/* Phase 05B: all three MPR panels shown simultaneously in a
                    grid instead of tab-switched display:none/block. The
                    underlying viewport refs/IDs/Cornerstone setup are
                    completely unchanged from Phase 05A - only this
                    presentation layer changed. A single shared loading/error
                    indicator covers the grid (all three load together via
                    one setVolumesForViewports call, same as before). */}
                <div
                    style={{
                        display: mode === "mpr" ? "grid" : "none",
                        gridTemplateColumns: "1fr 1fr",
                        gridTemplateRows: "260px 260px",
                        gap: 8,
                    }}
                >
                    <div className="dicom-viewport-wrap" style={{ position: "relative", height: 260, minHeight: 260 }}>
                        <span style={{
                            position: "absolute", top: 6, left: 8, zIndex: 1,
                            fontSize: 11, fontWeight: 700, letterSpacing: "0.05em",
                            color: "rgba(255,255,255,0.85)", textShadow: "0 1px 2px rgba(0,0,0,0.6)",
                        }}>AXIAL</span>
                        <div ref={elementAxialRef} className="dicom-viewport" style={{ width: "100%", height: "100%" }} />
                    </div>

                    <div className="dicom-viewport-wrap" style={{ position: "relative", height: 260, minHeight: 260 }}>
                        <span style={{
                            position: "absolute", top: 6, left: 8, zIndex: 1,
                            fontSize: 11, fontWeight: 700, letterSpacing: "0.05em",
                            color: "rgba(255,255,255,0.85)", textShadow: "0 1px 2px rgba(0,0,0,0.6)",
                        }}>CORONAL</span>
                        <div ref={elementCoronalRef} className="dicom-viewport" style={{ width: "100%", height: "100%" }} />
                    </div>

                    <div
                        className="dicom-viewport-wrap"
                        style={{ position: "relative", height: 260, minHeight: 260, gridColumn: "1 / span 2" }}
                    >
                        <span style={{
                            position: "absolute", top: 6, left: 8, zIndex: 1,
                            fontSize: 11, fontWeight: 700, letterSpacing: "0.05em",
                            color: "rgba(255,255,255,0.85)", textShadow: "0 1px 2px rgba(0,0,0,0.6)",
                        }}>SAGITTAL</span>
                        <div ref={elementSagittalRef} className="dicom-viewport" style={{ width: "100%", height: "100%" }} />
                    </div>

                    {loadingStage && mode === "mpr" && (
                        <div
                            className="dicom-viewport-loading"
                            style={{ gridColumn: "1 / span 2", gridRow: "1 / span 2" }}
                        >
                            <Loader size={28} className="spin" color="#fff" />
                            <span style={{ color: "#fff", marginTop: 8 }}>{loadingStage}</span>
                        </div>
                    )}
                </div>

                <div
                    className="dicom-viewport-wrap"
                    style={{ height: 480, minHeight: 480, display: mode === "3d" ? "block" : "none" }}
                >
                    <div
                        ref={element3DRef}
                        className="dicom-viewport"
                        style={{ width: "100%", height: 480, minHeight: 480 }}
                    />
                </div>

                {loadError && mode === "mpr" && (
                    <div className="error-box" style={{ marginTop: 12 }}>
                        <AlertTriangle size={16} />
                        <span>{loadError}</span>
                    </div>
                )}

                {setup3DError && mode === "3d" && (
                    <div className="error-box" style={{ marginTop: 12 }}>
                        <AlertTriangle size={16} />
                        <span>{setup3DError}</span>
                    </div>
                )}

                <div className="dicom-tool-row" style={{ marginTop: 12 }}>
                    <span className="dicom-tool-hint">
                        {mode === "mpr"
                            ? "Drag to pan · right-drag to zoom · scroll to change slice"
                            : "Drag to pan · right-drag to zoom · middle-drag to rotate"}
                    </span>
                </div>
            </div>
        </div>
    );
}