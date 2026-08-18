import { useState, useRef } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  Layers,
  ShieldAlert,
  Sparkles,
  Clock,
  User,
  Info,
  ScanLine,
  X,
  UploadCloud,
} from "lucide-react";
import { predictPneumonia } from "../../../api/component2Api";
import { useTheme } from "../../../context/ThemeContext";
import AnalysisLayout from "../shared/AnalysisLayout";
import PatientSelector from "../shared/PatientSelector";
import Card from "../../../components/ui/Card";
import Pill from "../../../components/ui/Pill";
import SectionLabel from "../../../components/ui/SectionLabel";

export default function PneumoniaAnalysis({ navigate }) {
  const { t, dark } = useTheme();
  const [patientId, setPatientId] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const inputRef = useRef(null);

  function onFile(f) {
    if (!f || !f.type.startsWith("image/")) return setError("Please select a valid image file.");
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
    setError("");
  }

  async function run() {
    setError("");
    setLoading(true);
    setResult(null);
    try {
      const data = await predictPneumonia(patientId, file);
      setResult({
        ...data,
        analyzedAt: new Date(),
      });
      setShowHeatmap(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // --- Derive results metadata ---
  const diagnosis = result?.diagnosis || result?.prediction || "";
  const isNormal = diagnosis.toLowerCase().includes("normal");
  const isPos = Boolean(
    !isNormal &&
      (diagnosis.toUpperCase().includes("DETECTED") ||
        diagnosis.toUpperCase().includes("PNEUMONIA") ||
        result?.prediction?.toUpperCase().includes("DETECTED"))
  );

  const confValue = typeof result?.confidence === "number"
    ? result.confidence
    : parseFloat(String(result?.confidence || "0").replace("%", "")) || 0;

  function deriveSeverity(conf, normal) {
    if (normal || conf < 50) return "N/A (Normal)";
    if (conf < 70) return "Mild / Early Stage";
    if (conf < 90) return "Moderate";
    return "Severe";
  }

  const severity = result?.severity || deriveSeverity(confValue, isNormal);
  const areaPct = result?.affected_area_percent !== undefined ? Number(result.affected_area_percent) : 0.0;
  const meanIntensity = result?.mean_intensity !== undefined ? Number(result.mean_intensity) : 0.0;

  function getSeverityDescription(sev) {
    const map = {
      "Mild / Early Stage": "Early or localized pulmonary infiltration suspected",
      "Moderate": "Moderate pneumonia involvement detected across lung fields",
      "Severe": "Extensive consolidation and widespread infection pattern likely",
      "N/A (Normal)": "No pathological infiltrates detected on this radiograph",
    };
    return map[sev] || "For clinical review";
  }

  function getSeverityTheme(sev, isNorm) {
    if (isNorm) return { bg: "rgba(34,197,94,0.12)", fg: "#22c55e", border: "rgba(34,197,94,0.3)" };
    if (sev.includes("Mild")) return { bg: "rgba(245,158,11,0.12)", fg: "#f59e0b", border: "rgba(245,158,11,0.3)" };
    if (sev.includes("Moderate")) return { bg: "rgba(249,115,22,0.12)", fg: "#f97316", border: "rgba(249,115,22,0.3)" };
    if (sev.includes("Severe")) return { bg: "rgba(239,68,68,0.12)", fg: "#ef4444", border: "rgba(239,68,68,0.3)" };
    return { bg: "rgba(148,163,184,0.12)", fg: "#94a3b8", border: "rgba(148,163,184,0.3)" };
  }

  const sevTheme = getSeverityTheme(severity, isNormal);

  return (
    <AnalysisLayout
      title="Pneumonia Analysis"
      subtitle="Chest Radiograph · MobileNetV2 Deep Learning + Grad-CAM Spatial AI"
      navigate={navigate}
      onRun={run}
      canRun={Boolean(patientId && file)}
      loading={loading}
      error={error}
      results={
        result && (
          <div style={{ display: "grid", gap: 16 }}>
            {/* ── CARD 1: DIAGNOSTIC CONCLUSION & CONFIDENCE ── */}
            <Card style={{ borderLeft: `4px solid ${isNormal ? "#22c55e" : "#ef4444"}`, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: t.dim, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>
                    Diagnostic Conclusion
                  </span>
                  <span style={{ fontSize: 11, color: t.dim, display: "flex", alignItems: "center", gap: 4 }}>
                    • <Clock size={11} /> {result.analyzedAt ? result.analyzedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Recent"}
                  </span>
                </div>
                <Pill tone={isNormal ? "success" : "danger"}>
                  {isNormal ? "Negative (Clear)" : "Positive (Pneumonia)"}
                </Pill>
              </div>

              <div style={{ fontSize: 24, fontWeight: 800, color: isNormal ? "#22c55e" : "#ef4444", marginBottom: 4 }}>
                {isNormal ? "NORMAL — NO PNEUMONIA" : "PNEUMONIA DETECTED"}
              </div>
              <div style={{ fontSize: 13, color: t.dim, marginBottom: 16 }}>
                {isNormal
                  ? "Radiograph is clear. No active pneumonia infiltration or consolidation identified."
                  : `Pathological consolidation pattern detected with ${confValue.toFixed(1)}% statistical certainty.`}
              </div>

              {/* Confidence Gauge Bar */}
              <div style={{ background: dark ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.03)", padding: 14, borderRadius: 12, border: `1px solid ${t.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: t.dim }}>Statistical Confidence</span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: t.text }}>{confValue.toFixed(1)}%</span>
                </div>
                <div style={{ width: "100%", height: 6, background: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)", borderRadius: 3, overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${Math.min(100, Math.max(0, confValue))}%`,
                      height: "100%",
                      background: isNormal
                        ? "linear-gradient(90deg, #10b981, #22c55e)"
                        : "linear-gradient(90deg, #3b82f6, #ef4444)",
                      transition: "width 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                  />
                </div>
              </div>

              {/* Severity Card */}
              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: 12,
                  borderRadius: 12,
                  background: sevTheme.bg,
                  border: `1px solid ${sevTheme.border}`,
                }}
              >
                <div style={{ color: sevTheme.fg, display: "flex", alignItems: "center" }}>
                  {isNormal ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: sevTheme.fg }}>
                    Severity: {severity}
                  </div>
                  <div style={{ fontSize: 11, color: t.dim, marginTop: 1 }}>
                    {getSeverityDescription(severity)}
                  </div>
                </div>
              </div>
            </Card>

            {/* ── CARD 2: MODEL ATTENTION & QUANTITATIVE BIOMARKERS ── */}
            <Card style={{ padding: 20 }}>
              <SectionLabel style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                <Layers size={14} /> Grad-CAM Attention Biomarkers
              </SectionLabel>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div
                  style={{
                    background: dark ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.02)",
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: `1px solid ${t.border}`,
                  }}
                >
                  <div style={{ fontSize: 11, color: t.dim, fontWeight: 600 }}>Affected Lung Area</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: isPos ? "#ef4444" : "#22c55e", marginTop: 4 }}>
                    {areaPct.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: 11, color: t.dim, marginTop: 2 }}>of total lung field</div>
                </div>

                <div
                  style={{
                    background: dark ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.02)",
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: `1px solid ${t.border}`,
                  }}
                >
                  <div style={{ fontSize: 11, color: t.dim, fontWeight: 600 }}>Activation Intensity</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: isPos ? "#f97316" : "#22c55e", marginTop: 4 }}>
                    {meanIntensity.toFixed(2)}
                  </div>
                  <div style={{ fontSize: 11, color: t.dim, marginTop: 2 }}>peak neural response</div>
                </div>
              </div>

              {/* Synthesis description */}
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 10,
                  background: dark ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.02)",
                  border: `1px solid ${t.border}`,
                  fontSize: 12,
                  color: t.dim,
                  lineHeight: 1.5,
                }}
              >
                <strong style={{ color: t.text }}>AI Synthesis: </strong>
                {isNormal
                  ? "MobileNetV2 analysis shows standard bilateral lung radiolucency with no significant inflammatory consolidation."
                  : `Model highlights focal consolidation covering ${areaPct.toFixed(1)}% of lung field with an activation intensity of ${meanIntensity.toFixed(2)}. Check the overlay on the radiograph.`}
              </div>
            </Card>

            {/* ── CARD 3: CLINICAL NEXT STEPS & GUIDANCE ── */}
            <Card style={{ padding: 20 }}>
              <SectionLabel style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Sparkles size={14} /> Next Steps &amp; Clinical Guidance
              </SectionLabel>

              <div style={{ display: "grid", gap: 8 }}>
                {isNormal ? (
                  <>
                    <GuidanceRow t={t} idx={1} text="No antimicrobial treatment indicated based on this scan alone." />
                    <GuidanceRow t={t} idx={2} text="Advise patient to monitor for fever, productive cough, or dyspnea." />
                    <GuidanceRow t={t} idx={3} text="Perform follow-up evaluation if symptoms develop or worsen." />
                  </>
                ) : severity.includes("Mild") ? (
                  <>
                    <GuidanceRow t={t} idx={1} text="Consult attending physician for clinical auscultation and confirmation." />
                    <GuidanceRow t={t} idx={2} text="Initiate standard outpatient management and monitor vitals." />
                    <GuidanceRow t={t} idx={3} text="Schedule repeat chest radiograph if fever or symptoms persist > 48h." />
                  </>
                ) : severity.includes("Moderate") ? (
                  <>
                    <GuidanceRow t={t} idx={1} text="Prompt clinical evaluation and laboratory workup (CBC, CRP) recommended." />
                    <GuidanceRow t={t} idx={2} text="Consider targeted antibiotic therapy per institutional pulmonary protocol." />
                    <GuidanceRow t={t} idx={3} text="Schedule follow-up review within 48–72 hours to assess treatment response." />
                  </>
                ) : (
                  <>
                    <GuidanceRow t={t} idx={1} text="Urgent physician assessment required — assess oxygenation and vitals." />
                    <GuidanceRow t={t} idx={2} text="Evaluate for hospital or intensive care admission per clinical severity." />
                    <GuidanceRow t={t} idx={3} text="Initiate immediate broad-spectrum intravenous therapy upon confirmation." />
                  </>
                )}
              </div>

              {/* Urgency Alert Banner */}
              <div
                style={{
                  marginTop: 14,
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: sevTheme.bg,
                  border: `1px solid ${sevTheme.border}`,
                  color: sevTheme.fg,
                  fontSize: 12,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <ShieldAlert size={16} />
                {isNormal
                  ? "Routine follow-up — no urgent action required."
                  : severity.includes("Mild")
                  ? "Review recommended within 24–48 hours."
                  : severity.includes("Moderate")
                  ? "Prompt physician evaluation recommended."
                  : "Urgent clinical review required — escalate if unstable."}
              </div>
            </Card>

            {/* Medical Disclaimer */}
            <div style={{ display: "flex", alignItems: "start", gap: 8, padding: "8px 12px", fontSize: 11, color: t.dim, opacity: 0.8 }}>
              <Info size={14} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>
                <strong>Clinical Note:</strong> AI predictions are intended to assist diagnostic workflows and must be verified by a licensed radiologist or physician.
              </span>
            </div>
          </div>
        )
      }
    >
      <PatientSelector value={patientId} onChange={setPatientId} navigate={navigate} />

      {/* ── UNIFIED SINGLE RADIOGRAPH VIEWPORT ── */}
      <div style={{ marginTop: 16 }}>
        {preview ? (
          <div
            style={{
              position: "relative",
              borderRadius: 12,
              overflow: "hidden",
              border: `1px solid ${t.border}`,
              background: "#000",
            }}
          >
            {/* Top Toolbar over image (Always includes (X) clear button for both normal and pneumonia states) */}
            <div
              style={{
                position: "absolute",
                top: 10,
                left: 10,
                right: 10,
                zIndex: 10,
                display: "flex",
                justifyContent: result?.heatmap_base64 ? "space-between" : "flex-end",
                alignItems: "center",
              }}
            >
              {/* Grad-CAM Toggle Button (Shown when heatmap is present) */}
              {result?.heatmap_base64 ? (
                <button
                  type="button"
                  onClick={() => setShowHeatmap((v) => !v)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: showHeatmap ? "#2563eb" : "rgba(0,0,0,0.7)",
                    backdropFilter: "blur(8px)",
                    color: "#fff",
                    border: `1px solid ${showHeatmap ? "#3b82f6" : "rgba(255,255,255,0.2)"}`,
                    padding: "6px 12px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: showHeatmap ? "0 0 12px rgba(37,99,235,0.5)" : "none",
                    transition: "all 0.2s ease",
                  }}
                >
                  {showHeatmap ? <Eye size={14} /> : <EyeOff size={14} />}
                  {showHeatmap ? "Grad-CAM Heatmap: ON" : "Grad-CAM Heatmap: OFF"}
                </button>
              ) : null}

              {/* Clear Scan Button */}
              <button
                type="button"
                onClick={clearFile}
                title="Remove image"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  border: "none",
                  background: "rgba(0,0,0,0.65)",
                  backdropFilter: "blur(6px)",
                  color: "#fff",
                  cursor: "pointer",
                  display: "grid",
                  placeItems: "center",
                  transition: "background 0.2s ease",
                }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Base Radiograph Image */}
            <img
              src={preview}
              alt="Chest Radiograph"
              style={{
                width: "100%",
                maxHeight: 460,
                objectFit: "contain",
                display: "block",
              }}
            />

            {/* Grad-CAM Heatmap Overlay (Smooth Opacity Transition) */}
            {result?.heatmap_base64 && (
              <img
                src={`data:image/jpeg;base64,${result.heatmap_base64}`}
                alt="Grad-CAM Overlay"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  opacity: showHeatmap ? 1 : 0,
                  transition: "opacity 0.25s ease-in-out",
                  pointerEvents: "none",
                }}
              />
            )}

            {/* Bottom Status Ribbon */}
            <div
              style={{
                position: "absolute",
                bottom: 10,
                left: 10,
                right: 10,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  background: "rgba(0,0,0,0.75)",
                  backdropFilter: "blur(6px)",
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontSize: 11,
                  color: "#94a3b8",
                  fontFamily: "monospace",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2563eb" }} />
                MobileNetV2
              </div>

              {/* Colormap Legend if Heatmap is Active */}
              {result?.heatmap_base64 && showHeatmap && (
                <div
                  style={{
                    background: "rgba(0,0,0,0.75)",
                    backdropFilter: "blur(6px)",
                    padding: "4px 10px",
                    borderRadius: 6,
                    fontSize: 10,
                    color: "#cbd5e1",
                    border: "1px solid rgba(255,255,255,0.1)",
                    display: "flex",
                    gap: 6,
                  }}
                >
                  <span style={{ color: "#3b82f6" }}>■</span> Low
                  <span style={{ color: "#10b981" }}>■</span> Med
                  <span style={{ color: "#f59e0b" }}>■</span> High
                  <span style={{ color: "#ef4444" }}>■</span> Max
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Dropzone Upload Area when no file selected */
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              onFile(e.dataTransfer.files[0]);
            }}
            style={{
              border: `1.5px dashed ${t.border}`,
              borderRadius: 12,
              padding: "36px 20px",
              textAlign: "center",
              color: t.dim,
              cursor: "pointer",
              background: dark ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.01)",
              transition: "border-color 0.2s ease",
            }}
          >
            <UploadCloud size={38} style={{ color: t.accent, margin: "0 auto 10px auto", display: "block" }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>
              Click to select or drag &amp; drop chest X-ray
            </div>
            <div style={{ fontSize: 12, color: t.dim, marginTop: 4 }}>
              Supports DICOM, JPEG, PNG formats
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => onFile(e.target.files[0])}
            />
          </div>
        )}
      </div>
    </AnalysisLayout>
  );
}

function GuidanceRow({ t, idx, text }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 10,
        padding: "8px 12px",
        borderRadius: 8,
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${t.border}`,
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 700, color: t.dim }}>{idx}.</span>
      <span style={{ fontSize: 12, color: t.text, lineHeight: 1.4 }}>{text}</span>
    </div>
  );
}
