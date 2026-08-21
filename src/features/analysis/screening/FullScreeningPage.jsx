import { useState } from "react";
import { CheckCircle, AlertTriangle, Layers } from "lucide-react";
import { useTheme } from "../../../context/ThemeContext";
import { runFullScreening } from "../../../api/screeningApi";
import AnalysisLayout from "../shared/AnalysisLayout";
import PatientSelector from "../shared/PatientSelector";
import ScanUploader from "../shared/ScanUploader";
import Card from "../../../components/ui/Card";
import Pill from "../../../components/ui/Pill";
import ConfidenceBar from "../../../components/ui/ConfidenceBar";
import SectionLabel from "../../../components/ui/SectionLabel";
import { URGENCY_COLORS } from "../../../utils/constants";

export default function FullScreeningPage({ navigate }) {
    const { t } = useTheme();
    const [patientId, setPatientId] = useState("");
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    function onFile(f) {
        if (!f || !f.type.startsWith("image/")) return setError("Please select a valid image.");
        setError(""); setFile(f); setResult(null);
        const r = new FileReader();
        r.onload = (e) => setPreview(e.target.result);
        r.readAsDataURL(f);
    }

    async function run() {
        setError(""); setLoading(true); setResult(null);
        try {
            setResult(await runFullScreening(patientId, file));
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    const hasFindings = result?.findings_count > 0;

    return (
        <AnalysisLayout
            title="Full X-ray Screening"
            subtitle="One scan analyzed by all available X-ray detection engines"
            navigate={navigate}
            onRun={run}
            canRun={Boolean(patientId && file)}
            loading={loading}
            error={error}
            results={result && (
                <>
                    {/* Overall verdict */}
                    <Card style={{ borderLeft: `4px solid ${hasFindings ? "#ef4444" : "#22c55e"}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                            <SectionLabel style={{ marginBottom: 0 }}>Screening Summary</SectionLabel>
                            <Pill tone={hasFindings ? "danger" : "success"}>
                                {result.findings_count} finding{result.findings_count === 1 ? "" : "s"}
                            </Pill>
                        </div>

                        <div style={{ fontSize: 20, fontWeight: 700, color: hasFindings ? "#ef4444" : "#22c55e", marginBottom: 12 }}>
                            {result.verdict}
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 6 }}>
                            <span style={{ color: t.dim }}>Overall urgency</span>
                            <strong style={{ color: URGENCY_COLORS[result.overall_urgency] }}>
                                {result.overall_urgency}
                            </strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                            <span style={{ color: t.dim }}>Engines completed</span>
                            <strong>{result.engines_run} of {result.engines_total}</strong>
                        </div>
                    </Card>

                    {/* Per-engine results */}
                    {result.results.map((r) => (
                        <Card key={r.component} style={{
                            borderLeft: `4px solid ${
                                !r.available ? t.border : r.detected ? "#ef4444" : "#22c55e"
                            }`,
                        }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                                <div style={{ fontWeight: 700, fontSize: 15 }}>{r.label}</div>
                                {r.available ? (
                                    <Pill tone={r.detected ? "danger" : "success"}>
                                        {r.detected ? "Detected" : "Clear"}
                                    </Pill>
                                ) : (
                                    <Pill tone="info">Unavailable</Pill>
                                )}
                            </div>

                            {!r.available && (
                                <div style={{ fontSize: 13, color: t.dim }}>{r.message}</div>
                            )}

                            {r.available && (
                                <>
                                    <div style={{ fontSize: 14, marginBottom: 10 }}>{r.prediction}</div>
                                    <ConfidenceBar value={r.confidence} status={r.detected ? "Positive" : "Normal"} />

                                    {r.detected && r.heatmap_base64 && (
                                        <img src={`data:image/png;base64,${r.heatmap_base64}`} alt={`${r.label} heatmap`}
                                             style={{ width: "100%", borderRadius: 10, marginTop: 14 }} />
                                    )}
                                </>
                            )}
                        </Card>
                    ))}
                </>
            )}
        >
            <PatientSelector value={patientId} onChange={setPatientId} navigate={navigate} />
            <ScanUploader preview={preview} onFile={onFile}
                          onClear={() => { setFile(null); setPreview(null); setResult(null); }} />
            <div style={{ marginTop: 12, fontSize: 12, color: t.dim, lineHeight: 1.5 }}>
                This scan will be analyzed by all connected X-ray engines. Analysis may take longer than a single-component check.
            </div>
        </AnalysisLayout>
    );
}