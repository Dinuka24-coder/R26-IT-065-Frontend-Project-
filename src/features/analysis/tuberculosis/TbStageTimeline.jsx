import { Check } from "lucide-react";
import { useTheme } from "../../../context/ThemeContext";

// Component 3 (Tuberculosis) only. Vertical list of the real backend pipeline
// stages with pending / active / done states. Reuses the global `spin` keyframe
// from src/styles.css for the active spinner (not modified).

const ACCENT = "#f59e0b";

function Glyph({ state, t }) {
  if (state === "done") {
    return (
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "#22c55e",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        <Check size={12} color="#fff" strokeWidth={3} />
      </span>
    );
  }
  if (state === "active") {
    return (
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          border: `2px solid ${t.border}`,
          borderTopColor: ACCENT,
          animation: "spin 0.8s linear infinite",
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <span
      style={{
        width: 18,
        height: 18,
        borderRadius: "50%",
        border: `2px solid ${t.border}`,
        flexShrink: 0,
      }}
    />
  );
}

export default function TbStageTimeline({ stages, activeIndex, done }) {
  const { t } = useTheme();

  return (
    <div style={{ display: "grid", gap: 14, marginTop: 16 }}>
      {stages.map((stage, i) => {
        let state = "pending";
        if (done || i < activeIndex) state = "done";
        else if (i === activeIndex) state = "active";

        const isLastActive =
          !done && i === activeIndex && i === stages.length - 1;

        return (
          <div key={stage.key} style={{ display: "flex", gap: 10 }}>
            <Glyph state={state} t={t} />
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13.5,
                  fontWeight: state === "pending" ? 500 : 700,
                  color: state === "pending" ? t.dim : t.text,
                }}
              >
                {stage.title}
              </div>
              <div style={{ fontSize: 12, color: t.dim, marginTop: 2 }}>
                {isLastActive ? "Finalizing…" : stage.caption}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
