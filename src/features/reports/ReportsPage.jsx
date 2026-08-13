import { useEffect, useState } from "react";
import { FileText, Eye, Download, Search } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { getHistory } from "../../api/reportApi";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";
import { fmtDate } from "../../utils/helpers";

export default function ReportsPage() {
  const { t } = useTheme();
  const [records, setRecords] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHistory().then((h) => setRecords(h.records)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;

  const filtered = records.filter((r) =>
    (r.patient_name || "").toLowerCase().includes(q.toLowerCase()) ||
    (r.disease || "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div>
      <PageHeader title="Reports" subtitle="Generated diagnostic reports — preview or download" />

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Search size={18} color={t.dim} />
          <input placeholder="Search by patient or disease…" value={q} onChange={(e) => setQ(e.target.value)}
            style={{ flex: 1, border: "none", background: "transparent", fontSize: 15, color: t.text }} />
        </div>
      </Card>

      <div style={{ display: "grid", gap: 12 }}>
        {filtered.map((r, i) => (
          <Card key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: t.accentSoft, display: "grid", placeItems: "center", flexShrink: 0 }}>
                <FileText size={18} color={t.accent} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{r.disease} — {r.scan_type}</div>
                <div style={{ fontSize: 13, color: t.dim }}>{r.patient_name} · {r.doctor_name} · {fmtDate(r.date)}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="secondary" style={{ padding: "8px 13px", fontSize: 13 }}><Eye size={14} /> Preview</Button>
              <Button variant="secondary" style={{ padding: "8px 13px", fontSize: 13 }}><Download size={14} /> Download</Button>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && <Card style={{ textAlign: "center", padding: 40, color: t.dim }}>No reports found.</Card>}
      </div>
    </div>
  );
}
