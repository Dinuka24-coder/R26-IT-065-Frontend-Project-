import { ScanLine } from "lucide-react";
import PageHeader from "../../../components/ui/PageHeader";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";

export default function AnalysisLayout({ title, subtitle, navigate, children, results, onRun, canRun, loading, error }) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} onBack={() => navigate("analysis")} />
      <div style={{
        display: "grid",
        gridTemplateColumns: results ? "repeat(auto-fit, minmax(330px, 1fr))" : "1fr",
        gap: 18, maxWidth: results ? "none" : 660, alignItems: "start",
      }}>
        <Card>
          {children}
          {error && <div style={{ marginTop: 14, color: "#ef4444", fontSize: 13 }}>{error}</div>}
          <div style={{ marginTop: 18 }}>
            <Button onClick={onRun} disabled={!canRun || loading} full>
              <ScanLine size={15} /> {loading ? "Analyzing…" : "Run AI Analysis"}
            </Button>
          </div>
        </Card>
        {results && <div style={{ display: "grid", gap: 18, alignContent: "start" }}>{results}</div>}
      </div>
    </div>
  );
}
