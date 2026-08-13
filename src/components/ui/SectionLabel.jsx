import { useTheme } from "../../context/ThemeContext";

export default function SectionLabel({ children, style = {} }) {
  const { t } = useTheme();
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
      color: t.dim, textTransform: "uppercase", marginBottom: 14, ...style,
    }}>{children}</div>
  );
}
