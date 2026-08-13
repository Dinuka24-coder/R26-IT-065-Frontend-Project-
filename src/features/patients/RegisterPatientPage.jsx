import { useState } from "react";
import { CheckCircle } from "lucide-react";
import { createPatient } from "../../api/patientApi";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Field from "../../components/ui/Field";

export default function RegisterPatientPage({ navigate }) {
  const [f, setF] = useState({ full_name: "", age: "", gender: "Male", nic: "", contact_number: "", address: "", clinical_notes: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.full_name && f.age && f.nic && f.contact_number;

  async function save() {
    setError(""); setSaving(true);
    try {
      await createPatient({ ...f, age: Number(f.age) });
      navigate("patients-search");
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <PageHeader title="Register Patient" subtitle="Add a new patient to the system" />
      <Card style={{ maxWidth: 760 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          <Field label="Full Name" value={f.full_name} onChange={set("full_name")} />
          <Field label="Age" type="number" value={f.age} onChange={set("age")} />
          <Field label="Gender" as="select" value={f.gender} onChange={set("gender")} options={["Male", "Female", "Other"]} />
          <Field label="NIC" value={f.nic} onChange={set("nic")} />
          <Field label="Contact Number" value={f.contact_number} onChange={set("contact_number")} />
          <Field label="Address" value={f.address} onChange={set("address")} />
        </div>
        <div style={{ marginTop: 16 }}>
          <Field label="Clinical Notes" as="textarea" value={f.clinical_notes} onChange={set("clinical_notes")}
            placeholder="Initial observations, symptoms, referral reason…" />
        </div>
        {error && <div style={{ marginTop: 14, color: "#ef4444", fontSize: 13 }}>{error}</div>}
        <div style={{ marginTop: 18 }}>
          <Button onClick={save} disabled={!valid || saving}>
            <CheckCircle size={15} /> {saving ? "Registering…" : "Register Patient"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
