import { useState } from "react";
import { Download } from "lucide-react";
import Button from "./Button";
import { downloadResultPdf } from "../../api/pdfReportApi";

/** Downloads the PDF report for one saved prediction. */
export default function DownloadReportButton({ component, resultId, full = false }) {
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState("");

    if (!resultId) return null;

    async function onClick() {
        setErr(""); setBusy(true);
        try {
            await downloadResultPdf(component, resultId);
        } catch (e) {
            setErr(e.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div>
            <Button variant="secondary" onClick={onClick} disabled={busy} full={full}>
                <Download size={15} /> {busy ? "Preparing PDF…" : "Download PDF Report"}
            </Button>
            {err && <div style={{ marginTop: 6, color: "#ef4444", fontSize: 12 }}>{err}</div>}
        </div>
    );
}