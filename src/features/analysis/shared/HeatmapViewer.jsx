import { useState } from "react";
import { Eye, EyeOff, X } from "lucide-react";
import { useTheme } from "../../../context/ThemeContext";

export default function HeatmapViewer({
                                          originalPreview, heatmap, modelName, onClear, legend = true,
                                      }) {
    const { t } = useTheme();
    const [showHeat, setShowHeat] = useState(true);
    const src = showHeat && heatmap ? `data:image/png;base64,${heatmap}` : originalPreview;

    return (
        <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", background: "#000" }}>
            <img src={src} alt="Scan" style={{ width: "100%", display: "block" }} />

            {heatmap && (
                <button onClick={() => setShowHeat((s) => !s)}
                        style={{
                            position: "absolute", top: 12, left: 12,
                            display: "flex", alignItems: "center", gap: 7,
                            padding: "7px 12px", borderRadius: 8, border: "none",
                            background: showHeat ? t.accent : "rgba(0,0,0,0.65)",
                            color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer",
                            backdropFilter: "blur(4px)",
                        }}>
                    {showHeat ? <Eye size={14} /> : <EyeOff size={14} />}
                    Grad-CAM Heatmap: {showHeat ? "ON" : "OFF"}
                </button>
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

            {legend && showHeat && heatmap && (
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
                </div>
            )}
        </div>
    );
}