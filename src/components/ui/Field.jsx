import { useTheme } from "../../context/ThemeContext";

export default function Field({ label, value, onChange, type = "text", as = "input", options = [], placeholder }) {
  const { t } = useTheme();
  const base = {
    width: "100%", padding: "11px 13px", borderRadius: 9,
    border: `1px solid ${t.border}`, background: t.bg, color: t.text, fontSize: 14,
  };
  return (
    <div>
      {label && <label style={{ fontSize: 13, fontWeight: 600, color: t.dim, marginBottom: 6, display: "block" }}>{label}</label>}
      {as === "select" ? (
        <select value={value} onChange={onChange} style={base}>
          {options.map((o) =>
            typeof o === "object"
              ? <option key={o.value} value={o.value}>{o.label}</option>
              : <option key={o} value={o}>{o}</option>
          )}
        </select>
      ) : as === "textarea" ? (
        <textarea value={value} onChange={onChange} placeholder={placeholder}
          style={{ ...base, minHeight: 90, resize: "vertical" }} />
      ) : (
        <input type={type} value={value} onChange={onChange} placeholder={placeholder} style={base} />
      )}
    </div>
  );
}
