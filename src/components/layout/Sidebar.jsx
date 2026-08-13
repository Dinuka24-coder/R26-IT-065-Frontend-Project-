import {
  Activity, LayoutDashboard, Search, UserPlus, UserCog, Users,
  Stethoscope, ScanLine, History, FileText, LogOut,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import Avatar from "../ui/Avatar";

export default function Sidebar({ page, navigate }) {
  const { t } = useTheme();
  const { user, signOut, isAdmin } = useAuth();

  const nav = [
    { id: "dashboard",         label: "Dashboard",          icon: LayoutDashboard },
    { id: "patients-search",   label: "Search Patient",     icon: Search },
    { id: "patients-register", label: "Register Patient",   icon: UserPlus },
    ...(isAdmin
      ? [{ id: "doctors", label: "Manage Doctors", icon: UserCog },
         { id: "all-patients", label: "All Patients", icon: Users }]
      : [{ id: "my-profile", label: "My Profile", icon: Stethoscope }]),
    { id: "analysis",  label: "AI Analysis",        icon: ScanLine },
    { id: "history",   label: "Prediction History", icon: History },
    { id: "reports",   label: "Reports",            icon: FileText },
  ];

  function isActive(id) {
    if (id === "analysis") return page.startsWith("analysis");
    if (id === "patients-search") return page === "patients-search" || page === "patient-detail";
    if (id === "doctors") return page === "doctors" || page === "doctor-detail";
    return page === id;
  }

  return (
    <aside style={{
      width: 250, background: t.sidebar, borderRight: `1px solid ${t.border}`,
      display: "flex", flexDirection: "column", padding: "20px 14px",
      position: "sticky", top: 0, height: "100vh", flexShrink: 0,
    }}>
      <div style={{ display: "flex", gap: 11, alignItems: "center", padding: "4px 8px 20px" }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: t.accent, display: "grid", placeItems: "center" }}>
          <Activity size={20} color="#fff" />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, color: "#fff" }}>PulmoAI</div>
          <div style={{ fontSize: 11, color: t.navText }}>Diagnostic System</div>
        </div>
      </div>

      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: t.navText, padding: "0 10px 10px" }}>
        NAVIGATION
      </div>

      <nav style={{ flex: 1, overflowY: "auto" }}>
        {nav.map((n) => {
          const active = isActive(n.id);
          return (
            <button key={n.id} onClick={() => navigate(n.id)} style={{
              display: "flex", gap: 11, alignItems: "center", width: "100%",
              padding: "10px 12px", marginBottom: 3, border: "none", borderRadius: 9,
              fontSize: 14, fontWeight: 500, cursor: "pointer", textAlign: "left",
              background: active ? t.accent : "transparent",
              color: active ? "#fff" : t.navText, transition: "background 0.15s",
            }}>
              <n.icon size={18} /> {n.label}
            </button>
          );
        })}
      </nav>

      <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "14px 8px 10px", borderTop: `1px solid ${t.border}` }}>
        <Avatar name={user?.full_name} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {user?.full_name}
          </div>
          <div style={{ fontSize: 11, color: t.navText, textTransform: "capitalize" }}>{user?.role}</div>
        </div>
      </div>

      <button onClick={signOut} style={{
        display: "flex", gap: 10, alignItems: "center", padding: "10px 12px",
        border: "none", background: "transparent", color: "#ef4444",
        fontSize: 14, fontWeight: 600, cursor: "pointer",
      }}>
        <LogOut size={16} /> Sign Out
      </button>
    </aside>
  );
}
