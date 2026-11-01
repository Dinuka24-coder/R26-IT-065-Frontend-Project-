import { useMemo, useState } from "react";

const EMPTY = { q: "", disease: "", status: "" };

/**
 * Sorts history newest first and applies search / disease / status filters.
 * searchKeys = which fields the search box looks in, e.g. ["patient_name"]
 */
export default function useHistoryFilters(records = [], searchKeys = []) {
    const [filters, setFilters] = useState(EMPTY);
    const keys = searchKeys.join("|");

    const sorted = useMemo(
        () => [...records].sort((a, b) => new Date(b.date) - new Date(a.date)),
        [records]
    );
    const diseases = useMemo(
        () => [...new Set(records.map((r) => r.disease).filter(Boolean))].sort(),
        [records]
    );
    const statuses = useMemo(
        () => [...new Set(records.map((r) => r.status).filter(Boolean))].sort(),
        [records]
    );

    const filtered = useMemo(() => {
        const q = filters.q.trim().toLowerCase();
        const fields = keys ? keys.split("|") : [];
        return sorted.filter((r) =>
            (!filters.disease || r.disease === filters.disease) &&
            (!filters.status || r.status === filters.status) &&
            (!q || fields.some((k) => String(r[k] ?? "").toLowerCase().includes(q)))
        );
    }, [sorted, filters, keys]);

    const update = (patch) => setFilters((f) => ({ ...f, ...patch }));
    const reset = () => setFilters(EMPTY);
    const active = Boolean(filters.q || filters.disease || filters.status);

    return { filters, update, reset, active, filtered, diseases, statuses };
}