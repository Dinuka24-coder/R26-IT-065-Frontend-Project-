import { useRef, useState } from "react";
import { Upload, X, Loader, FileStack } from "lucide-react";
import { useTheme } from "../../../context/ThemeContext";
import Button from "../../../components/ui/Button";
import { inspectDicom } from "./component4DicomApi";

// Component-4-specific multi-file DICOM (.dcm) selector. Deliberately
// SEPARATE from the shared ScanUploader, which only supports a single
// image/* file (confirmed from its real source - accept="image/*",
// f.type.startsWith("image/") validation, single-file <input>) and
// must remain unmodified since other components depend on it.
//
// DICOM detection is extension-based, not MIME-type-based - browsers
// frequently report an empty or inconsistent MIME type for .dcm files,
// so file.type cannot be relied on here (same real reasoning as the old
// CTUploadPage.jsx).
//
// Calls inspectDicom() itself once the user confirms the selection, and
// reports the result upward via onInspected - the parent
// (LungCancerAnalysis.jsx) owns patientId and decides what happens next
// (e.g. opening the viewer), keeping this component self-contained and
// reusable on its own.
function isDicomFile(file) {
    return file.name.toLowerCase().endsWith(".dcm");
}

export default function DicomFileSelector({ onInspected, disabled }) {
    const { t } = useTheme();
    const inputRef = useRef(null);
    const [files, setFiles] = useState([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [drag, setDrag] = useState(false);

    function onFiles(fileList) {
        setError("");
        const selected = Array.from(fileList || []);
        if (selected.length === 0) return;

        const allDicom = selected.every(isDicomFile);
        if (!allDicom) {
            setError("Please select only DICOM (.dcm) files.");
            return;
        }
        setFiles(selected);
    }

    function clearFiles() {
        setFiles([]);
        setError("");
    }

    async function handleInspect() {
        if (files.length === 0 || disabled) return;
        setError("");
        setLoading(true);
        try {
            const result = await inspectDicom(files);
            onInspected(result);
        } catch (e) {
            setError(e.message || "DICOM inspection failed. Please check the backend server.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div>
            <div
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => { e.preventDefault(); setDrag(false); onFiles(e.dataTransfer.files); }}
                style={{
                    border: `1.5px dashed ${drag ? t.accent : t.border}`,
                    borderRadius: 12,
                    padding: files.length ? 16 : 40,
                    textAlign: "center",
                    color: t.dim,
                    cursor: "pointer",
                }}
            >
                {files.length === 0 ? (
                    <>
                        <Upload size={34} style={{ marginBottom: 10 }} />
                        <div style={{ fontSize: 14 }}>Drop DICOM (.dcm) files here or click to browse</div>
                        <div style={{ fontSize: 12, marginTop: 4 }}>Select all files in a series at once</div>
                    </>
                ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                        <FileStack size={20} />
                        <span style={{ color: t.text, fontWeight: 600 }}>
                            {files.length === 1 ? files[0].name : `${files.length} DICOM files selected`}
                        </span>
                        <button
                            onClick={(e) => { e.stopPropagation(); clearFiles(); }}
                            style={{
                                border: "none", background: "transparent", color: t.dim,
                                cursor: "pointer", display: "flex", alignItems: "center",
                            }}
                        >
                            <X size={16} />
                        </button>
                    </div>
                )}
                <input
                    ref={inputRef}
                    type="file"
                    accept=".dcm"
                    multiple
                    hidden
                    onChange={(e) => onFiles(e.target.files)}
                />
            </div>

            {error && <div style={{ marginTop: 10, color: "#ef4444", fontSize: 13 }}>{error}</div>}

            <Button
                onClick={handleInspect}
                disabled={files.length === 0 || disabled || loading}
                full
                style={{ marginTop: 14 }}
            >
                {loading ? (
                    <>
                        <Loader size={15} className="spin" /> Loading DICOM series…
                    </>
                ) : (
                    "Load DICOM Series"
                )}
            </Button>
        </div>
    );
}