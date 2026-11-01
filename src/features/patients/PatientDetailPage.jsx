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
import Pagination, { usePagination } from "../../components/ui/Pagination";
import TableFrame from "../../components/ui/TableFrame";
import HistoryFilters, { StatChips } from "../../components/ui/HistoryFilters";
import useHistoryFilters from "../../hooks/useHistoryFilters";
import { fmtDate } from "../../utils/helpers";

const SEARCH_KEYS = ["doctor_name", "disease"];
const NOTES_PREVIEW = 3;

export default function PatientDetailPage({ navigate, patientId }) {
  const { t } = useTheme();
  const [patient, setPatient] = useState(null);
  const [history, setHistory] = useState([]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAllNotes, setShowAllNotes] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, h] = await Promise.all([getPatient(patientId), getHistory({ patient_id: patientId })]);
      setPatient(p); setHistory(h.records || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [patientId]);

  useEffect(() => { load(); }, [load]);

  const hf = useHistoryFilters(history, SEARCH_KEYS);
  const filterKey = `${hf.filters.q}|${hf.filters.disease}|${hf.filters.status}`;
  const pg = usePagination(hf.filtered, 10, filterKey); // back to page 1 when filters change

  async function submitNote() {
    if (!note.trim()) return;
    setSaving(true);
    try { await addNote(patientId, note.trim()); setNote(""); await load(); }
    catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  if (loading) return <Loader />;
  if (!patient) return <Card>Patient not found.</Card>;

  // newest note first
  const notes = [...(patient.clinical_notes_history || [])].reverse();
  const shownNotes = showAllNotes ? notes : notes.slice(0, NOTES_PREVIEW);
  const positive = history.filter((h) => h.status === "Positive").length;

  return (
      <div>
        <PageHeader title={patient.full_name}
                    subtitle={`${patient.age} yrs · ${patient.gender} · NIC ${patient.nic}`}
                    onBack={() => navigate("patients-search")}
                    actions={<Button onClick={() => navigate("analysis")}><ScanLine size={15} /> New Analysis</Button>} />

        {/* ── Top: patient details (left) + notes (right) ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18, alignItems: "start" }}>
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
            <SectionLabel>Clinical Notes</SectionLabel>
            <Field as="textarea" value={note} onChange={(e) => setNote(e.target.value)}
                   placeholder="Enter today's clinical observation…" />
            <div style={{ marginTop: 12, marginBottom: 6 }}>
              <Button onClick={submitNote} disabled={!note.trim() || saving} full>
                <Plus size={15} /> {saving ? "Adding…" : "Add Note"}
              </Button>
            </div>

            {notes.length === 0 && (
                <div style={{ color: t.dim, fontSize: 14, paddingTop: 10 }}>No notes recorded yet.</div>
            )}
            {shownNotes.map((n, i) => (
                <div key={i} style={{
                  padding: "12px 0",
                  borderTop: `1px solid ${t.border}`,
                }}>
                  <div style={{ fontSize: 12, color: t.accent, fontWeight: 600, marginBottom: 4 }}>{fmtDate(n.date)}</div>
                  <div style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{n.note}</div>
                </div>
            ))}
            {notes.length > NOTES_PREVIEW && (
                <button type="button" onClick={() => setShowAllNotes((v) => !v)}
                        style={{
                          background: "none", border: 0, padding: "6px 0 0", cursor: "pointer",
                          color: t.accent, fontWeight: 600, fontSize: 13, fontFamily: "inherit",
                        }}>
                  {showAllNotes ? "Show less" : `Show all ${notes.length} notes`}
                </button>
            )}
          </Card>
        </div>

        {/* ── Bottom: full-width diagnostic history ── */}
        <Card style={{ marginTop: 18 }}>
          <SectionLabel>Diagnostic History</SectionLabel>

          {history.length > 0 && (
              <>
                <StatChips items={[
                  { label: history.length === 1 ? "scan" : "scans", value: history.length },
                  { label: "positive", value: positive, tone: "danger" },
                  { label: "normal", value: history.length - positive, tone: "success" },
                ]} />
                <HistoryFilters
                    filters={hf.filters} onChange={hf.update} onClear={hf.reset} active={hf.active}
                    diseases={hf.diseases} statuses={hf.statuses}
                    searchPlaceholder="Search doctor or disease…" />
              </>
          )}

          <TableFrame>
            <Table
                head={["Date", "Doctor", "Disease", "Scan", "Confidence", "Status"]}
                rows={pg.pageItems.map((h) => [
                  <span style={{ color: t.dim }}>{fmtDate(h.date)}</span>,
                  h.doctor_name || <span style={{ color: t.dim, fontStyle: "italic" }}>Unknown</span>,
                  <span style={{ fontWeight: 600 }}>{h.disease}</span>,
                  <Pill tone="info">{h.scan_type}</Pill>,
                  <ConfidenceBar value={h.confidence} status={h.status} />,
                  <Pill tone={h.status === "Positive" ? "danger" : "success"}>{h.status}</Pill>,
                ])}
                empty={hf.active
                    ? "No results match these filters."
                    : "No scans recorded for this patient yet."} />
          </TableFrame>

          <Pagination pg={pg} label="scans" />
        </Card>
      </div>
  );
}