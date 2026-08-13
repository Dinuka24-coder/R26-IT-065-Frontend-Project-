import { useState } from "react";
import { Search, UserPlus, Eye } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { searchPatients } from "../../api/patientApi";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Avatar from "../../components/ui/Avatar";

export default function SearchPatientPage({ navigate }) {
  const { t } = useTheme();
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function doSearch() {
    if (!q.trim()) return;
    setLoading(true); setError("");
    try {
      setResults(await searchPatients(q.trim()));
      setSearched(true);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <PageHeader title="Search Patient" subtitle="Find a patient by name or NIC to view their medical history"
        actions={<Button onClick={() => navigate("patients-register")}><UserPlus size={15} /> Register New Patient</Button>} />

      <Card style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Search size={18} color={t.dim} />
          <input placeholder="Search by name or NIC…" value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doSearch()}
            style={{ flex: 1, border: "none", background: "transparent", fontSize: 15, color: t.text }} />
          <Button onClick={doSearch} disabled={loading}>{loading ? "Searching…" : "Search"}</Button>
        </div>
      </Card>

      {error && <Card style={{ marginBottom: 16, color: "#ef4444", fontSize: 14 }}>{error}</Card>}

      {searched && results.length === 0 && !loading && (
        <Card style={{ textAlign: "center", padding: 40 }}>
          <div style={{ color: t.dim, marginBottom: 16 }}>No patient found for "{q}"</div>
          <Button onClick={() => navigate("patients-register")}><UserPlus size={15} /> Register This Patient</Button>
        </Card>
      )}

      <div style={{ display: "grid", gap: 12 }}>
        {results.map((p) => (
          <Card key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <Avatar name={p.full_name} size={44} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{p.full_name}</div>
                <div style={{ fontSize: 13, color: t.dim }}>{p.age} yrs · {p.gender} · NIC {p.nic}</div>
              </div>
            </div>
            <Button onClick={() => navigate("patient-detail", { patientId: p.id })}><Eye size={15} /> View Details</Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
