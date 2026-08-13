import { useEffect, useState } from "react";
import { Users, ScanLine, AlertTriangle, Stethoscope, Activity, Plus, TrendingUp } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { getStats, getWeeklyVolume, getDistribution } from "../../api/dashboardApi";
import { getHistory } from "../../api/reportApi";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import StatCard from "../../components/ui/StatCard";
import Button from "../../components/ui/Button";
import Table from "../../components/ui/Table";
import Pill from "../../components/ui/Pill";
import ConfidenceBar from "../../components/ui/ConfidenceBar";
import Loader from "../../components/ui/Loader";
import WeeklyScanChart from "../../components/charts/WeeklyScanChart";
import DiseaseDonut from "../../components/charts/DiseaseDonut";
import { fmtDate } from "../../utils/helpers";

export default function DashboardPage({ navigate }) {
  const { t } = useTheme();
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [weekly, setWeekly] = useState([]);
  const [dist, setDist] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [s, w, d, h] = await Promise.all([
          getStats(), getWeeklyVolume(), getDistribution(), getHistory(),
        ]);
        setStats(s); setWeekly(w); setDist(d); setRecent(h.records.slice(0, 6));
      } catch (e) { setErr(e.message); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <Loader />;

  const roleCard = isAdmin
    ? { label: "Total Predictions", value: stats?.total_predictions ?? 0, sub: `${stats?.total_doctors ?? 0} active doctors`, icon: TrendingUp }
    : { label: "My Reviews", value: stats?.total_scans ?? 0, sub: `${stats?.today_predictions ?? 0} today`, icon: Stethoscope };

  const cards = [
    { label: "Total Patients", value: stats?.total_patients ?? 0, sub: "Registered", icon: Users },
    { label: "Total Scans",    value: stats?.total_scans ?? 0,    sub: "All components", icon: ScanLine },
    { label: "Positive Cases", value: stats?.positive_cases ?? 0, sub: `${stats?.positive_percent ?? 0}% of scans`, icon: AlertTriangle },
    roleCard,
  ];

  return (
    <div>
      <PageHeader title="Dashboard" subtitle={`Welcome back, ${user?.full_name || ""}.`}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate("analysis")}><Activity size={15} /> AI Analysis</Button>
            <Button onClick={() => navigate("patients-register")}><Plus size={15} /> Add Patient</Button>
          </>
        } />

      {err && <Card style={{ marginBottom: 16, color: "#ef4444", fontSize: 14 }}>{err}</Card>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(215px, 1fr))", gap: 16 }}>
        {cards.map((c) => <StatCard key={c.label} {...c} />)}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))", gap: 16, marginTop: 20 }}>
        <Card style={{ gridColumn: "span 1", minWidth: 0 }}>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Weekly Scan Volume</div>
            <div style={{ fontSize: 13, color: t.dim }}>X-ray vs CT scan breakdown</div>
          </div>
          <WeeklyScanChart data={weekly} />
        </Card>
        <Card style={{ minWidth: 0 }}>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Disease Distribution</div>
            <div style={{ fontSize: 13, color: t.dim }}>All time prediction categories</div>
          </div>
          <DiseaseDonut data={dist} />
        </Card>
      </div>

      <Card style={{ marginTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Recent Activity</div>
          <button onClick={() => navigate("history")}
            style={{ border: "none", background: "transparent", color: t.accent, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            View All →
          </button>
        </div>
        <Table
          head={["Patient", "Doctor", "Disease", "Scan Type", "Confidence", "Status", "Date"]}
          rows={recent.map((r) => [
            r.patient_name, r.doctor_name, r.disease,
            <Pill tone="info">{r.scan_type}</Pill>,
            <ConfidenceBar value={r.confidence} status={r.status} />,
            <Pill tone={r.status === "Positive" ? "danger" : "success"}>{r.status}</Pill>,
            <span style={{ color: t.dim }}>{fmtDate(r.date)}</span>,
          ])}
          empty="No predictions yet — run an AI analysis to get started." />
      </Card>
    </div>
  );
}
