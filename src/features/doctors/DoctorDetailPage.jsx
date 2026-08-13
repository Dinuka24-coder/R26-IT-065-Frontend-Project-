import { useEffect, useState } from "react";
import { useTheme } from "../../context/ThemeContext";
import { getHistory } from "../../api/reportApi";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import Table from "../../components/ui/Table";
import Pill from "../../components/ui/Pill";
import ConfidenceBar from "../../components/ui/ConfidenceBar";
import Loader from "../../components/ui/Loader";
import SectionLabel from "../../components/ui/SectionLabel";
import InfoRow from "../../components/ui/InfoRow";
import { fmtDate } from "../../utils/helpers";

export default function DoctorDetailPage({ navigate, doctor }) {
  const { t } = useTheme();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!doctor) return;
    getHistory({ doctor_id: doctor.id })
      .then((h) => setHistory(h.records))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [doctor]);

  if (!doctor) return <Card>Doctor not found.</Card>;

  return (
    <div>
      <PageHeader title={doctor.full_name} subtitle={`${doctor.email} · ${doctor.registered_number}`}
        onBack={() => navigate("doctors")} />

      <Card style={{ marginBottom: 18, maxWidth: 560 }}>
        <SectionLabel>Doctor Profile</SectionLabel>
        <InfoRow label="Full Name" value={doctor.full_name} />
        <InfoRow label="Email" value={doctor.email} />
        <InfoRow label="Contact" value={doctor.contact_number} />
        <InfoRow label="Registered No." value={doctor.registered_number} last />
      </Card>

      <Card>
        <SectionLabel>Treated Patients — History Report</SectionLabel>
        {loading ? <Loader /> : (
          <Table
            head={["Patient", "Disease", "Scan", "Confidence", "Status", "Date"]}
            rows={history.map((h) => [
              h.patient_name, h.disease,
              <Pill tone="info">{h.scan_type}</Pill>,
              <ConfidenceBar value={h.confidence} status={h.status} />,
              <Pill tone={h.status === "Positive" ? "danger" : "success"}>{h.status}</Pill>,
              <span style={{ color: t.dim }}>{fmtDate(h.date)}</span>,
            ])}
            empty="This doctor has not run any analyses yet." />
        )}
      </Card>
    </div>
  );
}
