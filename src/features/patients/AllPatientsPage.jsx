import { useEffect, useMemo, useState } from "react";
import { Eye, Trash2 } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { listPatients, deletePatient } from "../../api/patientApi";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Table from "../../components/ui/Table";
import Loader from "../../components/ui/Loader";
import SearchBox from "../../components/ui/SearchBox";
import TableFrame from "../../components/ui/TableFrame";
import Pagination, { usePagination } from "../../components/ui/Pagination";

const SEARCH_FIELDS = ["full_name", "nic", "contact_number", "gender"];

export default function AllPatientsPage({ navigate }) {
    const { t } = useTheme();
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState("");

    async function load() {
        try { setPatients(await listPatients()); }
        catch (e) { console.error(e); }
        finally { setLoading(false); }
    }
    useEffect(() => { load(); }, []);

    async function remove(id) {
        if (!window.confirm("Delete this patient? This cannot be undone.")) return;
        await deletePatient(id);
        load();
    }

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return patients;
        return patients.filter((p) =>
            SEARCH_FIELDS.some((k) => String(p[k] ?? "").toLowerCase().includes(q))
        );
    }, [patients, query]);

    const pg = usePagination(filtered, 10, query); // back to page 1 when the search changes

    if (loading) return <Loader />;

    const subtitle = query
        ? `${filtered.length} of ${patients.length} patients match "${query.trim()}"`
        : `${patients.length} registered patients`;

    return (
        <div>
            <PageHeader title="All Patients" subtitle={subtitle} />
            <Card>
                <div style={{ marginBottom: 16 }}>
                    <SearchBox value={query} onChange={setQuery}
                               placeholder="Search by name, NIC or contact number…" />
                </div>

                <TableFrame>
                    <Table
                        head={["Name", "Age", "Gender", "NIC", "Contact", "Actions"]}
                        rows={pg.pageItems.map((p) => [
                            <span style={{ fontWeight: 600 }}>{p.full_name}</span>,
                            p.age, p.gender, p.nic,
                            p.contact_number || <span style={{ color: t.dim }}>—</span>,
                            <div style={{ display: "flex", gap: 6 }}>
                                <Button variant="secondary" onClick={() => navigate("patient-detail", { patientId: p.id })} style={{ padding: "6px 10px" }} title="View"><Eye size={14} /></Button>
                                <Button variant="danger" onClick={() => remove(p.id)} style={{ padding: "6px 10px" }} title="Delete"><Trash2 size={14} /></Button>
                            </div>,
                        ])}
                        empty={query
                            ? `No patients match "${query.trim()}".`
                            : "No patients registered yet."} />
                </TableFrame>

                <Pagination pg={pg} label="patients" />
            </Card>
        </div>
    );
}