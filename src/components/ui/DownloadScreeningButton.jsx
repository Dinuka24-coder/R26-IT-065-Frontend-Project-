import { useState } from "react";
import { Download } from "lucide-react";
import Button from "./Button";
import { downloadScreeningPdf } from "../../api/pdfReportApi";

/** Downloads one combined PDF for a Full Screening. ids = { pneumothorax, pneumonia, tuberculosis, lungcancer } */
export default function DownloadScreeningButton({ ids, full = false }) {
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState("");

    const cleanIds = Object.fromEntries(Object.entries(ids || {}).filter(([, v]) => v));
    if (Object.keys(cleanIds).length === 0) return null;

    async function onClick() {
        setErr(""); setBusy(true);
        try {
            await downloadScreeningPdf(cleanIds);
        } catch (e) {
            setErr(e.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div>
            <Button variant="secondary" onClick={onClick} disabled={busy} full={full}>
                <Download size={15} /> {busy ? "Preparing PDF…" : "Download Full Screening Report"}
            </Button>
            {err && <div style={{ marginTop: 6, color: "#ef4444", fontSize: 12 }}>{err}</div>}
        </div>
    );
}