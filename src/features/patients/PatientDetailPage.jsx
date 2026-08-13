import { useCallback, useEffect, useState } from "react";
import { Plus, ScanLine } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { getPatient, addNote } from "../../api/patientApi";
import { getHistory } from "../../api/reportApi";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Field from "../../components/ui/Field";
import Table from "../../components/ui/Table";
import Pill from "../../components/ui/Pill";
import ConfidenceBar from "../../components/ui/ConfidenceBar";
import Loader from "../../components/ui/Loader";
import SectionLabel from "../../components/ui/SectionLabel";
import InfoRow from "../../components/ui/InfoRow";
import { fmtDate } from "../../utils/helpers";

export default function PatientDetailPage({ navigate, patientId }) {
  const { t } = useTheme();
  const [patient, setPatient] = useState(null);
  const [history, setHistory] = useState([]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, h] = await Promise.all([getPatient(patientId), getHistory({ patient_id: patientId })]);
      setPatient(p); setHistory(h.records);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [patientId]);

  useEffect(() => { load(); }, [load]);

  async function submitNote() {
    if (!note.trim()) return;
    setSaving(true);
    try { await addNote(patientId, note.trim()); setNote(""); await load(); }
    catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  if (loading) return <Loader />;
  if (!patient) return <Card>Patient not found.</Card>;

  const notes = patient.clinical_notes_history || [];

  return (
    <div>
      <PageHeader title={patient.full_name}
        subtitle={`${patient.age} yrs · ${patient.gender} · NIC ${patient.nic}`}
        onBack={() => navigate("patients-search")}
        actions={<Button onClick={() => navigate("analysis")}><ScanLine size={15} /> New Analysis</Button>} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 18 }}>
          <Card>
            <SectionLabel>Patient Information</SectionLabel>
            <InfoRow label="Full Name" value={patient.full_name} />
            <InfoRow label="Age" value={patient.age} />
            <InfoRow label="Gender" value={patient.gender} />
            <InfoRow label="NIC" value={patient.nic} />
            <InfoRow label="Contact" value={patient.contact_number} />
            <InfoRow label="Address" value={patient.address} last />
          </Card>

          <Card>
            <SectionLabel>Add Clinical Note</SectionLabel>
            <Field as="textarea" value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="Enter today's clinical observation…" />
            <div style={{ marginTop: 12 }}>
              <Button onClick={submitNote} disabled={!note.trim() || saving} full>
                <Plus size={15} /> {saving ? "Adding…" : "Add Note"}
              </Button>
            </div>
          </Card>
        </div>

        <div style={{ display: "grid", gap: 18 }}>
          <Card>
            <SectionLabel>Diagnostic History</SectionLabel>
            <Table
              head={["Date", "Doctor", "Disease", "Scan", "Confidence", "Status"]}
              rows={history.map((h) => [
                fmtDate(h.date), h.doctor_name, h.disease,
                <Pill tone="info">{h.scan_type}</Pill>,
                <ConfidenceBar value={h.confidence} status={h.status} />,
                <Pill tone={h.status === "Positive" ? "danger" : "success"}>{h.status}</Pill>,
              ])}
              empty="No scans recorded for this patient yet." />
          </Card>

          <Card>
            <SectionLabel>Clinical Notes</SectionLabel>
            {notes.length === 0 && <div style={{ color: t.dim, fontSize: 14 }}>No notes recorded yet.</div>}
            {notes.map((n, i) => (
              <div key={i} style={{ padding: "10px 0", borderBottom: i < notes.length - 1 ? `1px solid ${t.border}` : "none" }}>
                <div style={{ fontSize: 12, color: t.accent, fontWeight: 600, marginBottom: 4 }}>{fmtDate(n.date)}</div>
                <div style={{ fontSize: 14, lineHeight: 1.5 }}>{n.note}</div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
