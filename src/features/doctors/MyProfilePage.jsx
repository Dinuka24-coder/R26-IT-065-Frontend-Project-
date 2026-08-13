import { useState } from "react";
import { CheckCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { updateDoctor } from "../../api/userApi";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Field from "../../components/ui/Field";
import SectionLabel from "../../components/ui/SectionLabel";

export default function MyProfilePage() {
  const { user, updateUser } = useAuth();
  const [f, setF] = useState({
    full_name: user?.full_name || "",
    email: user?.email || "",
    contact_number: user?.contact_number || "",
    registered_number: user?.registered_number || "",
  });
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function save() {
    setMsg(""); setSaving(true);
    try {
      await updateDoctor(user.id, f);
      updateUser(f);
      setOk(true); setMsg("Profile updated");
    } catch (e) { setOk(false); setMsg(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <PageHeader title="My Profile" subtitle="View and edit your profile information" />
      <Card style={{ maxWidth: 560 }}>
        <SectionLabel>Editable Details</SectionLabel>
        <div style={{ display: "grid", gap: 14 }}>
          <Field label="Full Name" value={f.full_name} onChange={set("full_name")} />
          <Field label="Email" type="email" value={f.email} onChange={set("email")} />
          <Field label="Contact Number" value={f.contact_number} onChange={set("contact_number")} />
          <Field label="Registered Number" value={f.registered_number} onChange={set("registered_number")} />
          {msg && <div style={{ fontSize: 13, color: ok ? "#22c55e" : "#ef4444" }}>{msg}</div>}
          <Button onClick={save} disabled={saving}>
            <CheckCircle size={15} /> {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
