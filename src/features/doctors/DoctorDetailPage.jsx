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
import Pagination, { usePagination } from "../../components/ui/Pagination";
import TableFrame from "../../components/ui/TableFrame";
import HistoryFilters, { StatChips } from "../../components/ui/HistoryFilters";
import useHistoryFilters from "../../hooks/useHistoryFilters";
import { fmtDate } from "../../utils/helpers";

const SEARCH_KEYS = ["patient_name", "disease"];

export default function DoctorDetailPage({ navigate, doctor }) {
    const { t } = useTheme();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!doctor) return;
        getHistory({ doctor_id: doctor.id })
            .then((h) => setHistory(h.records || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [doctor]);

    const hf = useHistoryFilters(history, SEARCH_KEYS);
    const filterKey = `${hf.filters.q}|${hf.filters.disease}|${hf.filters.status}`;
    const pg = usePagination(hf.filtered, 10, filterKey); // back to page 1 when filters change

    if (!doctor) return <Card>Doctor not found.</Card>;

    const positive = history.filter((h) => h.status === "Positive").length;
    const patients = new Set(history.map((h) => h.patient_name).filter(Boolean)).size;

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
                    <>
                        {history.length > 0 && (
                            <>
                                <StatChips items={[
                                    { label: history.length === 1 ? "analysis" : "analyses", value: history.length },
                                    { label: patients === 1 ? "patient" : "patients", value: patients },
                                    { label: "positive", value: positive, tone: "danger" },
                                    { label: "normal", value: history.length - positive, tone: "success" },
                                ]} />
                                <HistoryFilters
                                    filters={hf.filters} onChange={hf.update} onClear={hf.reset} active={hf.active}
                                    diseases={hf.diseases} statuses={hf.statuses}
                                    searchPlaceholder="Search patient or disease…" />
                            </>
                        )}

                        <TableFrame>
                            <Table
                                head={["Patient", "Disease", "Scan", "Confidence", "Status", "Date"]}
                                rows={pg.pageItems.map((h) => [
                                    h.patient_name
                                        ? <span style={{ fontWeight: 600 }}>{h.patient_name}</span>
                                        : <span style={{ color: t.dim, fontStyle: "italic" }}>Unknown patient</span>,
                                    h.disease,
                                    <Pill tone="info">{h.scan_type}</Pill>,
                                    <ConfidenceBar value={h.confidence} status={h.status} />,
                                    <Pill tone={h.status === "Positive" ? "danger" : "success"}>{h.status}</Pill>,
                                    <span style={{ color: t.dim }}>{fmtDate(h.date)}</span>,
                                ])}
                                empty={hf.active
                                    ? "No results match these filters."
                                    : "This doctor has not run any analyses yet."} />
                        </TableFrame>

                        <Pagination pg={pg} label="analyses" />
                    </>
                )}
            </Card>
        </div>
    );
}