import { Moon, Sun, Shield, Database } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";

export default function SettingsPage() {
  const { t, dark, toggle } = useTheme();

  return (
    <div>
      <PageHeader title="Settings" subtitle="System configuration and preferences" />
      <div style={{ display: "grid", gap: 16, maxWidth: 700 }}>
        <Card>
          <SectionTitle t={t} icon={dark ? Moon : Sun}>Appearance</SectionTitle>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Theme</div>
              <div style={{ fontSize: 13, color: t.dim }}>Currently using {dark ? "dark" : "light"} mode</div>
            </div>
            <Button variant="secondary" onClick={toggle}>
              {dark ? <Sun size={15} /> : <Moon size={15} />} Switch to {dark ? "light" : "dark"}
            </Button>
          </div>
        </Card>

        <Card>
          <SectionTitle t={t} icon={Shield}>Access Control</SectionTitle>
          <PlannedRow t={t} label="Role permissions" desc="Configure what each role can access" />
          <PlannedRow t={t} label="Password policy" desc="Set minimum password requirements" />
          <PlannedRow t={t} label="Session timeout" desc="Auto sign-out after inactivity" last />
        </Card>

        <Card>
          <SectionTitle t={t} icon={Database}>System</SectionTitle>
          <PlannedRow t={t} label="Model versions" desc="View and manage deployed AI models" />
          <PlannedRow t={t} label="Audit log" desc="Track all system actions" />
          <PlannedRow t={t} label="Data export" desc="Export patient and prediction records" last />
        </Card>
      </div>
    </div>
  );
}

function SectionTitle({ t, icon: Icon, children }) {
  return (
    <div style={{ display: "flex", gap: 9, alignItems: "center", marginBottom: 16 }}>
      <Icon size={16} color={t.accent} />
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: t.dim, textTransform: "uppercase" }}>{children}</span>
    </div>
  );
}

function PlannedRow({ t, label, desc, last }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: "12px 0", borderBottom: last ? "none" : `1px solid ${t.border}` }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 13, color: t.dim }}>{desc}</div>
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: t.dim, background: t.accentSoft, padding: "4px 10px", borderRadius: 20, whiteSpace: "nowrap" }}>
        Coming soon
      </span>
    </div>
  );
}
