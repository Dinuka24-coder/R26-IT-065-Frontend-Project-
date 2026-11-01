import { useEffect, useMemo, useRef, useState } from "react";
import { Search, UserPlus, X } from "lucide-react";
import { useTheme } from "../../../context/ThemeContext";
import { listPatients } from "../../../api/patientApi";
import Button from "../../../components/ui/Button";

const MAX_RESULTS = 8;
const SEARCH_FIELDS = ["full_name", "nic", "contact_number"];

function initials(name = "") {
    return name.replace(/^dr\.?\s+/i, "").split(/\s+/).filter(Boolean).slice(0, 2)
        .map((w) => w[0].toUpperCase()).join("") || "?";
}

function details(p) {
    return [p.nic && `NIC ${p.nic}`, p.age && `${p.age} yrs`, p.gender].filter(Boolean).join(" · ");
}

/**
 * Searchable patient picker used by every analysis page.
 * Same props as before: value (patient id), onChange(id), navigate.
 */
export default function PatientSelector({ value, onChange, navigate }) {
    const { t } = useTheme();
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const boxRef = useRef(null);
    const inputRef = useRef(null);

    // Load the patient list once
    useEffect(() => {
        let alive = true;
        listPatients()
            .then((list) => alive && setPatients(Array.isArray(list) ? list : list?.patients || []))
            .catch((e) => alive && setLoadError(e?.message || "Could not load patients."))
            .finally(() => alive && setLoading(false));
        return () => { alive = false; };
    }, []);

    // Close the list when clicking outside
    useEffect(() => {
        function onDocClick(e) {
            if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
        }
        document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, []);

    const selected = patients.find((p) => String(p.id) === String(value));

    const matches = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return patients;
        return patients.filter((p) =>
            SEARCH_FIELDS.some((k) => String(p[k] ?? "").toLowerCase().includes(q))
        );
    }, [patients, query]);
    const shown = matches.slice(0, MAX_RESULTS);

    function pick(p) {
        onChange(p.id);
        setQuery("");
        setOpen(false);
    }

    function change() {
        onChange("");
        setQuery("");
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
    }

    function onKeyDown(e) {
        if (e.key === "ArrowDown") {
            e.preventDefault(); setOpen(true);
            setActive((i) => Math.min(i + 1, shown.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
        } else if (e.key === "Enter" && open && shown[active]) {
            e.preventDefault(); pick(shown[active]);
        } else if (e.key === "Escape") {
            setOpen(false);
        }
    }

    const surface = t.card || t.bg;

    return (
        <div ref={boxRef}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Patient</div>

            {value ? (
                /* ── Selected patient ── */
                <div style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                    borderRadius: 10, border: `1px solid ${t.accent}`, background: t.accentSoft,
                }}>
          <span style={{
              width: 38, height: 38, borderRadius: "50%", flexShrink: 0, display: "grid", placeItems: "center",
              background: t.accent, color: "#fff", fontWeight: 700, fontSize: 13,
          }}>
            {selected ? initials(selected.full_name) : "?"}
          </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {selected ? selected.full_name : loading ? "Loading patient…" : `Patient ID: ${value}`}
                        </div>
                        {selected && (
                            <div style={{ fontSize: 12, color: t.dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {details(selected)}
                            </div>
                        )}
                    </div>
                    <button type="button" onClick={change} title="Choose a different patient"
                            style={{
                                display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 10px",
                                borderRadius: 8, border: `1px solid ${t.border}`, background: surface,
                                color: t.text, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                            }}>
                        <X size={13} /> Change
                    </button>
                </div>
            ) : (
                /* ── Search box + results ── */
                <div style={{ position: "relative" }}>
                    <Search size={16} color={t.dim}
                            style={{ position: "absolute", left: 12, top: 13, pointerEvents: "none" }} />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        disabled={loading}
                        onChange={(e) => { setQuery(e.target.value); setActive(0); setOpen(true); }}
                        onFocus={() => setOpen(true)}
                        onKeyDown={onKeyDown}
                        placeholder={loading ? "Loading patients…" : "Search patient by name, NIC or contact…"}
                        role="combobox"
                        aria-expanded={open}
                        aria-autocomplete="list"
                        style={{
                            width: "100%", height: 42, padding: "0 12px 0 38px", borderRadius: 10, boxSizing: "border-box",
                            border: `1px solid ${open ? t.accent : t.border}`, background: surface, color: t.text,
                            fontSize: 14, fontFamily: "inherit", outline: "none",
                        }}
                    />

                    {open && !loading && (
                        <div role="listbox" style={{
                            position: "absolute", top: 48, left: 0, right: 0, zIndex: 40,
                            background: surface, border: `1px solid ${t.border}`, borderRadius: 10,
                            boxShadow: "0 12px 32px rgba(0,0,0,0.25)", maxHeight: 320, overflowY: "auto",
                        }}>
                            {loadError && (
                                <div style={{ padding: 14, fontSize: 13, color: "#ef4444" }}>{loadError}</div>
                            )}

                            {!loadError && shown.length === 0 && (
                                <div style={{ padding: 14, fontSize: 13, color: t.dim }}>
                                    {patients.length === 0 ? "No patients registered yet." : `No patients match "${query.trim()}".`}
                                </div>
                            )}

                            {shown.map((p, i) => (
                                <button
                                    key={p.id}
                                    type="button"
                                    role="option"
                                    aria-selected={i === active}
                                    onMouseEnter={() => setActive(i)}
                                    onClick={() => pick(p)}
                                    style={{
                                        width: "100%", display: "flex", alignItems: "center", gap: 10, textAlign: "left",
                                        padding: "10px 12px", border: 0, cursor: "pointer", fontFamily: "inherit",
                                        borderBottom: i < shown.length - 1 ? `1px solid ${t.border}` : "none",
                                        background: i === active ? t.accentSoft : "transparent", color: t.text,
                                    }}
                                >
                  <span style={{
                      width: 32, height: 32, borderRadius: "50%", flexShrink: 0, display: "grid", placeItems: "center",
                      background: t.accentSoft, color: t.accent, fontWeight: 700, fontSize: 12,
                  }}>
                    {initials(p.full_name)}
                  </span>
                                    <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontWeight: 600, fontSize: 14 }}>{p.full_name}</span>
                    <span style={{ display: "block", fontSize: 12, color: t.dim }}>{details(p)}</span>
                  </span>
                                </button>
                            ))}

                            {matches.length > MAX_RESULTS && (
                                <div style={{ padding: "8px 12px", fontSize: 12, color: t.dim, borderTop: `1px solid ${t.border}` }}>
                                    Showing {MAX_RESULTS} of {matches.length}. Keep typing to narrow down.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ── Register shortcut ── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, color: t.dim }}>Patient not registered yet?</span>
                <Button variant="secondary" onClick={() => navigate("patients-register")}>
                    <UserPlus size={15} /> Register Patient
                </Button>
            </div>
        </div>
    );
}