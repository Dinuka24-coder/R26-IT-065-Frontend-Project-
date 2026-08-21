// Component 4 (CT) DICOM-specific API calls. Isolated from component4Api.js
// (PNG/JPG /predict flow, untouched) so DICOM-specific request/response
// shapes never leak into or risk that existing, verified code path -
// matching the SAME separation the old frontend already used.
//
// Adapted from the old R26-IT-065-Frontend's component4DicomApi.js for
// this repository's real conventions, confirmed from src/api/client.js:
//   - BASE_URL already includes /api/v1 - endpoint paths below are
//     relative to that (e.g. "/lung-cancer/dicom/inspect", NOT
//     "/api/v1/lung-cancer/dicom/inspect" as the old file had it).
//   - Real authentication (Bearer token) is required - the old file's
//     unauthenticated fetch() calls are NOT reused as-is; every request
//     here attaches the same Authorization header client.js's own
//     helpers use, via the already-exported getToken().
// Does NOT modify client.js - only imports its already-exported
// BASE_URL/getToken, since client.js's own api.* helpers don't support
// multi-file FormData, raw binary responses, or this module's specific
// object-shaped error detail (see extractErrorMessage below) - reusing
// them here without forcing shared-file changes.
import { BASE_URL, getToken } from "../../../api/client";

function authHeaders(extra = {}) {
    const token = getToken();
    return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}

/**
 * POST /dicom/inspect
 * Accepts one or more DICOM files (a single slice, or a full series).
 * Returns { series_id, number_of_slices, modality, rows, columns, ... }
 * with no PHI fields, per the verified backend contract.
 */
export async function inspectDicom(files) {
    const formData = new FormData();
    for (const file of files) {
        formData.append("files", file);
    }

    const response = await fetch(`${BASE_URL}/lung-cancer/dicom/inspect`, {
        method: "POST",
        headers: authHeaders(),
        body: formData,
    });

    if (!response.ok) {
        throw new Error(await extractErrorMessage(response, "DICOM inspection failed."));
    }

    return response.json();
}

/**
 * Builds the URL for GET /dicom/{series_id}/slice/{slice_index}.
 * This endpoint returns a rendered PNG (DICOM -> HU -> window/level ->
 * 8-bit) — the frontend never decodes DICOM pixel data itself.
 *
 * windowConfig is either { preset: "lung" | "mediastinal" | "bone" }
 * or { wc: number, ww: number } for a manual window.
 *
 * NOTE: this returns a plain URL used directly as an <img>/imageId
 * source (see cornerstoneSetup.js's loadWebImage) - it does NOT attach
 * an auth header, since it's not fetched via this module's own
 * authenticated fetch() calls. If the real backend requires auth on
 * this specific endpoint, it will need to be fetched as a blob with
 * headers instead - NOT YET VERIFIED against the real backend; flagging
 * rather than assuming either way.
 */
export function getDicomSliceUrl(seriesId, sliceIndex, windowConfig = {}) {
    const params = new URLSearchParams();
    if (windowConfig.preset) {
        params.set("preset", windowConfig.preset);
    }
    if (windowConfig.wc !== undefined && windowConfig.wc !== null) {
        params.set("wc", windowConfig.wc);
    }
    if (windowConfig.ww !== undefined && windowConfig.ww !== null) {
        params.set("ww", windowConfig.ww);
    }
    const query = params.toString();
    return `${BASE_URL}/lung-cancer/dicom/${seriesId}/slice/${sliceIndex}${query ? `?${query}` : ""}`;
}

/**
 * POST /dicom/analyze
 * Explicit, doctor-triggered analysis of exactly one selected slice with
 * exactly one window configuration. Never called automatically.
 */
export async function analyzeDicomSlice({
                                            patientId,
                                            seriesId,
                                            sliceIndex,
                                            preset,
                                            windowCenter,
                                            windowWidth,
                                        }) {
    const formData = new FormData();
    formData.append("patient_id", patientId);
    formData.append("series_id", seriesId);
    formData.append("slice_index", sliceIndex);
    if (preset) {
        formData.append("preset", preset);
    }
    if (windowCenter !== undefined && windowCenter !== null) {
        formData.append("window_center", windowCenter);
    }
    if (windowWidth !== undefined && windowWidth !== null) {
        formData.append("window_width", windowWidth);
    }

    const response = await fetch(`${BASE_URL}/lung-cancer/dicom/analyze`, {
        method: "POST",
        headers: authHeaders(),
        body: formData,
    });

    if (!response.ok) {
        throw new Error(await extractErrorMessage(response, "DICOM analysis failed."));
    }

    return response.json();
}

/**
 * GET /dicom/{series_id}/acquisitions
 * Lists every candidate acquisition within a series - factual data
 * only (acquisition_number, slice_count, acquisition_time, valid,
 * rejection_reason), plus a classification summary. Never includes
 * clinical labels.
 */
export async function getDicomVolumeAcquisitions(seriesId) {
    const response = await fetch(`${BASE_URL}/lung-cancer/dicom/${seriesId}/acquisitions`, {
        headers: authHeaders(),
    });

    if (!response.ok) {
        throw new Error(await extractErrorMessage(response, "Failed to load acquisitions."));
    }

    return response.json();
}

/**
 * GET /dicom/{series_id}/volume/metadata
 * Small JSON geometry payload - shape, dtype, pixel_spacing,
 * inter_slice_spacing, orientation, origin, ordering_method,
 * slice_direction. Never voxel data.
 *
 * acquisitionNumber is OPTIONAL - a single-acquisition series works
 * with no parameter. A genuinely multi-acquisition series requires it
 * explicitly (400 otherwise, never silently guessed by the backend).
 */
export async function getDicomVolumeMetadata(seriesId, acquisitionNumber) {
    const params = new URLSearchParams();
    if (acquisitionNumber !== undefined && acquisitionNumber !== null) {
        params.set("acquisition_number", acquisitionNumber);
    }
    const query = params.toString();
    const response = await fetch(
        `${BASE_URL}/lung-cancer/dicom/${seriesId}/volume/metadata${query ? `?${query}` : ""}`,
        { headers: authHeaders() }
    );

    if (!response.ok) {
        throw new Error(await extractErrorMessage(response, "Failed to load volume metadata."));
    }

    return response.json();
}

/**
 * GET /dicom/{series_id}/volume/data
 * Raw Int16 binary volume as an ArrayBuffer (application/octet-stream,
 * byte length = shape[0]*shape[1]*shape[2]*2). Wrapped directly in
 * `new Int16Array(arrayBuffer)` by the caller - never JSON, never
 * base64.
 */
export async function getDicomVolumeData(seriesId, acquisitionNumber) {
    const params = new URLSearchParams();
    if (acquisitionNumber !== undefined && acquisitionNumber !== null) {
        params.set("acquisition_number", acquisitionNumber);
    }
    const query = params.toString();
    const response = await fetch(
        `${BASE_URL}/lung-cancer/dicom/${seriesId}/volume/data${query ? `?${query}` : ""}`,
        { headers: authHeaders() }
    );

    if (!response.ok) {
        throw new Error(await extractErrorMessage(response, "Failed to load volume data."));
    }

    return response.arrayBuffer();
}

/**
 * Handles both real detail shapes the backend can return:
 *   - a plain string (most errors)
 *   - { message, acquisitions } (the "multiple acquisitions, none
 *     selected" 400 case - MultipleAcquisitionsError) - without this
 *     explicit check, the object would stringify as "[object Object]"
 *     rather than showing the real message, confirmed by testing the
 *     old string-only logic against this exact real response shape.
 */
async function extractErrorMessage(response, fallback) {
    try {
        const errorData = await response.json();
        if (errorData.detail && typeof errorData.detail === "object") {
            return errorData.detail.message || fallback;
        }
        return errorData.detail || fallback;
    } catch {
        return response.statusText || fallback;
    }
}