import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

/**
 * Splits a list into pages.
 *   const pg = usePagination(items, 10, resetKey);
 *   pg.pageItems  -> items on the current page
 * The page goes back to 1 whenever `resetKey` changes (e.g. the filters).
 */
export function usePagination(items, initialSize = 10, resetKey = "") {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(initialSize);

    const total = items.length;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));

    useEffect(() => { setPage(1); }, [resetKey, pageSize]);       // new filters / page size -> page 1
    useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);

    const pageItems = useMemo(
        () => items.slice((page - 1) * pageSize, page * pageSize),
        [items, page, pageSize]
    );

    return { page, setPage, pageSize, setPageSize, pageCount, total, pageItems };
}

// 1 … 4 5 6 … 12
function pageNumbers(page, count) {
    if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
    const out = [1];
    const start = Math.max(2, page - 1);
    const end = Math.min(count - 1, page + 1);
    if (start > 2) out.push("…");
    for (let p = start; p <= end; p++) out.push(p);
    if (end < count - 1) out.push("…");
    out.push(count);
    return out;
}

/** Page controls: "Showing 11–20 of 45", page size, Previous / numbers / Next. */
export default function Pagination({ pg, sizes = [10, 20, 50], label = "results" }) {
    const { t } = useTheme();
    const { page, setPage, pageSize, setPageSize, pageCount, total } = pg;
    if (total === 0) return null;

    const from = (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, total);

    const btn = (active, disabled) => ({
        minWidth: 34, height: 34, padding: "0 10px", borderRadius: 8, fontSize: 13, fontWeight: 600,
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4,
        border: `1px solid ${active ? "#2563eb" : t.border}`,
        background: active ? "#2563eb" : "transparent",
        color: active ? "#fff" : "inherit",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
    });

    return (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12,
            justifyContent: "space-between", marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: t.dim }}>
                <span>Showing {from}–{to} of {total} {label}</span>
                <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    style={{ padding: "6px 8px", borderRadius: 8, fontSize: 13, border: `1px solid ${t.border}`,
                        background: t.card || t.bg, color: t.text }}
                >
                    {sizes.map((s) => (
                        <option key={s} value={s} style={{ background: t.card || t.bg, color: t.text }}>{s} / page</option>
                    ))}
                </select>
            </div>

            {pageCount > 1 && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <button style={btn(false, page === 1)} disabled={page === 1} onClick={() => setPage(page - 1)}>
                        <ChevronLeft size={15} /> Prev
                    </button>
                    {pageNumbers(page, pageCount).map((p, i) =>
                        p === "…" ? (
                            <span key={`gap-${i}`} style={{ color: t.dim, padding: "0 2px" }}>…</span>
                        ) : (
                            <button key={p} style={btn(p === page, false)} onClick={() => setPage(p)}>{p}</button>
                        )
                    )}
                    <button style={btn(false, page === pageCount)} disabled={page === pageCount} onClick={() => setPage(page + 1)}>
                        Next <ChevronRight size={15} />
                    </button>
                </div>
            )}
        </div>
    );
}