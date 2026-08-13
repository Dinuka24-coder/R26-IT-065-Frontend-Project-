import { api } from "./client";

// Tuberculosis — TODO: verify endpoint path with your backend
export function predictTuberculosis(patientId, file) {
  const formData = new FormData();
  formData.append("patient_id", patientId);
  formData.append("file", file);
  return api.upload("/tuberculosis/predict", formData);
}
