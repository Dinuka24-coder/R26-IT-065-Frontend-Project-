// Reports API: result list (JSON) + PDF downloads / previews.
import { BASE_URL, getToken } from "./client";

function buildQuery(params = {}) {
    const q = new URLSearchParams(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "" && v !== "all")
    ).toString();
    return q ? `?${q}` : "";
}

async function request(path, params) {
    const res = await fetch(`${BASE_URL}${path}${buildQuery(params)}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (res.status === 401) {
        sessionStorage.removeItem("pulmo_token");
        sessionStorage.removeItem("pulmo_user");
        throw new Error("Session expired. Please sign in again.");
    }
    if (!res.ok) {
        let msg = `Request failed (${res.status})`;
        try {
            const body = await res.json();
            if (typeof body?.detail === "string") msg = body.detail;
        } catch { /* not JSON */ }
        throw new Error(msg);
    }
    return res;
}

async function fetchPdf(path, params) {
    const res = await request(path, params);
    const blob = await res.blob();
    const cd = res.headers.get("Content-Disposition") || "";
    const filename = (cd.match(/filename="?([^"]+)"?/) || [])[1] || "PulmoAI_report.pdf";
    return { blob, filename };
}

function saveBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// Opens the tab first (so the browser does not block the pop-up), then loads the PDF into it
async function previewPdf(path, params) {
    const win = window.open("", "_blank");
    try {
        const { blob } = await fetchPdf(path, { ...params, inline: true });
        const url = URL.createObjectURL(blob);
        if (win) win.location.href = url;
        else window.open(url, "_blank");
        setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
        win?.close();
        throw e;
    }
}

async function downloadPdf(path, params) {
    const { blob, filename } = await fetchPdf(path, params);
    saveBlob(blob, filename);
}

// ── result list for the Reports page ──
// filters: start_date, end_date, disease, status, patient_id, doctor_id, search
export async function getReportList(filters = {}) {
    const res = await request("/reports/pdf/list", filters);
    return res.json(); // { role, count, rows: [...] }
}

// ── summary / doctor / disease / patient report (same filters as above) ──
export const downloadSummaryPdf = (filters) => downloadPdf("/reports/pdf/summary", filters);
export const previewSummaryPdf = (filters) => previewPdf("/reports/pdf/summary", filters);

// ── one result (component: pneumothorax | pneumonia | tuberculosis | lungcancer) ──
export const downloadResultPdf = (component, resultId) =>
    downloadPdf(`/reports/pdf/result/${component}/${resultId}`);
export const previewResultPdf = (component, resultId) =>
    previewPdf(`/reports/pdf/result/${component}/${resultId}`);

// ── full screening (ids: { pneumothorax, pneumonia, tuberculosis, lungcancer }) ──
export const downloadScreeningPdf = (ids) => downloadPdf("/reports/pdf/screening", ids);
export const previewScreeningPdf = (ids) => previewPdf("/reports/pdf/screening", ids);