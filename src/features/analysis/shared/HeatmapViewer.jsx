import { useState } from "react";
import { EyeOff, Layers, Flame, X } from "lucide-react";
import { useTheme } from "../../../context/ThemeContext";

export default function HeatmapViewer({
                                          originalPreview, heatmap, standardHeatmap, modelName, onClear, legend = true,
                                      }) {
    const { t } = useTheme();
    const [mode, setMode] = useState("boundary");   // boundary | standard | original

    const views = [
        { id: "boundary", label: "Boundary-Aware", icon: Layers,  available: Boolean(heatmap) },
        { id: "standard", label: "Standard",       icon: Flame,   available: Boolean(standardHeatmap) },
        { id: "original", label: "Original",       icon: EyeOff,  available: Boolean(originalPreview) },
    ].filter(v => v.available);

    const src = mode === "boundary" ? `data:image/png;base64,${heatmap}`
        : mode === "standard" ? `data:image/png;base64,${standardHeatmap}`
            : originalPreview;

    const showLegend = legend && mode !== "original";

    return (
        <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", background: "#000" }}>
            <img src={src} alt="Scan" style={{ width: "100%", display: "block" }} />

            {/* View switcher */}
            {views.length > 1 && (
                <div style={{
                    position: "absolute", top: 12, left: 12,
                    display: "flex", gap: 4, padding: 4, borderRadius: 10,
                    background: "rgba(0,0,0,0.62)", backdropFilter: "blur(6px)",
                }}>
                    {views.map((v) => (
                        <button key={v.id} onClick={() => setMode(v.id)}
                                style={{
                                    display: "flex", alignItems: "center", gap: 6,
                                    padding: "6px 11px", borderRadius: 7, border: "none",
                                    background: mode === v.id ? t.accent : "transparent",
                                    color: mode === v.id ? "#fff" : "#cbd5e1",
                                    fontSize: 11.5, fontWeight: 600, cursor: "pointer",
                                    transition: "background 0.15s",
                                }}>
                            <v.icon size={13} /> {v.label}
                        </button>
                    ))}
                </div>
            )}

            {onClear && (
                <button onClick={onClear}
                        style={{
                            position: "absolute", top: 12, right: 12, width: 28, height: 28,
                            borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.65)",
                            color: "#fff", cursor: "pointer", display: "grid", placeItems: "center",
                        }}>
                    <X size={14} />
                </button>
            )}


            {modelName && (
                <div style={{
                    position: "absolute", bottom: 12, left: 12,
                    display: "flex", alignItems: "center", gap: 7,
                    padding: "6px 11px", borderRadius: 7,
                    background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)",
                    fontSize: 11, fontFamily: "monospace", color: "#e8edf5",
                }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#3b82f6" }} />
                    {modelName}
                </div>
            )}

            {showLegend && (
                <div style={{
                    position: "absolute", bottom: 12, right: 12,
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "6px 11px", borderRadius: 7,
                    background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)",
                    fontSize: 11, color: "#e8edf5",
                }}>
                    {[["#2563eb", "Low"], ["#22c55e", "Med"], ["#f59e0b", "High"], ["#ef4444", "Max"]]
                        .map(([c, l]) => (
                            <span key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <span style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
                                {l}
                            </span>
                        ))}
                    {mode === "boundary" && (
                        <span style={{ display: "flex", alignItems: "center", gap: 4,
                            paddingLeft: 8, borderLeft: "1px solid rgba(255,255,255,0.2)" }}>
                            <span style={{ width: 8, height: 8, borderRadius: 2, background: "#00ffff" }} />
                            Boundary
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}