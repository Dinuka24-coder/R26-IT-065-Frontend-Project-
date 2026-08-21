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

function ProbabilityRow({ t, label, value, isTop }) {
    const pct = Math.round(value * 1000) / 10; // real value, one decimal
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 150, fontSize: 12.5, color: isTop ? t.text : t.dim, fontWeight: isTop ? 600 : 400 }}>
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
                                           heatmapPath,        // optional - passed straight to GradCamImage
                                           extras = [],
                                       }) {
    const { t } = useTheme();
    const [showGradCam, setShowGradCam] = useState(false);

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
                onClick={() => setShowGradCam((v) => !v)}
                style={{ marginTop: 16 }}
            >
                <Eye size={14} /> {showGradCam ? "Hide Grad-CAM" : "View Grad-CAM"}
            </Button>

            {showGradCam && <GradCamImage path={heatmapPath} />}
        </Card>
    );
}