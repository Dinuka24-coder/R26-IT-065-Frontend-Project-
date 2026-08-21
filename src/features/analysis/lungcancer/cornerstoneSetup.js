// Cornerstone3D setup, scoped entirely to Component 4's DICOM viewer.
//
// IMPORTANT: this file does NOT parse DICOM or perform HU/windowing math
// for the FETCH itself. The backend's verified
// /dicom/{series_id}/slice/{slice_index} endpoint still does all DICOM
// decoding and HU conversion. What changed here: instead of fetching one
// backend-windowed PNG per (slice, window) combination, we fetch ONE wide
// reference-windowed PNG per slice (see REFERENCE_WC/REFERENCE_WW below),
// and let Cornerstone3D apply live, interactive window/level on top of
// that single image using its own built-in, standard VOI LUT pipeline
// (the same mechanism real DICOM viewers use) - this is what makes
// dragging the WC/WW sliders instant with zero network requests.
//
// "Analyze Current Slice" is unaffected by this: it calls a separate
// backend endpoint with the doctor's exact chosen WC/WW and gets back a
// fresh, full-precision render for the model - the AI model's actual
// input is never the wide-reference image used for interactive display.
//
// @cornerstonejs/dicom-image-loader and dicom-parser are deliberately NOT
// used here: those exist to decode raw DICOM bytes client-side, which
// would duplicate work the backend already does and already has verified.

import {
    init as csRenderInit,
    imageLoader,
    metaData,
    setUseCPURendering,
    utilities,
    cache,
    volumeLoader,
} from "@cornerstonejs/core";
import { init as csToolsInit } from "@cornerstonejs/tools";
import { getToken } from "../../../api/client";

const WEB_IMAGE_SCHEME = "web";

let initialized = false;

/**
 * The single wide window used for the ONE backend fetch per slice.
 * Chosen to comfortably contain all three presets (Lung: -600/1500,
 * Mediastinal: 50/350, Bone: 400/1800) plus the manual slider's full
 * range, with margin so dragging near the slider limits doesn't hit the
 * exact edge of what the reference image contains.
 */
export const REFERENCE_WC = 0;
export const REFERENCE_WW = 3200;

/**
 * Prefixes a backend slice URL with the "web:" scheme so Cornerstone
 * routes it to loadWebImage() below instead of expecting DICOM bytes.
 */
export function toWebImageId(url) {
    return `${WEB_IMAGE_SCHEME}:${url}`;
}

function fromWebImageId(imageId) {
    return imageId.slice(WEB_IMAGE_SCHEME.length + 1);
}

const REFERENCE_SLOPE = REFERENCE_WW / 255;
const REFERENCE_INTERCEPT = REFERENCE_WC - REFERENCE_WW / 2;

/**
 * Fetches the wide-reference-windowed PNG and decodes it into the shape
 * Cornerstone3D's IImage interface requires, using a canvas for pixel
 * extraction.
 *
 * Fetches WITH the Authorization header - unlike the old frontend's
 * unauthenticated version. Whether the real backend actually enforces
 * auth on this specific route is unverified (see implementation notes),
 * but attaching it is the safe choice regardless of which way that
 * resolves, and matches the rest of this repository's authenticated
 * request convention.
 */
function loadWebImage(imageId) {
    const url = fromWebImageId(imageId);

    const promise = (async () => {
        const token = getToken();
        const response = await fetch(url, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!response.ok) {
            throw new Error(`Failed to load slice image (${response.status}).`);
        }
        const blob = await response.blob();
        const bitmap = await createImageBitmap(blob);

        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(bitmap, 0, 0);

        const { data } = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
        const pixelCount = bitmap.width * bitmap.height;
        const scalarData = new Uint8Array(pixelCount);
        for (let i = 0; i < pixelCount; i++) {
            scalarData[i] = data[i * 4];
        }

        const voxelManager = utilities.VoxelManager.createImageVoxelManager({
            width: bitmap.width,
            height: bitmap.height,
            scalarData,
            numberOfComponents: 1,
        });

        /** @type {import('@cornerstonejs/core').Types.IImage} */
        const image = {
            imageId,
            minPixelValue: 0,
            maxPixelValue: 255,
            slope: REFERENCE_SLOPE,
            intercept: REFERENCE_INTERCEPT,
            windowCenter: -600,
            windowWidth: 1500,
            voiLUTFunction: "LINEAR",
            getPixelData: () => scalarData,
            getCanvas: () => canvas,
            rows: bitmap.height,
            columns: bitmap.width,
            height: bitmap.height,
            width: bitmap.width,
            color: false,
            rgba: false,
            numberOfComponents: 1,
            columnPixelSpacing: 1,
            rowPixelSpacing: 1,
            invert: false,
            sizeInBytes: scalarData.byteLength,
            dataType: "Uint8Array",
            voxelManager,
        };

        return image;
    })();

    return { promise };
}

export function setDisplayWindow(viewport, windowCenter, windowWidth) {
    const lower = windowCenter - windowWidth / 2;
    const upper = windowCenter + windowWidth / 2;
    viewport.setProperties({ voiRange: { lower, upper } });
}

const seriesMetadataCache = new Map();

export function registerSeriesMetadata(seriesId, { modality, rowPixelSpacing, columnPixelSpacing } = {}) {
    seriesMetadataCache.set(seriesId, { modality, rowPixelSpacing, columnPixelSpacing });
}

function seriesIdFromImageId(imageId) {
    const match = imageId.match(/\/dicom\/([^/]+)\/slice\//);
    return match ? match[1] : null;
}

export function ensureCornerstoneInitialized() {
    if (initialized) {
        return;
    }

    csRenderInit();
    csToolsInit();
    imageLoader.registerImageLoader(WEB_IMAGE_SCHEME, loadWebImage);

    metaData.addProvider((type, imageId) => {
        if (!imageId.startsWith(`${WEB_IMAGE_SCHEME}:`)) {
            return undefined;
        }

        if (type === "imagePixelModule") {
            return {
                photometricInterpretation: "MONOCHROME2",
                samplesPerPixel: 1,
                bitsAllocated: 8,
                bitsStored: 8,
                highBit: 7,
                pixelRepresentation: 0,
            };
        }

        const seriesId = seriesIdFromImageId(imageId);
        const seriesMeta = seriesId ? seriesMetadataCache.get(seriesId) : undefined;

        if (type === "generalSeriesModule") {
            return { modality: seriesMeta?.modality };
        }

        if (type === "imagePlaneModule") {
            const plane = {};
            if (seriesMeta?.rowPixelSpacing) plane.rowPixelSpacing = seriesMeta.rowPixelSpacing;
            if (seriesMeta?.columnPixelSpacing) plane.columnPixelSpacing = seriesMeta.columnPixelSpacing;
            return plane;
        }

        return undefined;
    }, 10000);

    initialized = true;
}

function cross3(a, b) {
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ];
}

export function computeCornerstoneVolumeGeometry(metadata) {
    const [numSlices, rows, columns] = metadata.shape;

    const dimensions = [columns, rows, numSlices];

    const [rowSpacing, columnSpacing] = metadata.pixel_spacing;
    const spacing = [columnSpacing, rowSpacing, metadata.inter_slice_spacing];

    const origin = metadata.origin;

    const rowCosines = metadata.orientation.slice(0, 3);
    const columnCosines = metadata.orientation.slice(3, 6);
    const sliceNormal = cross3(rowCosines, columnCosines).map(
        (v) => v * metadata.slice_direction
    );
    const direction = [...rowCosines, ...columnCosines, ...sliceNormal];

    return { dimensions, spacing, origin, direction };
}

export function createVolumeFromBackendData(seriesId, metadata, int16Array) {
    const geometry = computeCornerstoneVolumeGeometry(metadata);

    const expectedVoxelCount = metadata.shape[0] * metadata.shape[1] * metadata.shape[2];
    if (int16Array.length !== expectedVoxelCount) {
        throw new Error(
            `Voxel count mismatch: received ${int16Array.length}, expected ` +
            `${expectedVoxelCount} from shape ${JSON.stringify(metadata.shape)}.`
        );
    }

    const volumeId = `cs3dvolume-${seriesId}`;

    const volume = volumeLoader.createLocalVolume(volumeId, {
        metadata: {
            Modality: "CT",
        },
        dimensions: geometry.dimensions,
        spacing: geometry.spacing,
        origin: geometry.origin,
        direction: geometry.direction,
        scalarData: int16Array,
        targetBuffer: { type: "Int16Array" },
    });

    return { volumeId, volume };
}

export function removeVolumeFromCache(volumeId) {
    if (!volumeId) return;
    try {
        cache.removeVolumeLoadObject(volumeId);
    } catch {
        // Best-effort cleanup only.
    }
}

export function ensureCPUModeForStackViewer() {
    setUseCPURendering(true);
}

export function ensureGPUModeForVolumeViewer() {
    setUseCPURendering(false);
}