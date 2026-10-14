import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { getHistory } from "../../api/reportApi";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import Table from "../../components/ui/Table";
import Pill from "../../components/ui/Pill";
import ConfidenceBar from "../../components/ui/ConfidenceBar";
import Loader from "../../components/ui/Loader";
import Pagination, { usePagination } from "../../components/ui/Pagination";
import { fmtDate } from "../../utils/helpers";

// component key -> disease name (the "disease" field is "Normal" for negative results,
// so the Disease filter uses the component instead)
const COMPONENT_NAMES = {
    pneumothorax: "Pneumothorax",
    pneumonia: "Pneumonia",
    tuberculosis: "Tuberculosis",
    lungcancer: "Lung Cancer",
};
const DISEASES = Object.values(COMPONENT_NAMES);
const EMPTY = { search: "", start_date: "", end_date: "", disease: "all", status: "all", doctor_id: "", patient_id: "" };

// Dates without a timezone are saved in UTC — read them as UTC, then use the local (Sri Lanka) day
const toDate = (v) => {
    if (!v) return null;
    const s = String(v);
    return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : `${s}Z`);
};
const localDay = (v) => {
    const d = toDate(v);
    return d && !isNaN(d) ? d.toLocaleDateString("en-CA") : "";
};

// true when a colour like "#0f172a" is dark (used to tell the browser we are in dark mode)
const isDarkColor = (hex) => {
    const h = String(hex || "").replace("#", "");
    if (h.length < 6) return false;
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
};

const diseaseOf = (r) => COMPONENT_NAMES[r.component] || r.disease;

export default function PredictionHistoryPage() {
    const { t } = useTheme();
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [f, setF] = useState(EMPTY);

    useEffect(() => {
        getHistory().then((h) => setRecords(h.records || [])).catch(console.error).finally(() => setLoading(false));
    }, []);

    const set = (key) => (e) => setF((old) => ({ ...old, [key]: e.target.value }));

    // dropdown options
    const doctors = useMemo(() => {
        const m = new Map();
        records.forEach((r) => r.doctor_id && m.set(r.doctor_id, r.doctor_name && r.doctor_name !== "—" ? r.doctor_name : "Unknown doctor"));
        return [...m].sort((a, b) => a[1].localeCompare(b[1]));
    }, [records]);
    const patients = useMemo(() => {
        const m = new Map();
        records.forEach((r) => r.patient_id && m.set(r.patient_id, r.patient_name && r.patient_name !== "—" ? r.patient_name : "Unknown patient"));
        return [...m].sort((a, b) => a[1].localeCompare(b[1]));
    }, [records]);

    // apply filters
    const rows = useMemo(() => {
        const q = f.search.trim().toLowerCase();
        return records.filter((r) => {
            if (q && ![r.patient_name, r.doctor_name, r.disease, diseaseOf(r), r.scan_type]
                .some((v) => String(v || "").toLowerCase().includes(q))) return false;
            const day = localDay(r.date);
            if (f.start_date && day < f.start_date) return false;
            if (f.end_date && day > f.end_date) return false;
            if (f.disease !== "all" && diseaseOf(r) !== f.disease) return false;
            if (f.status !== "all" && r.status !== f.status) return false;
            if (f.doctor_id && r.doctor_id !== f.doctor_id) return false;
            if (f.patient_id && r.patient_id !== f.patient_id) return false;
            return true;
        });
    }, [records, f]);

    // pagination (goes back to page 1 when the filters change)
    const pg = usePagination(rows, 10, JSON.stringify(f));

    if (loading) return <Loader />;

    const dark = isDarkColor(t.card || t.bg);
    const input = {
        width: "100%", padding: "9px 11px", borderRadius: 8, fontSize: 13,
        border: `1px solid ${t.border}`, background: t.card || t.bg, color: t.text, boxSizing: "border-box",
        colorScheme: dark ? "dark" : "light",   // readable dropdown list + calendar icon in dark mode
    };
    const opt = { background: t.card || t.bg, color: t.text };
    const label = { fontSize: 11, fontWeight: 600, color: t.dim, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.4 };
    const filtersOn = JSON.stringify(f) !== JSON.stringify(EMPTY);

    return (
        <div>
            <PageHeader title="Prediction History" subtitle="All AI-generated diagnostic predictions" />

            {/* ── Filters ─────────────────────────────────────────── */}
            <Card style={{ marginBottom: 16 }}>
                <div style={{ position: "relative", marginBottom: 14 }}>
                    <Search size={16} style={{ position: "absolute", left: 12, top: 11, color: t.dim }} />
                    <input
                        value={f.search} onChange={set("search")}
                        placeholder="Search by patient name, doctor or disease…"
                        style={{ ...input, paddingLeft: 36, fontSize: 14 }}
                    />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
                    <div><div style={label}>From</div><input type="date" value={f.start_date} onChange={set("start_date")} style={input} /></div>
                    <div><div style={label}>To</div><input type="date" value={f.end_date} onChange={set("end_date")} style={input} /></div>
                    <div>
                        <div style={label}>Disease</div>
                        <select value={f.disease} onChange={set("disease")} style={input}>
                            <option style={opt} value="all">All diseases</option>
                            {DISEASES.map((d) => <option style={opt} key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                    <div>
                        <div style={label}>Result</div>
                        <select value={f.status} onChange={set("status")} style={input}>
                            <option style={opt} value="all">All results</option>
                            <option style={opt} value="Positive">Positive only</option>
                            <option style={opt} value="Normal">Normal only</option>
                        </select>
                    </div>
                    {doctors.length > 1 && (
                        <div>
                            <div style={label}>Doctor</div>
                            <select value={f.doctor_id} onChange={set("doctor_id")} style={input}>
                                <option style={opt} value="">All doctors</option>
                                {doctors.map(([id, name]) => <option style={opt} key={id} value={id}>{name}</option>)}
                            </select>
                        </div>
                    )}
                    <div>
                        <div style={label}>Patient</div>
                        <select value={f.patient_id} onChange={set("patient_id")} style={input}>
                            <option style={opt} value="">All patients</option>
                            {patients.map(([id, name]) => <option style={opt} key={id} value={id}>{name}</option>)}
                        </select>
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", marginTop: 12 }}>
                    {filtersOn && (
                        <button onClick={() => setF(EMPTY)}
                                style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13,
                                    background: "none", border: "none", color: "#2563eb", cursor: "pointer", padding: 0 }}>
                            <X size={14} /> Clear filters
                        </button>
                    )}
                    <span style={{ marginLeft: "auto", fontSize: 13, color: t.dim }}>
            {rows.length} of {records.length} record{records.length === 1 ? "" : "s"}
          </span>
                </div>
            </Card>

            {/* ── Results table ───────────────────────────────────── */}
            <Card>
                <Table
                    head={["Patient", "Doctor", "Scan Type", "Disease", "Confidence", "Status", "Date"]}
                    rows={pg.pageItems.map((r) => [
                        r.patient_name, r.doctor_name,
                        <Pill tone="info">{r.scan_type}</Pill>,
                        r.status === "Positive" ? r.disease : `${diseaseOf(r)} — Normal`,
                        <ConfidenceBar value={r.confidence} status={r.status} />,
                        <Pill tone={r.status === "Positive" ? "danger" : "success"}>{r.status}</Pill>,
                        <span style={{ color: t.dim }}>{fmtDate(r.date)}</span>,
                    ])}
                    empty={records.length ? "No predictions match these filters." : "No predictions recorded yet."} />
                <Pagination pg={pg} label="records" />
            </Card>
        </div>
    );
}