// Component 3 (Tuberculosis) only.
// These mirror the real backend pipeline in R26-IT-065-main:
//   app/ml_models/component3/controller.py  -> DiagnosticController.process_scan
//   app/ml_models/component3/preprocessing.py -> apply_clinical_preprocessing
// The backend returns a single response (no streaming), so the frontend replays
// these stages on estimated timings while the request is in flight.

export const TB_STAGES = [
  {
    key: "gatekeeper",
    title: "Validating chest X-ray",
    caption:
      "Gatekeeper cascade: real-data heuristic → AI vision model → CNN fallback confirm this is a genuine, usable CXR.",
  },
  {
    key: "preprocess",
    title: "Clinical preprocessing",
    caption:
      "Grayscale → bilateral denoise → CLAHE contrast equalization → unsharp mask → 224×224 normalized tensor.",
  },
  {
    key: "inference",
    title: "Multi-task diagnosis",
    caption:
      "Multi-task CNN predicts Healthy / Non-TB / Tuberculosis and regresses a lesion bounding box.",
  },
  {
    key: "explain",
    title: "Localization & Grad-CAM",
    caption:
      "If TB is predicted: dual Grad-CAM attention map + clipped bounding-box overlay. Skipped for Healthy / Non-TB.",
  },
];

// Estimated wall-clock per stage (ms). Only used to pace the simulated timeline;
// the real request settling is what actually ends it.
export const TB_STAGE_TIMINGS_MS = [1100, 1400, 2600, 1500];
