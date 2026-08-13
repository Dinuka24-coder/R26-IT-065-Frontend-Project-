export const COMPONENTS = [
  { id: "pneumothorax", label: "Pneumothorax", scan: "X-ray",   accent: "#ef4444", route: "analysis-pneumothorax" },
  { id: "pneumonia",    label: "Pneumonia",    scan: "X-ray",   accent: "#3b82f6", route: "analysis-pneumonia" },
  { id: "tuberculosis", label: "Tuberculosis", scan: "X-ray",   accent: "#f59e0b", route: "analysis-tuberculosis" },
  { id: "lungcancer",   label: "Lung Cancer",  scan: "CT Scan", accent: "#8b5cf6", route: "analysis-lungcancer" },
];

export const URGENCY_COLORS = {
  High: "#ef4444", Moderate: "#f59e0b", Low: "#22c55e",
};
