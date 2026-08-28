import { useEffect, useRef, useState } from "react";
import { TB_STAGES, TB_STAGE_TIMINGS_MS } from "./tbStages";

// Component 3 (Tuberculosis) only.
// Drives the simulated stage timeline shown during the analyzing phase.
//   - `active` should be the page's `loading` flag.
//   - While active, the "current" stage index advances on chained timers, but
//     never past the last stage (it never auto-completes the final stage).
//   - Call `finish()` when the real request settles (success OR error): it
//     fast-forwards to done and clears pending timers.
//   - If the timers outrun the request, the last stage sits on a spinner with a
//     "Finalizing…" caption rather than showing a premature checkmark.
export function useTbAnalysisStages(active) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [done, setDone] = useState(false);
  const timersRef = useRef([]);

  function clearTimers() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }

  useEffect(() => {
    if (!active) {
      clearTimers();
      return;
    }

    // Fresh run.
    clearTimers();
    setDone(false);
    setActiveIndex(0);

    let elapsed = 0;
    const lastIndex = TB_STAGES.length - 1;
    for (let i = 1; i <= lastIndex; i++) {
      elapsed += TB_STAGE_TIMINGS_MS[i - 1] ?? 1500;
      const id = setTimeout(() => setActiveIndex(i), elapsed);
      timersRef.current.push(id);
    }

    return clearTimers;
  }, [active]);

  function finish() {
    clearTimers();
    setActiveIndex(TB_STAGES.length - 1);
    setDone(true);
  }

  return { stages: TB_STAGES, activeIndex, done, finish };
}
