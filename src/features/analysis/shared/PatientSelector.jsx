import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import { useTheme } from "../../../context/ThemeContext";
import { listPatients } from "../../../api/patientApi";
import Button from "../../../components/ui/Button";

export default function PatientSelector({ value, onChange, navigate }) {
  const { t } = useTheme();
  const [patients, setPatients] = useState([]);

  useEffect(() => { listPatients().then(setPatients).catch(console.error); }, []);

  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: t.dim, marginBottom: 6, display: "block" }}>
        Select Patient
      </label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", padding: "11px 13px", borderRadius: 9, border: `1px solid ${t.border}`, background: t.bg, color: t.text, fontSize: 14 }}>
        <option value="">— Choose patient —</option>
        {patients.map((p) => <option key={p.id} value={p.id}>{p.full_name} ({p.nic})</option>)}
      </select>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: t.dim }}>Patient not registered yet?</span>
        <Button variant="secondary" onClick={() => navigate("patients-register")} style={{ padding: "6px 12px", fontSize: 13 }}>
          <UserPlus size={14} /> Register Patient
        </Button>
      </div>
    </div>
  );
}
