import { useRef } from "react";
import { ScanLine, X } from "lucide-react";
import { useTheme } from "../../../context/ThemeContext";

export default function ScanUploader({ preview, onFile, onClear, accept = "image/*", hint = "PNG · JPG · JPEG" }) {
  const { t } = useTheme();
  const inputRef = useRef();

  return (
    <div onClick={() => inputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files[0]); }}
      style={{ border: `1.5px dashed ${t.border}`, borderRadius: 12, padding: preview ? 10 : 40, textAlign: "center", color: t.dim, cursor: "pointer" }}>
      {preview ? (
        <div style={{ position: "relative" }}>
          <img src={preview} alt="Scan preview" style={{ width: "100%", borderRadius: 8, display: "block" }} />
          <button onClick={(e) => { e.stopPropagation(); onClear(); }}
            style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.6)", color: "#fff", cursor: "pointer", display: "grid", placeItems: "center" }}>
            <X size={14} />
          </button>
        </div>
      ) : (
        <>
          <ScanLine size={34} style={{ marginBottom: 10 }} />
          <div style={{ fontSize: 14 }}>Drop scan here or click to browse</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>{hint}</div>
        </>
      )}
      <input ref={inputRef} type="file" accept={accept} hidden onChange={(e) => onFile(e.target.files[0])} />
    </div>
  );
}
