import { useEffect, useState } from "react";
import { useTheme } from "../../context/ThemeContext";
import { getHistory } from "../../api/reportApi";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import Table from "../../components/ui/Table";
import Pill from "../../components/ui/Pill";
import ConfidenceBar from "../../components/ui/ConfidenceBar";
import Loader from "../../components/ui/Loader";
import { fmtDate } from "../../utils/helpers";

export default function PredictionHistoryPage() {
  const { t } = useTheme();
  const [records, setRecords] = useState([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHistory().then((h) => setRecords(h.records)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;

  const diseases = ["All", ...Array.from(new Set(records.map((r) => r.disease)))];
  const rows = filter === "All" ? records : records.filter((r) => r.disease === filter);

  return (
    <div>
      <PageHeader title="Prediction History" subtitle="All AI-generated diagnostic predictions" />

      <Card style={{ marginBottom: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, color: t.dim }}>Filter by:</span>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 9, border: `1px solid ${t.border}`, background: t.bg, color: t.text, fontSize: 14, minWidth: 180 }}>
          {diseases.map((d) => <option key={d}>{d}</option>)}
        </select>
        <span style={{ marginLeft: "auto", fontSize: 13, color: t.dim }}>{rows.length} records</span>
      </Card>

      <Card>
        <Table
          head={["Patient", "Doctor", "Scan Type", "Disease", "Confidence", "Status", "Date"]}
          rows={rows.map((r) => [
            r.patient_name, r.doctor_name,
            <Pill tone="info">{r.scan_type}</Pill>,
            r.disease,
            <ConfidenceBar value={r.confidence} status={r.status} />,
            <Pill tone={r.status === "Positive" ? "danger" : "success"}>{r.status}</Pill>,
            <span style={{ color: t.dim }}>{fmtDate(r.date)}</span>,
          ])}
          empty="No predictions recorded yet." />
      </Card>
    </div>
  );
}
