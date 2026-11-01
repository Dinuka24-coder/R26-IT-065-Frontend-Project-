import { Search, X } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

/** Search box + disease and status dropdowns + Clear button */
export default function HistoryFilters({
                                           filters, onChange, onClear, active, diseases = [], statuses = [], searchPlaceholder,
                                       }) {
    const { t } = useTheme();

    const control = {
        height: 38, borderRadius: 8, fontSize: 13, fontFamily: "inherit",
        border: `1px solid ${t.border}`, background: "transparent", color: t.text, outline: "none",
    };
    const opt = { color: "#0f172a" };

    return (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
            {searchPlaceholder && (
                <div style={{ position: "relative", flex: "1 1 220px", minWidth: 180 }}>
                    <Search size={15} color={t.dim}
                            style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
                    <input
                        type="search"
                        value={filters.q}
                        onChange={(e) => onChange({ q: e.target.value })}
                        placeholder={searchPlaceholder}
                        style={{ ...control, width: "100%", padding: "0 12px 0 34px" }}
                    />
                </div>
            )}

            <select value={filters.disease} onChange={(e) => onChange({ disease: e.target.value })}
                    style={{ ...control, padding: "0 10px", cursor: "pointer", flex: "0 1 190px" }}>
                <option value="" style={opt}>All diseases</option>
                {diseases.map((d) => <option key={d} value={d} style={opt}>{d}</option>)}
            </select>

            <select value={filters.status} onChange={(e) => onChange({ status: e.target.value })}
                    style={{ ...control, padding: "0 10px", cursor: "pointer", flex: "0 1 150px" }}>
                <option value="" style={opt}>All results</option>
                {statuses.map((s) => <option key={s} value={s} style={opt}>{s}</option>)}
            </select>

            {active && (
                <button type="button" onClick={onClear}
                        style={{
                            ...control, padding: "0 12px", cursor: "pointer", fontWeight: 600,
                            display: "inline-flex", alignItems: "center", gap: 6, color: t.dim,
                        }}>
                    <X size={14} /> Clear
                </button>
            )}
        </div>
    );
}

/** Small summary badges, e.g. "12 scans · 8 positive · 4 normal" */
export function StatChips({ items }) {
    const { t } = useTheme();
    const tones = {
        info: { c: t.accent, bg: t.accentSoft },
        danger: { c: "#dc2626", bg: "rgba(220,38,38,0.10)" },
        success: { c: "#16a34a", bg: "rgba(22,163,74,0.10)" },
    };
    return (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {items.map(({ label, value, tone = "info" }) => (
                <span key={label} style={{
                    display: "inline-flex", alignItems: "baseline", gap: 6,
                    padding: "6px 12px", borderRadius: 20, fontSize: 13,
                    color: tones[tone].c, background: tones[tone].bg,
                }}>
          <b style={{ fontSize: 15 }}>{value}</b> {label}
        </span>
            ))}
        </div>
    );
}