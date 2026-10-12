import { useState } from "react";
import { CheckCircle, AlertTriangle, Eye } from "lucide-react";
import { useTheme } from "../../../context/ThemeContext";
import { BASE_URL } from "../../../api/client";
import Card from "../../../components/ui/Card";
import Pill from "../../../components/ui/Pill";
import ConfidenceBar from "../../../components/ui/ConfidenceBar";
import SectionLabel from "../../../components/ui/SectionLabel";
import Button from "../../../components/ui/Button";
import { URGENCY_COLORS } from "../../../utils/constants";

// Component-4-specific result card. Deliberately SEPARATE from the
// shared ResultCard.jsx (used by Components 1-3) rather than modifying
// it - ResultCard.jsx is untouched by this file entirely. Reuses the
// SAME underlying primitives (Card, Pill, ConfidenceBar,
// URGENCY_COLORS) so it stays visually consistent with the rest of the
// application without duplicating shared styling decisions.
//
// classProbabilities is OPTIONAL - the DICOM /analyze response
// deliberately was NOT changed this step (explicit instruction), so it
// has no class_probabilities field. When absent, that section is
// simply omitted - never fabricated, never defaulted to fake values.
//
// Real display order (Adenocarcinoma / Squamous Cell / Large Cell /
// Normal) is NOT hardcoded - classProbabilities is rendered by
// iterating its own real keys, sorted by actual probability
// descending, so it always reflects the real model output regardless
// of dict key order.

const CLASS_LABELS = {
    normal: "Normal",
    "adenocarcinoma": "Adenocarcinoma",
    "large.cell.carcinoma": "Large Cell Carcinoma",
    "squamous.cell.carcinoma": "Squamous Cell Carcinoma",
};

function classLabel(key) {
    return CLASS_LABELS[key] || key;
}

// Moved from LungCancerAnalysis.jsx - same real fix from earlier this
// project (confirmed from gradcam.py: heatmap_url is a relative path,
// not base64 - HeatmapCard.jsx's hardcoded base64 wrapping is
// incompatible with it, hence this dedicated renderer). Logic
// unchanged, only relocated so "View Grad-CAM" can toggle it locally.
const API_ROOT = BASE_URL.replace(/\/api\/v1\/?$/, "");

function resolveHeatmapSrc(path) {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    return `${API_ROOT}${path.startsWith("/") ? "" : "/"}${path}`;
}

// Single-image fallback - used ONLY by the DICOM result flow, which has
// neither a frontend-held original image nor the DenseNet/Custom/Combined
// backend fields (its backend contract was deliberately NOT changed).
// This keeps the DICOM branch's existing, simple Grad-CAM presentation
// exactly as it already works today.
function GradCamImage({ path, title = "Grad-CAM Heatmap", emptyText = "No abnormality detected in this scan." }) {
    const { t } = useTheme();
    const src = resolveHeatmapSrc(path);

    if (!src) {
        return (
            <Card style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12 }}>
                <CheckCircle size={22} color="#22c55e" />
                <div>
                    <div style={{ fontWeight: 600 }}>No region highlighting required</div>
                    <div style={{ fontSize: 13, color: t.dim }}>{emptyText}</div>
                </div>
            </Card>
        );
    }

    return (
        <Card style={{ marginTop: 12 }}>
            <SectionLabel>{title}</SectionLabel>
            <img src={src} alt={title} style={{ width: "100%", borderRadius: 10, display: "block" }} />
            <div style={{ marginTop: 10, fontSize: 12, color: t.dim, textAlign: "center" }}>
                <span style={{ color: "#0000ff" }}>■</span> Low &nbsp;
                <span style={{ color: "#00ff00" }}>■</span> Medium &nbsp;
                <span style={{ color: "#ffff00" }}>■</span> High &nbsp;
                <span style={{ color: "#ff0000" }}>■</span> Very High
            </div>
        </Card>
    );
}

// Small stat tile used in the Combined view's Branch Comparison grid.
function Stat({ t, label, value }) {
    return (
        <div style={{ border: `1px solid ${t.border}`, borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 11.5, color: t.dim, marginBottom: 4, lineHeight: 1.35 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: t.text, fontVariantNumeric: "tabular-nums" }}>{value}</div>
        </div>
    );
}

// Grad-CAM explorer (PNG flow only): Original | DenseNet121 | Custom CNN |
// Combined. Each of DenseNet121/Custom CNN/Combined is already a
// backend-composited image (generate_gradcam() / generate_combined_gradcam())
// - this component only displays them, it performs no heatmap computation
// or image compositing of its own.
//
// Exported (named export) so LungCancerAnalysis.jsx can render it in its
// own full-width section below the two-column analysis row.
//
// LAYOUT: the image sits on the left, and the legend / branch-comparison
// metrics sit beside it on the right (stacked below on narrow screens),
// instead of a centred image with full-width stretched rows underneath.
// Same tabs, same image URLs, same legends, same metrics and wording as
// before - only their arrangement changed.
//
// Tabs are built from whichever URLs are actually present, so a result
// missing one of the backend fields degrades gracefully rather than
// showing a broken tab.
export function GradCamExplorer({
                                    originalImageSrc,
                                    densenetGradcamUrl,
                                    customGradcamUrl,
                                    combinedGradcamUrl,
                                    comparisonMetrics,
                                    title = "Grad-CAM Explanation",
                                    cardStyle = { marginTop: 12 },
                                }) {
    const { t } = useTheme();

    const densenetSrc = resolveHeatmapSrc(densenetGradcamUrl);
    const customSrc = resolveHeatmapSrc(customGradcamUrl);
    const combinedSrc = resolveHeatmapSrc(combinedGradcamUrl);

    const tabs = [
        { key: "original", label: "Original", src: originalImageSrc },
        { key: "densenet", label: "DenseNet121", src: densenetSrc },
        { key: "custom", label: "Custom CNN", src: customSrc },
        { key: "combined", label: "Combined", src: combinedSrc },
    ].filter((tab) => Boolean(tab.src));

    const [activeTab, setActiveTab] = useState(tabs[0]?.key ?? "original");

    if (tabs.length === 0) {
        return null;
    }

    const current = tabs.find((tab) => tab.key === activeTab) ?? tabs[0];

    const panelHeading = { fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 6 };
    const panelText = { fontSize: 12.5, color: t.dim, lineHeight: 1.55 };

    return (
        <Card style={cardStyle}>
            <SectionLabel>{title}</SectionLabel>
            <div style={{ fontSize: 12.5, color: t.dim, marginBottom: 14, lineHeight: 1.5 }}>
                Grad-CAM highlights class-relevant regions contributing to the
                classification decision. It is not segmentation or lesion detection.
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
                {tabs.map((tab) => (
                    <Button
                        key={tab.key}
                        variant={current.key === tab.key ? "primary" : "secondary"}
                        onClick={() => setActiveTab(tab.key)}
                    >
                        {tab.label}
                    </Button>
                ))}
            </div>

            <div className="lung-gradcam-body">
                {/* Left: the selected image. 224x224 backend output is square,
                    so a 1:1 box with object-fit: contain keeps it fully
                    visible and undistorted at any width. */}
                <div
                    style={{
                        width: "100%",
                        maxWidth: 620,
                        aspectRatio: "1 / 1",
                        borderRadius: 12,
                        overflow: "hidden",
                        background: t.border,
                    }}
                >
                    <img
                        src={current.src}
                        alt={`${current.label} view`}
                        style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                    />
                </div>

                {/* Right: what this view is + its legend / metrics. */}
                <div style={{ display: "grid", gap: 18, alignContent: "start" }}>
                    {current.key === "original" && (
                        <div>
                            <div style={panelHeading}>Original CT image</div>
                            <div style={panelText}>
                                The uploaded image, shown for comparison with the Grad-CAM views.
                            </div>
                        </div>
                    )}

                    {(current.key === "densenet" || current.key === "custom") && (
                        <div>
                            <div style={panelHeading}>
                                {current.key === "densenet" ? "DenseNet121 branch" : "Custom CNN branch"}
                            </div>
                            <div style={{ ...panelText, marginBottom: 10 }}>Activation intensity</div>
                            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12, color: t.dim }}>
                                <span><span style={{ color: "#0000ff" }}>■</span> Low</span>
                                <span><span style={{ color: "#00ff00" }}>■</span> Medium</span>
                                <span><span style={{ color: "#ffff00" }}>■</span> High</span>
                                <span><span style={{ color: "#ff0000" }}>■</span> Very High</span>
                            </div>
                        </div>
                    )}

                    {current.key === "combined" && (
                        <>
                            <div>
                                <div style={panelHeading}>Combined view</div>
                                {/* Legend matches combined_gradcam.py's DENSENET_COLOR /
                                    CUSTOM_COLOR exactly: DenseNet121 = blue, Custom CNN = orange. */}
                                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12.5, color: t.dim, marginBottom: 8 }}>
                                    <span><span style={{ color: "rgb(0,114,178)" }}>■</span> DenseNet121</span>
                                    <span><span style={{ color: "rgb(230,159,0)" }}>■</span> Custom CNN</span>
                                </div>
                                <div style={panelText}>
                                    Overlapping activation appears as a blend of both colors; the
                                    outlines mark each branch's activated region.
                                </div>
                            </div>

                            {comparisonMetrics && (
                                <div>
                                    <div style={panelHeading}>Branch Comparison</div>
                                    <div className="lung-gradcam-stats">
                                        <Stat
                                            t={t}
                                            label="Spatial overlap (IoU)"
                                            value={`${(comparisonMetrics["iou_at_0.5"] * 100).toFixed(1)}%`}
                                        />
                                        <Stat
                                            t={t}
                                            label="Center distance between branches"
                                            value={`${comparisonMetrics["center_of_mass_distance_px"].toFixed(1)}px`}
                                        />
                                        <Stat
                                            t={t}
                                            label="DenseNet121 activated area"
                                            value={`${(comparisonMetrics["dense_area_above_0.5"] * 100).toFixed(1)}%`}
                                        />
                                        <Stat
                                            t={t}
                                            label="Custom CNN activated area"
                                            value={`${(comparisonMetrics["custom_area_above_0.5"] * 100).toFixed(1)}%`}
                                        />
                                    </div>
                                    <div style={{ ...panelText, marginTop: 12, fontStyle: "italic", fontSize: 12 }}>
                                        These metrics quantify the spatial difference between the two
                                        Grad-CAM activation maps. They do not indicate clinical accuracy
                                        or prove tumor localization.
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </Card>
    );
}

function ProbabilityRow({ t, label, value, isTop }) {
    const pct = Math.round(value * 1000) / 10; // real value, one decimal
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 172, flexShrink: 0, whiteSpace: "nowrap", fontSize: 12.5, color: isTop ? t.text : t.dim, fontWeight: isTop ? 600 : 400 }}>
                {label}
            </div>
            <div style={{ flex: 1, height: 8, borderRadius: 4, background: t.border, overflow: "hidden" }}>
                <div
                    style={{
                        width: `${pct}%`,
                        height: "100%",
                        borderRadius: 4,
                        background: isTop ? "#ef4444" : t.dim,
                    }}
                />
            </div>
            <div style={{ width: 46, fontSize: 12.5, textAlign: "right", color: t.dim, fontVariantNumeric: "tabular-nums" }}>
                {pct}%
            </div>
        </div>
    );
}

function Row({ t, label, children }) {
    return (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
            <span style={{ color: t.dim }}>{label}</span>{children}
        </div>
    );
}

// Phase 2: inputCheck is OPTIONAL - the DICOM /analyze response was
// deliberately NOT changed this phase (real, confirmed: check_mobilenet_ood
// is only called in the PNG path), so DICOM results have no inputCheck
// field. Rendered from the real within_distribution boolean the backend
// actually returns - never assumes True, never fabricates a graded
// score. Deliberately does NOT show the raw distance/threshold
// prominently (per the Phase 2 audit: a 1280-dim feature-space distance
// has no intuitive meaning to a user on its own) - wording states only
// what the check actually measures, and is NOT a diagnostic or
// confidence claim.
function InputCheckRow({ t, inputCheck }) {
    if (!inputCheck) return null;
    const ok = inputCheck.within_distribution;
    return (
        <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, color: t.dim, marginBottom: 6, fontWeight: 600 }}>
                Input Check
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                {ok
                    ? <CheckCircle size={16} color="#22c55e" />
                    : <AlertTriangle size={16} color="#f59e0b" />}
                <span style={{ color: ok ? t.text : "#f59e0b" }}>
                    {ok
                        ? "Input is within the model's expected feature distribution"
                        : "Input is outside the model's calibrated feature distribution"}
                </span>
            </div>
        </div>
    );
}

export default function LungResultCard({
                                           prediction,
                                           confidence,
                                           isPositive,
                                           urgency,
                                           classProbabilities, // optional - see note above
                                           inputCheck,          // optional - Phase 2, see note below
                                           heatmapPath,        // optional - DICOM fallback view (GradCamImage)
                                           originalImageSrc,   // optional - PNG only, used by the UNCONTROLLED inline explorer
                                           densenetGradcamUrl,  // optional - PNG only, DenseNet121 branch view (uncontrolled mode)
                                           customGradcamUrl,    // optional - PNG only, Custom CNN branch view (uncontrolled mode)
                                           combinedGradcamUrl,  // optional - PNG only, dual-branch comparison view (uncontrolled mode)
                                           comparisonMetrics,   // optional - PNG only, real computed metrics dict (uncontrolled mode)
                                           extras = [],
                                           // --- NEW, both optional, both backward compatible ---------------------
                                           // Every EXISTING caller (the DICOM result flow, below) omits these two
                                           // props, so isControlled is false and this card behaves EXACTLY as
                                           // before: internal useState, Grad-CAM body (GradCamExplorer when
                                           // originalImageSrc is present, otherwise the GradCamImage fallback)
                                           // rendered inline under the button. Only the NEW PNG call site in
                                           // LungCancerAnalysis.jsx passes these, making the button
                                           // parent-controlled and suppressing the inline body (the parent then
                                           // renders GradCamExplorer itself, in its own full-width section).
                                           gradCamVisible,
                                           onToggleGradCam,
                                       }) {
    const { t } = useTheme();
    const [internalShowGradCam, setInternalShowGradCam] = useState(false);

    const isControlled = typeof onToggleGradCam === "function";
    const showGradCam = isControlled ? Boolean(gradCamVisible) : internalShowGradCam;
    const toggleGradCam = isControlled ? onToggleGradCam : () => setInternalShowGradCam((v) => !v);

    // Sorted by real probability, descending - not a hardcoded class order.
    const sortedProbs = classProbabilities
        ? Object.entries(classProbabilities).sort((a, b) => b[1] - a[1])
        : null;
    const topClassKey = sortedProbs?.[0]?.[0];

    return (
        <Card style={{ borderLeft: `4px solid ${isPositive ? "#ef4444" : "#22c55e"}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: t.dim, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>
                    Prediction Information
                </span>
                <Pill tone={isPositive ? "danger" : "success"}>{isPositive ? "Positive" : "Normal"}</Pill>
            </div>

            <div style={{ fontSize: 22, fontWeight: 700, color: isPositive ? "#ef4444" : "#22c55e", marginBottom: 14 }}>
                {prediction}
            </div>

            <div style={{ display: "grid", gap: 11 }}>
                <div>
                    <div style={{ fontSize: 12, color: t.dim, marginBottom: 5 }}>Confidence</div>
                    <ConfidenceBar value={confidence} status={isPositive ? "Positive" : "Normal"} />
                </div>

                {urgency && (
                    <Row t={t} label="Urgency"><strong style={{ color: URGENCY_COLORS[urgency] }}>{urgency}</strong></Row>
                )}
                {extras.map(({ label, value }) => (
                    <Row key={label} t={t} label={label}><strong>{value}</strong></Row>
                ))}
            </div>

            {sortedProbs && (
                <div style={{ marginTop: 18 }}>
                    <div style={{ fontSize: 12, color: t.dim, marginBottom: 8, fontWeight: 600 }}>
                        Class Probabilities
                    </div>
                    {sortedProbs.map(([key, value]) => (
                        <ProbabilityRow
                            key={key}
                            t={t}
                            label={classLabel(key)}
                            value={value}
                            isTop={key === topClassKey}
                        />
                    ))}
                </div>
            )}

            <InputCheckRow t={t} inputCheck={inputCheck} />

            <Button
                variant="secondary"
                onClick={toggleGradCam}
                style={{ marginTop: 16 }}
            >
                <Eye size={14} /> {showGradCam ? "Hide Grad-CAM" : "View Grad-CAM"}
            </Button>

            {/* Uncontrolled path only (no onToggleGradCam prop - this is the
                DICOM result flow today, and any other future caller that
                doesn't opt in): render the Grad-CAM body inline, exactly as
                before - GradCamExplorer when originalImageSrc is supplied,
                otherwise the GradCamImage single-heatmap fallback. The
                controlled path (new PNG layout) renders nothing here - the
                parent shows GradCamExplorer in its own full-width section. */}
            {!isControlled && showGradCam && (
                originalImageSrc
                    ? <GradCamExplorer
                        originalImageSrc={originalImageSrc}
                        densenetGradcamUrl={densenetGradcamUrl}
                        customGradcamUrl={customGradcamUrl}
                        combinedGradcamUrl={combinedGradcamUrl}
                        comparisonMetrics={comparisonMetrics}
                    />
                    : <GradCamImage path={heatmapPath} />
            )}
        </Card>
    );
}