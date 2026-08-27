import { useEffect, useMemo, useState } from "react";
import { useTheme } from "../../../context/ThemeContext";

// Component 3 (Tuberculosis) only. Keeps the results column inside the viewport
// by showing one card at a time behind a tab bar instead of stacking/scrolling.
// Single-item states (analyzing, rejection) render straight through with no tabs.

const TB_RESULTS_MAX_H = "calc(100vh - 220px)"; // tune against the shell chrome
const ACCENT = "#f59e0b";

export default function TbResultTabs({ items }) {
  const { t } = useTheme();
  const sig = useMemo(() => items.map((it) => it.key).join("|"), [items]);
  const [active, setActive] = useState(0);

  // Reset to the first tab whenever the result set changes.
  useEffect(() => {
    setActive(0);
  }, [sig]);

  const multi = items.length > 1;
  const current = items[Math.min(active, items.length - 1)] || items[0];

  return (
    <div
      className="tb-results-tabs"
      style={{
        maxHeight: TB_RESULTS_MAX_H,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {multi && (
        <div
          role="tablist"
          aria-label="Analysis results"
          style={{
            display: "flex",
            gap: 4,
            borderBottom: `1px solid ${t.border}`,
            marginBottom: 16,
            flexShrink: 0,
          }}
        >
          {items.map((it, i) => {
            const selected = i === active;
            return (
              <button
                key={it.key}
                role="tab"
                aria-selected={selected}
                onClick={() => setActive(i)}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  padding: "9px 14px",
                  fontSize: 13,
                  fontWeight: selected ? 700 : 500,
                  color: selected ? t.text : t.dim,
                  borderBottom: `2px solid ${selected ? ACCENT : "transparent"}`,
                  marginBottom: -1,
                }}
              >
                {it.label}
              </button>
            );
          })}
        </div>
      )}

      <div
        role={multi ? "tabpanel" : undefined}
        style={{ flex: 1, minHeight: 0, overflow: "auto" }}
      >
        {current?.node}
      </div>
    </div>
  );
}
