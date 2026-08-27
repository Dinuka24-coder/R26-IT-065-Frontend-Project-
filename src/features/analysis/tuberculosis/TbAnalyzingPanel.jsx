import Card from "../../../components/ui/Card";
import SectionLabel from "../../../components/ui/SectionLabel";
import TbScanAnimation from "./TbScanAnimation";
import TbStageTimeline from "./TbStageTimeline";

// Component 3 (Tuberculosis) only. Shown in AnalysisLayout's `results` slot while
// the request is in flight. Stage state is owned by useTbAnalysisStages() in
// TuberculosisAnalysis and passed down here.
export default function TbAnalyzingPanel({ preview, stages, activeIndex, done }) {
  const current = stages[Math.min(activeIndex, stages.length - 1)];

  return (
    <Card>
      <SectionLabel>Analyzing X-ray</SectionLabel>
      <TbScanAnimation
        preview={preview}
        caption={done ? "Finalizing analysis…" : current?.caption}
      />
      <TbStageTimeline stages={stages} activeIndex={activeIndex} done={done} />
    </Card>
  );
}
