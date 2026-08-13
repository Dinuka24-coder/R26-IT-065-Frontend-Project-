import { useEffect, useState } from "react";
import { UserPlus, Eye, Trash2, CheckCircle } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { listDoctors, createDoctor, deleteDoctor } from "../../api/userApi";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Field from "../../components/ui/Field";
import Modal from "../../components/ui/Modal";
import Loader from "../../components/ui/Loader";
import Avatar from "../../components/ui/Avatar";

const EMPTY = { full_name: "", email: "", contact_number: "", registered_number: "", password: "" };

export default function ManageDoctorsPage({ navigate }) {
  const { t } = useTheme();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState(EMPTY);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.full_name && f.email && f.registered_number && f.password;

  async function load() {
    try { setDoctors(await listDoctors()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function add() {
    setError(""); setSaving(true);
    try { await createDoctor(f); setShow(false); setF(EMPTY); await load(); }
    catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function remove(id) {
    if (!window.confirm("Delete this doctor account?")) return;
    await deleteDoctor(id);
    load();
  }

  if (loading) return <Loader />;

  return (
    <div>
      <PageHeader title="Manage Doctors" subtitle={`${doctors.length} doctor accounts`}
        actions={<Button onClick={() => setShow(true)}><UserPlus size={15} /> Add Doctor</Button>} />

      <div style={{ display: "grid", gap: 12 }}>
        {doctors.map((d) => (
          <Card key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <Avatar name={d.full_name} size={44} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{d.full_name}</div>
                <div style={{ fontSize: 13, color: t.dim }}>{d.email} · {d.registered_number}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="secondary" onClick={() => navigate("doctor-detail", { doctor: d })}><Eye size={15} /> View</Button>
              <Button variant="danger" onClick={() => remove(d.id)} style={{ padding: "8px 11px" }} title="Delete"><Trash2 size={15} /></Button>
            </div>
          </Card>
        ))}
        {doctors.length === 0 && <Card style={{ textAlign: "center", padding: 40, color: t.dim }}>No doctors yet. Add one to get started.</Card>}
      </div>

      {show && (
        <Modal title="Create Doctor" onClose={() => setShow(false)}>
          <div style={{ display: "grid", gap: 14 }}>
            <Field label="Full Name" value={f.full_name} onChange={set("full_name")} placeholder="Dr. Anura Wijesekara" />
            <Field label="Email" type="email" value={f.email} onChange={set("email")} placeholder="anura@hospital.lk" />
            <Field label="Contact Number" value={f.contact_number} onChange={set("contact_number")} />
            <Field label="Registered Number" value={f.registered_number} onChange={set("registered_number")} placeholder="SLMC-00000" />
            <Field label="Password" type="password" value={f.password} onChange={set("password")} />
            {error && <div style={{ color: "#ef4444", fontSize: 13 }}>{error}</div>}
            <Button onClick={add} disabled={!valid || saving} full>
              <CheckCircle size={15} /> {saving ? "Creating…" : "Create Doctor"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
