import { useTheme } from "../../../context/ThemeContext";

// Component 3 (Tuberculosis) only. Scanner FX over the uploaded X-ray:
// sweeping beam + tech grid + pulsing corner brackets + a stage caption.
// Keyframes are injected via a scoped <style> tag with tb-prefixed names so no
// shared/global CSS is touched. All motion is frozen under prefers-reduced-motion.

const ACCENT = "#f59e0b"; // matches COMPONENTS.tuberculosis accent

const SCOPED_CSS = `
@keyframes tbScanBeam {
  0%   { transform: translateY(-12%); }
  100% { transform: translateY(112%); }
}
@keyframes tbBracketPulse {
  0%, 100% { opacity: 0.35; }
  50%      { opacity: 1; }
}
.tb-scan-beam   { animation: tbScanBeam 2.1s ease-in-out infinite alternate; }
.tb-scan-corner { animation: tbBracketPulse 1.6s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .tb-scan-beam   { animation: none; transform: translateY(50%); }
  .tb-scan-corner { animation: none; opacity: 0.8; }
}
`;

function Corner({ pos }) {
  const base = {
    position: "absolute",
    width: 22,
    height: 22,
    borderColor: ACCENT,
    borderStyle: "solid",
    borderWidth: 0,
  };
  const map = {
    tl: { top: 8, left: 8, borderTopWidth: 2, borderLeftWidth: 2 },
    tr: { top: 8, right: 8, borderTopWidth: 2, borderRightWidth: 2 },
    bl: { bottom: 8, left: 8, borderBottomWidth: 2, borderLeftWidth: 2 },
    br: { bottom: 8, right: 8, borderBottomWidth: 2, borderRightWidth: 2 },
  };
  return <span className="tb-scan-corner" style={{ ...base, ...map[pos] }} />;
}

export default function TbScanAnimation({ preview, caption }) {
  const { t } = useTheme();

  return (
    <div
      style={{
        position: "relative",
        borderRadius: 10,
        overflow: "hidden",
        border: `1px solid ${t.border}`,
        background: "#000",
        lineHeight: 0,
      }}
    >
      <style>{SCOPED_CSS}</style>

      {preview ? (
        <img
          src={preview}
          alt="Chest X-ray being analyzed"
          style={{ width: "100%", display: "block", opacity: 0.92 }}
        />
      ) : (
        <div style={{ width: "100%", aspectRatio: "1 / 1" }} />
      )}

      {/* tech grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          backgroundImage:
            `repeating-linear-gradient(0deg, ${ACCENT}22 0 1px, transparent 1px 40px),` +
            `repeating-linear-gradient(90deg, ${ACCENT}22 0 1px, transparent 1px 40px)`,
        }}
      />

      {/* sweeping beam */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: "22%",
          pointerEvents: "none",
        }}
      >
        <div
          className="tb-scan-beam"
          style={{
            width: "100%",
            height: "100%",
            background: `linear-gradient(to bottom, transparent, ${ACCENT}33 70%, ${ACCENT})`,
            borderBottom: `2px solid ${ACCENT}`,
            boxShadow: `0 0 14px 2px ${ACCENT}aa`,
          }}
        />
      </div>

      <Corner pos="tl" />
      <Corner pos="tr" />
      <Corner pos="bl" />
      <Corner pos="br" />

      {caption && (
        <div
          style={{
            position: "absolute",
            left: 10,
            right: 10,
            bottom: 10,
            fontSize: 12,
            lineHeight: 1.35,
            color: "#fff",
            background: "rgba(0,0,0,0.55)",
            border: `1px solid ${ACCENT}66`,
            borderRadius: 8,
            padding: "6px 9px",
            backdropFilter: "blur(2px)",
          }}
        >
          {caption}
        </div>
      )}
    </div>
  );
}
