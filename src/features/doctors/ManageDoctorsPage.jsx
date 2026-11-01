import { useEffect, useMemo, useState } from "react";
import { UserPlus, Eye, Trash2, CheckCircle, KeyRound } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { listDoctors, createDoctor, deleteDoctor, resetDoctorPassword } from "../../api/userApi";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Field from "../../components/ui/Field";
import Modal from "../../components/ui/Modal";
import Loader from "../../components/ui/Loader";
import Avatar from "../../components/ui/Avatar";
import SearchBox from "../../components/ui/SearchBox";
import Pagination, { usePagination } from "../../components/ui/Pagination";

const EMPTY = { full_name: "", email: "", contact_number: "", registered_number: "", password: "" };
const SEARCH_FIELDS = ["full_name", "email", "registered_number", "contact_number"];

export default function ManageDoctorsPage({ navigate }) {
  const { t } = useTheme();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState(EMPTY);
  const [query, setQuery] = useState("");

  // ── Password reset state ─────────────────────────────────────
  const [resetting, setResetting] = useState(null);
  const [newPw, setNewPw] = useState("");
  const [resetMsg, setResetMsg] = useState("");

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.full_name && f.email && f.registered_number && f.password;

  async function load() {
    try { setDoctors(await listDoctors()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  // ── Search + pages ───────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return doctors;
    return doctors.filter((d) =>
        SEARCH_FIELDS.some((k) => String(d[k] ?? "").toLowerCase().includes(q))
    );
  }, [doctors, query]);
  const pg = usePagination(filtered, 10, query); // back to page 1 when the search changes

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

  async function doReset() {
    setResetMsg("");
    try {
      await resetDoctorPassword(resetting.id, newPw);
      setResetMsg(`Password reset. Share this temporary password with ${resetting.full_name}: ${newPw}`);
      setNewPw("");
    } catch (e) {
      setResetMsg(e.message);
    }
  }

  if (loading) return <Loader />;

  return (
      <div>
        <PageHeader title="Manage Doctors"
                    subtitle={query
                        ? `${filtered.length} of ${doctors.length} doctors match "${query.trim()}"`
                        : `${doctors.length} doctor accounts`}
                    actions={<Button onClick={() => setShow(true)}><UserPlus size={15} /> Add Doctor</Button>} />

        {doctors.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <SearchBox value={query} onChange={setQuery}
                         placeholder="Search by name, email, SLMC number or contact…" />
            </div>
        )}

        <div style={{ display: "grid", gap: 12 }}>
          {pg.pageItems.map((d) => (
              <Card key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <Avatar name={d.full_name} size={44} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{d.full_name}</div>
                    <div style={{ fontSize: 13, color: t.dim }}>{d.email} · {d.registered_number}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button variant="secondary" onClick={() => navigate("doctor-detail", { doctor: d })}>
                    <Eye size={15} /> View
                  </Button>
                  <Button variant="secondary" onClick={() => { setResetting(d); setResetMsg(""); }}
                          style={{ padding: "8px 11px" }} title="Reset password">
                    <KeyRound size={15} />
                  </Button>
                  <Button variant="danger" onClick={() => remove(d.id)}
                          style={{ padding: "8px 11px" }} title="Delete">
                    <Trash2 size={15} />
                  </Button>
                </div>
              </Card>
          ))}
          {doctors.length === 0 && (
              <Card style={{ textAlign: "center", padding: 40, color: t.dim }}>
                No doctors yet. Add one to get started.
              </Card>
          )}
          {doctors.length > 0 && filtered.length === 0 && (
              <Card style={{ textAlign: "center", padding: 40, color: t.dim }}>
                No doctors match "{query.trim()}".{" "}
                <button type="button" onClick={() => setQuery("")}
                        style={{ background: "none", border: 0, padding: 0, cursor: "pointer",
                          color: t.accent, fontWeight: 600, fontSize: "inherit", fontFamily: "inherit" }}>
                  Clear search
                </button>
              </Card>
          )}
        </div>

        <Pagination pg={pg} label="doctors" />

        {/* ── Create Doctor ────────────────────────────────────── */}
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

        {/* ── Reset Password ───────────────────────────────────── */}
        {resetting && (
            <Modal title={`Reset Password — ${resetting.full_name}`}
                   onClose={() => { setResetting(null); setResetMsg(""); setNewPw(""); }}>
              <div style={{ display: "grid", gap: 14 }}>
                <div style={{ fontSize: 13, color: t.dim, lineHeight: 1.5 }}>
                  Set a temporary password. The doctor will be required to change it on next login.
                </div>
                <Field label="New Temporary Password" type="text" value={newPw}
                       onChange={(e) => setNewPw(e.target.value)} placeholder="At least 6 characters" />
                {resetMsg && (
                    <div style={{
                      fontSize: 13, padding: "10px 12px", borderRadius: 8,
                      background: resetMsg.startsWith("Password reset") ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                      color: resetMsg.startsWith("Password reset") ? "#22c55e" : "#ef4444",
                      wordBreak: "break-word",
                    }}>{resetMsg}</div>
                )}
                <Button onClick={doReset} disabled={newPw.length < 6} full>
                  <KeyRound size={15} /> Reset Password
                </Button>
              </div>
            </Modal>
        )}
      </div>
  );
}