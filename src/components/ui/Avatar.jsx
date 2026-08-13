import { useTheme } from "../../context/ThemeContext";
import { initials } from "../../utils/helpers";

export default function Avatar({ name, size = 38 }) {
  const { t } = useTheme();
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: t.accent,
      display: "grid", placeItems: "center", color: "#fff",
      fontWeight: 700, fontSize: size * 0.34, flexShrink: 0,
    }}>
      {initials(name)}
    </div>
  );
}
