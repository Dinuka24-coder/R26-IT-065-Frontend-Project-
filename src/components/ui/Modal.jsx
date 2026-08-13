import { X } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

export default function Modal({ title, children, onClose }) {
  const { t } = useTheme();
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "grid", placeItems: "center", zIndex: 100, padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "100%", maxWidth: 460, background: t.card,
        border: `1px solid ${t.border}`, borderRadius: 16, padding: 24,
        maxHeight: "90vh", overflowY: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 17 }}>{title}</div>
          <button onClick={onClose} style={{
            width: 34, height: 34, borderRadius: 9, border: `1px solid ${t.border}`,
            background: "transparent", color: t.text, display: "grid", placeItems: "center", cursor: "pointer",
          }}><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
