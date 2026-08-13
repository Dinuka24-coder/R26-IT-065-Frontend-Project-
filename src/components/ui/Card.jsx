import { useTheme } from "../../context/ThemeContext";

export default function Card({ children, style = {}, ...rest }) {
  const { t } = useTheme();
  return (
    <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, padding: 20, ...style }} {...rest}>
      {children}
    </div>
  );
}
