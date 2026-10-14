import { useEffect, useMemo, useState } from "react";
import { Search, FileText, Eye, Download, X, Stethoscope, Activity, User, List, Layers } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import Pill from "../../components/ui/Pill";
import Pagination, { usePagination } from "../../components/ui/Pagination";
import {
    getReportList,
    previewResultPdf,
    downloadResultPdf,
    previewSummaryPdf,
    downloadSummaryPdf,
    previewScreeningPdf,
    downloadScreeningPdf,
} from "../../api/pdfReportApi";

const DISEASES = ["Pneumothorax", "Pneumonia", "Tuberculosis", "Lung Cancer"];
const EMPTY = { search: "", start_date: "", end_date: "", disease: "all", status: "all", source: "all", doctor_id: "", patient_id: "" };

// "2026-10-12T18:20:00+00:00" -> local date "2026-10-12" (used for the date filter)
const localDay = (iso) => (iso ? new Date(iso).toLocaleDateString("en-CA") : "");
const fmtDate = (iso) =>
    iso
        ? new Date(iso).toLocaleString("en-GB", {
            day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
        })
        : "-";

// true when a colour like "#0f172a" is dark (used to tell the browser we are in dark mode)
const isDarkColor = (hex) => {
    const h = String(hex || "").replace("#", "");
    if (h.length < 6) return false;
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
};

// A MongoDB id (24 hex characters) is not useful to show — show the name instead
const isMongoId = (v) => /^[0-9a-f]{24}$/i.test(String(v || ""));
const patientLabel = (code, name) =>
    isMongoId(code) ? (name || "Unknown patient") : name ? `${code} · ${name}` : code;

/* ── small outline button like the one in the old design ── */
function SmallBtn({ icon: Icon, children, onClick, busy, primary }) {
    const { t } = useTheme();
    return (
        <button
            onClick={onClick}
            disabled={busy}
            style={{
                display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px",
                borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: busy ? "wait" : "pointer",
                border: `1px solid ${primary ? "#2563eb" : t.border}`,
                background: primary ? "#2563eb" : "transparent",
                color: primary ? "#fff" : "inherit",
                opacity: busy ? 0.6 : 1, whiteSpace: "nowrap",
            }}
        >
            <Icon size={14} /> {busy ? "Please wait…" : children}
        </button>
    );
}

export default function ReportsPage() {
    const { t } = useTheme();
    const [rows, setRows] = useState([]);
    const [role, setRole] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [f, setF] = useState(EMPTY);
    const [view, setView] = useState("all"); // all | doctor | disease | patient
    const [busy, setBusy] = useState("");    // which button is working

    // Load every result the user can see once; filtering happens in the browser (fast)
    useEffect(() => {
        getReportList()
            .then((data) => { setRows(data.rows || []); setRole(data.role || ""); })
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    const isAdmin = role === "admin";
    const set = (key) => (e) => setF((old) => ({ ...old, [key]: e.target.value }));

    // dropdown options
    const doctors = useMemo(() => {
        const m = new Map();
        rows.forEach((r) => r.doctor_id && m.set(r.doctor_id, r.doctor_name || "Unknown doctor"));
        return [...m].sort((a, b) => a[1].localeCompare(b[1]));
    }, [rows]);
    const patients = useMemo(() => {
        const m = new Map();
        rows.forEach((r) => m.set(r.patient_code, r.patient_name));
        return [...m].sort((a, b) => patientLabel(...a).localeCompare(patientLabel(...b)));
    }, [rows]);

    // apply filters
    const filtered = useMemo(() => {
        const q = f.search.trim().toLowerCase();
        return rows.filter((r) => {
            if (q && ![r.patient_code, r.patient_name, r.doctor_name, r.disease, r.prediction]
                .some((v) => String(v || "").toLowerCase().includes(q))) return false;
            const day = localDay(r.created_at);
            if (f.start_date && day < f.start_date) return false;
            if (f.end_date && day > f.end_date) return false;
            if (f.disease !== "all" && r.disease !== f.disease) return false;
            if (f.status === "Positive" && !r.positive) return false;
            if (f.status === "Normal" && r.positive) return false;
            if (f.doctor_id && r.doctor_id !== f.doctor_id) return false;
            if (f.patient_id && r.patient_code !== f.patient_id) return false;
            if (f.source === "single" && r.source === "full_screening") return false;
            if (f.source === "full_screening" && r.source !== "full_screening") return false;
            return true;
        });
    }, [rows, f]);

    // "All results" list: results of one Full Screening are shown together as one card
    const listItems = useMemo(() => {
        const byScreening = new Map();
        filtered.forEach((r) => {
            if (!r.screening_id) return;
            if (!byScreening.has(r.screening_id)) byScreening.set(r.screening_id, []);
            byScreening.get(r.screening_id).push(r);
        });
        const shown = new Set();
        const items = [];
        filtered.forEach((r) => {
            if (!r.screening_id) return items.push({ type: "single", row: r });
            if (shown.has(r.screening_id)) return;
            shown.add(r.screening_id);
            items.push({ type: "screening", id: r.screening_id, rows: byScreening.get(r.screening_id) });
        });
        return items;
    }, [filtered]);

    // groups for "By doctor / disease / patient"
    const groups = useMemo(() => {
        if (view === "all") return [];
        const keyOf = {
            doctor: (r) => [r.doctor_id || "-", r.doctor_name || "Unknown doctor", ""],
            disease: (r) => [r.disease, r.disease, r.scan_type],
            patient: (r) => [r.patient_code, r.patient_name || patientLabel(r.patient_code, ""),
                isMongoId(r.patient_code) ? "" : r.patient_code],
        }[view];
        const m = new Map();
        filtered.forEach((r) => {
            const [key, title, sub] = keyOf(r);
            if (!m.has(key)) m.set(key, { key, title, sub, scans: 0, positive: 0, patients: new Set(), doctors: new Set(), diseases: {} });
            const g = m.get(key);
            g.scans += 1;
            if (r.positive) g.positive += 1;
            g.patients.add(r.patient_code);
            if (r.doctor_id) g.doctors.add(r.doctor_id);
            g.diseases[r.disease] = g.diseases[r.disease] || { scans: 0, positive: 0 };
            g.diseases[r.disease].scans += 1;
            if (r.positive) g.diseases[r.disease].positive += 1;
        });
        return [...m.values()].sort((a, b) => b.scans - a.scans);
    }, [filtered, view]);

    // pagination (goes back to page 1 when filters or view change)
    const resetKey = JSON.stringify(f) + view;
    const pgList = usePagination(listItems, 10, resetKey);
    const pgGroups = usePagination(groups, 12, resetKey);

    // filters that the backend PDF should use (same as the screen)
    const pdfFilters = (extra = {}) => ({
        search: f.search.trim(), start_date: f.start_date, end_date: f.end_date,
        disease: f.disease, status: f.status, source: f.source, doctor_id: f.doctor_id, patient_id: f.patient_id, ...extra,
    });
    const groupFilter = (g) =>
        view === "doctor" ? { doctor_id: g.key } : view === "disease" ? { disease: g.key } : { patient_id: g.key };

    async function act(id, fn) {
        setError(""); setBusy(id);
        try { await fn(); } catch (e) { setError(e.message); } finally { setBusy(""); }
    }

    const dark = isDarkColor(t.card || t.bg);
    const input = {
        width: "100%", padding: "9px 11px", borderRadius: 8, fontSize: 13,
        border: `1px solid ${t.border}`, background: t.card, color: t.text, boxSizing: "border-box",
        colorScheme: dark ? "dark" : "light",   // dark dropdown list + calendar icon in dark mode
    };
    const opt = { background: t.card, color: t.text };   // option rows (Windows Chrome/Edge)
    const label = { fontSize: 11, fontWeight: 600, color: t.dim, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.4 };
    const filtersOn = JSON.stringify(f) !== JSON.stringify(EMPTY);

    const tabs = [
        { id: "all", label: "All results", icon: List },
        ...(isAdmin ? [{ id: "doctor", label: "By doctor", icon: Stethoscope }] : []),
        { id: "disease", label: "By disease", icon: Activity },
        { id: "patient", label: "By patient", icon: User },
    ];

    return (
        <div>
            <PageHeader title="Reports" subtitle="Search, filter and download diagnostic reports" />

            {/* ── Filters ─────────────────────────────────────────── */}
            <Card style={{ marginBottom: 16 }}>
                <div style={{ position: "relative", marginBottom: 14 }}>
                    <Search size={16} style={{ position: "absolute", left: 12, top: 11, color: t.dim }} />
                    <input
                        value={f.search} onChange={set("search")}
                        placeholder="Search by patient name, patient ID, doctor or disease…"
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
                        <div style={label}>Source</div>
                        <select value={f.source} onChange={set("source")} style={input}>
                            <option style={opt} value="all">All sources</option>
                            <option style={opt} value="single">Single analysis</option>
                            <option style={opt} value="full_screening">Full screening</option>
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
                    {isAdmin && (
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
                            {patients.map(([code, name]) => (
                                <option style={opt} key={code} value={code}>{patientLabel(code, name)}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {filtersOn && (
                    <button onClick={() => setF(EMPTY)}
                            style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13,
                                background: "none", border: "none", color: "#2563eb", cursor: "pointer", padding: 0 }}>
                        <X size={14} /> Clear filters
                    </button>
                )}
            </Card>

            {/* ── View tabs + summary actions ─────────────────────── */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {tabs.map(({ id, label: text, icon: Icon }) => (
                        <button key={id} onClick={() => setView(id)}
                                style={{
                                    display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 999,
                                    fontSize: 13, fontWeight: 600, cursor: "pointer",
                                    border: `1px solid ${view === id ? "#2563eb" : t.border}`,
                                    background: view === id ? "#2563eb" : "transparent",
                                    color: view === id ? "#fff" : "inherit",
                                }}>
                            <Icon size={14} /> {text}
                        </button>
                    ))}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: t.dim }}>{filtered.length} result{filtered.length === 1 ? "" : "s"}</span>
                    <SmallBtn icon={Eye} busy={busy === "sum-p"} onClick={() => act("sum-p", () => previewSummaryPdf(pdfFilters()))}>
                        Preview summary
                    </SmallBtn>
                    <SmallBtn icon={Download} primary busy={busy === "sum-d"} onClick={() => act("sum-d", () => downloadSummaryPdf(pdfFilters()))}>
                        Download summary
                    </SmallBtn>
                </div>
            </div>

            {error && <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{error}</div>}
            {loading && <Card><div style={{ color: t.dim, fontSize: 14 }}>Loading reports…</div></Card>}
            {!loading && filtered.length === 0 && (
                <Card><div style={{ color: t.dim, fontSize: 14 }}>No reports match these filters.</div></Card>
            )}

            {/* ── All results: one row per analysis, Full Screening results grouped ── */}
            {!loading && view === "all" && (
                <div style={{ display: "grid", gap: 10 }}>
                    {pgList.pageItems.map((item) =>
                        item.type === "single" ? (
                            <ResultRow key={item.row.result_id} r={item.row} busy={busy} act={act} />
                        ) : (
                            <ScreeningCard key={item.id} rows={item.rows} busy={busy} act={act} />
                        )
                    )}
                    <Pagination pg={pgList} label="items" />
                </div>
            )}

            {/* ── Grouped: by doctor / disease / patient ──────────── */}
            {!loading && view !== "all" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
                    {pgGroups.pageItems.map((g) => (
                        <Card key={g.key}>
                            <div style={{ fontWeight: 700, fontSize: 15 }}>{g.title}</div>
                            {g.sub && g.sub !== g.title && <div style={{ fontSize: 12.5, color: t.dim, marginTop: 2 }}>{g.sub}</div>}

                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, margin: "14px 0" }}>
                                {[
                                    ["Scans", g.scans],
                                    ["Positive", g.positive],
                                    view === "patient" ? ["Doctors", g.doctors.size] : ["Patients", g.patients.size],
                                ].map(([k, v]) => (
                                    <div key={k} style={{ border: `1px solid ${t.border}`, borderRadius: 10, padding: "8px 10px" }}>
                                        <div style={{ fontSize: 11, color: t.dim, textTransform: "uppercase" }}>{k}</div>
                                        <div style={{ fontSize: 20, fontWeight: 700, color: k === "Positive" && v > 0 ? "#ef4444" : "inherit" }}>{v}</div>
                                    </div>
                                ))}
                            </div>

                            {view !== "disease" && (
                                <div style={{ display: "grid", gap: 6, marginBottom: 14 }}>
                                    {Object.entries(g.diseases).map(([d, c]) => (
                                        <div key={d} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                                            <span>{d}</span>
                                            <span style={{ color: t.dim }}>
                                                {c.scans} scan{c.scans === 1 ? "" : "s"} ·{" "}
                                                <span style={{ color: c.positive ? "#ef4444" : "#22c55e" }}>{c.positive} positive</span>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div style={{ display: "flex", gap: 8 }}>
                                <SmallBtn icon={Eye} busy={busy === `gp-${g.key}`}
                                          onClick={() => act(`gp-${g.key}`, () => previewSummaryPdf(pdfFilters(groupFilter(g))))}>
                                    Preview report
                                </SmallBtn>
                                <SmallBtn icon={Download} primary busy={busy === `gd-${g.key}`}
                                          onClick={() => act(`gd-${g.key}`, () => downloadSummaryPdf(pdfFilters(groupFilter(g))))}>
                                    Download report
                                </SmallBtn>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* ── Pagination for the grouped views ───────────────── */}
            {!loading && view !== "all" && <Pagination pg={pgGroups} sizes={[12, 24, 48]} label="groups" />}
        </div>
    );
}


/* ── one analysis row ── */
function ResultRow({ r, busy, act, compact = false }) {
    const { t } = useTheme();
    const body = (
        <>
            <div style={{ width: compact ? 30 : 38, height: compact ? 30 : 38, borderRadius: 10, display: "grid", placeItems: "center",
                background: r.positive ? "rgba(239,68,68,.1)" : "rgba(37,99,235,.1)",
                color: r.positive ? "#ef4444" : "#2563eb", flexShrink: 0 }}>
                <FileText size={compact ? 15 : 18} />
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontWeight: 600, fontSize: compact ? 13 : 14, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    {r.disease}{compact ? "" : ` — ${r.scan_type}`}
                    <Pill tone={r.positive ? "danger" : "success"}>{r.prediction}</Pill>
                    {!compact && r.source === "full_screening" && <Pill tone="info">Full screening</Pill>}
                </div>
                <div style={{ fontSize: 12.5, color: t.dim, marginTop: 3 }}>
                    {compact
                        ? (typeof r.confidence === "number" ? `${r.confidence.toFixed(2)}% confidence` : "")
                        : <>
                            {patientLabel(r.patient_code, r.patient_name)} · {r.doctor_name || "Unknown doctor"} · {fmtDate(r.created_at)}
                            {typeof r.confidence === "number" ? ` · ${r.confidence.toFixed(2)}%` : ""}
                        </>}
                </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
                <SmallBtn icon={Eye} busy={busy === `p-${r.result_id}`}
                          onClick={() => act(`p-${r.result_id}`, () => previewResultPdf(r.component, r.result_id))}>
                    Preview
                </SmallBtn>
                <SmallBtn icon={Download} busy={busy === `d-${r.result_id}`}
                          onClick={() => act(`d-${r.result_id}`, () => downloadResultPdf(r.component, r.result_id))}>
                    Download
                </SmallBtn>
            </div>
        </>
    );
    return compact
        ? <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "10px 0",
            borderTop: `1px solid ${t.border}` }}>{body}</div>
        : <Card style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>{body}</Card>;
}

/* ── one Full Screening: one image, several engine results ── */
function ScreeningCard({ rows, busy, act }) {
    const { t } = useTheme();
    const first = rows[0];
    const findings = rows.filter((r) => r.positive);
    const ids = Object.fromEntries(rows.map((r) => [r.component, r.result_id]));
    const key = `s-${first.screening_id}`;

    return (
        <Card style={{ borderLeft: `4px solid ${findings.length ? "#ef4444" : "#22c55e"}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, display: "grid", placeItems: "center",
                    background: "rgba(139,92,246,.12)", color: "#8b5cf6", flexShrink: 0 }}>
                    <Layers size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        Full Screening — X-ray
                        <Pill tone={findings.length ? "danger" : "success"}>
                            {findings.length ? findings.map((r) => r.disease).join(", ") : "No abnormality detected"}
                        </Pill>
                    </div>
                    <div style={{ fontSize: 12.5, color: t.dim, marginTop: 3 }}>
                        {patientLabel(first.patient_code, first.patient_name)} · {first.doctor_name || "Unknown doctor"} · {fmtDate(first.created_at)} · {rows.length} engine{rows.length === 1 ? "" : "s"}
                    </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <SmallBtn icon={Eye} busy={busy === `${key}-p`} onClick={() => act(`${key}-p`, () => previewScreeningPdf(ids))}>
                        Preview
                    </SmallBtn>
                    <SmallBtn icon={Download} primary busy={busy === `${key}-d`} onClick={() => act(`${key}-d`, () => downloadScreeningPdf(ids))}>
                        Screening PDF
                    </SmallBtn>
                </div>
            </div>
            <div style={{ marginTop: 12, paddingLeft: 52 }}>
                {rows.map((r) => <ResultRow key={r.result_id} r={r} busy={busy} act={act} compact />)}
            </div>
        </Card>
    );
}