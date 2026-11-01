import { Search, X } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

/** Search input with an icon and a clear (×) button */
export default function SearchBox({ value, onChange, placeholder = "Search…", style }) {
    const { t } = useTheme();
    return (
        <div style={{ position: "relative", width: "100%", maxWidth: 420, ...style }}>
            <Search size={16} color={t.dim}
                    style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                aria-label={placeholder}
                style={{
                    width: "100%", height: 42, padding: "0 38px 0 38px", borderRadius: 10,
                    border: `1px solid ${t.border}`, background: t.card || t.bg, color: t.text,
                    fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box",
                }}
            />
            {value && (
                <button type="button" onClick={() => onChange("")} aria-label="Clear search" title="Clear"
                        style={{
                            position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                            width: 26, height: 26, borderRadius: 6, border: 0, cursor: "pointer",
                            display: "grid", placeItems: "center", background: "transparent", color: t.dim,
                        }}>
                    <X size={15} />
                </button>
            )}
        </div>
    );
}