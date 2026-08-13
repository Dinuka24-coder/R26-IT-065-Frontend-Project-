import { Moon, Sun, Settings, Bell } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import Avatar from "../ui/Avatar";

export default function TopBar({ navigate }) {
  const { t, dark, toggle } = useTheme();
  const { user, isAdmin } = useAuth();

  const iconBtn = {
    width: 36, height: 36, borderRadius: 9, border: `1px solid ${t.border}`,
    background: "transparent", color: t.text, display: "grid",
    placeItems: "center", cursor: "pointer",
  };

  return (
    <header style={{
      height: 60, display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "0 28px", background: t.card, borderBottom: `1px solid ${t.border}`,
      position: "sticky", top: 0, zIndex: 10,
    }}>
      <div style={{ fontWeight: 600, fontSize: 15 }}>PulmoAI Diagnostic System</div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button onClick={toggle} style={iconBtn} title={dark ? "Switch to light mode" : "Switch to dark mode"}>
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button style={iconBtn} title="Notifications"><Bell size={16} /></button>
        {isAdmin && (
          <button onClick={() => navigate("settings")} style={iconBtn} title="Settings">
            <Settings size={16} />
          </button>
        )}
        <Avatar name={user?.full_name} size={34} />
      </div>
    </header>
  );
}
