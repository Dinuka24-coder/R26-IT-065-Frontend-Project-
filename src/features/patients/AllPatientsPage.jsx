import { useEffect, useState } from "react";
import { Eye, Trash2 } from "lucide-react";
import { listPatients, deletePatient } from "../../api/patientApi";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Table from "../../components/ui/Table";
import Loader from "../../components/ui/Loader";

export default function AllPatientsPage({ navigate }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <Loader />;

  return (
    <div>
      <PageHeader title="All Patients" subtitle={`${patients.length} registered patients`} />
      <Card>
        <Table
          head={["Name", "Age", "Gender", "NIC", "Contact", "Actions"]}
          rows={patients.map((p) => [
            p.full_name, p.age, p.gender, p.nic, p.contact_number,
            <div style={{ display: "flex", gap: 6 }}>
              <Button variant="secondary" onClick={() => navigate("patient-detail", { patientId: p.id })} style={{ padding: "6px 10px" }} title="View"><Eye size={14} /></Button>
              <Button variant="danger" onClick={() => remove(p.id)} style={{ padding: "6px 10px" }} title="Delete"><Trash2 size={14} /></Button>
            </div>,
          ])} />
      </Card>
    </div>
  );
}
