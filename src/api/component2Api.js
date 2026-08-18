import { api } from "./client";

// Pneumonia — CONNECTED
export async function predictPneumonia(patientId, file) {
  const formData = new FormData();
  formData.append("patient_id", patientId);
  formData.append("file", file);
  formData.append("include_explanation_image", "true");

  const data = await api.upload("/pneumonia/predict", formData);

  const confValue = typeof data.confidence === "string"
    ? parseFloat(data.confidence.replace("%", ""))
    : Number(data.confidence) || 0;

  const isPos = Boolean(
    data.diagnosis &&
    (data.diagnosis.toUpperCase().includes("PNEUMONIA") ||
     data.diagnosis.toUpperCase().includes("DETECTED"))
  );

  let urgency = "Low";
  if (data.severity === "Severe") {
    urgency = "High";
  } else if (data.severity === "Moderate") {
    urgency = "Moderate";
  }

  return {
    ...data,
    prediction: data.diagnosis || (isPos ? "Pneumonia Detected" : "Normal"),
    confidence: confValue,
    urgency,
    heatmap_base64: data.explanation_image || data.heatmap_base64 || null,
  };
}
