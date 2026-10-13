import Card from "../../../components/ui/Card";
import SectionLabel from "../../../components/ui/SectionLabel";
import TbGatekeeperRows from "./TbGatekeeperRows";

// Component 3 (Tuberculosis) only. Success-path panel: surfaces the gatekeeper
// fields the TB response carries (is_cxr / cxr_confidence / quality_score /
// gatekeeper_backend) which the page previously discarded.
export default function TbGatekeeperPanel({ result }) {
  if (!result) return null;

  const hasAny =
    result.is_cxr != null ||
    result.cxr_confidence != null ||
    result.quality_score != null ||
    result.gatekeeper_backend != null;
  if (!hasAny) return null;

  return (
    <Card>
      <SectionLabel>Image Gatekeeper</SectionLabel>
      <TbGatekeeperRows result={result} />
    </Card>
  );
}
