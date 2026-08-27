import { useTheme } from "../../../context/ThemeContext";
import Pill from "../../../components/ui/Pill";
import ConfidenceBar from "../../../components/ui/ConfidenceBar";

// Component 3 (Tuberculosis) only. The gatekeeper metric rows, shared by the
// success-path TbGatekeeperPanel and the rejection-path TbRejectionPanel.
// Fields come straight off the /tuberculosis/predict response.

const BACKEND_LABELS = {
  heuristic: "Real-data heuristic",
  "heuristic+openai": "Heuristic + AI vision",
  openai: "AI vision model",
  "heuristic+cnn_fallback": "Heuristic + CNN fallback",
  cnn_fallback: "CNN fallback",
  heuristic_only_cnn_unavailable: "Heuristic only (CNN unavailable)",
};

function Row({ t, label, children }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        fontSize: 14,
      }}
    >
      <span style={{ color: t.dim }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: "right" }}>{children}</span>
    </div>
  );
}

export default function TbGatekeeperRows({ result }) {
  const { t } = useTheme();
  if (!result) return null;

  const { is_cxr, cxr_confidence, quality_score, gatekeeper_backend } = result;
  const hasAny =
    is_cxr != null ||
    cxr_confidence != null ||
    quality_score != null ||
    gatekeeper_backend != null;
  if (!hasAny) return null;

  return (
    <div style={{ display: "grid", gap: 11 }}>
      {is_cxr != null && (
        <Row t={t} label="Chest X-ray">
          <Pill tone={is_cxr ? "success" : "danger"}>
            {is_cxr ? "Confirmed" : "Not a CXR"}
          </Pill>
        </Row>
      )}
      {cxr_confidence != null && (
        <Row t={t} label="CXR confidence">
          <ConfidenceBar value={cxr_confidence} status="Normal" />
        </Row>
      )}
      <Row t={t} label="Image quality">
        {quality_score != null ? `${Math.round(quality_score)}%` : "—"}
      </Row>
      {gatekeeper_backend != null && (
        <Row t={t} label="Decided by">
          {BACKEND_LABELS[gatekeeper_backend] || gatekeeper_backend}
        </Row>
      )}
    </div>
  );
}
