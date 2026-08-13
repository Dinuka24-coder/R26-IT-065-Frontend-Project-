import { api } from "./client";

// Lung Cancer — TODO: verify endpoint path with your backend
export function predictLungCancer(patientId, file) {
  const formData = new FormData();
  formData.append("patient_id", patientId);
  formData.append("file", file);
  return api.upload("/lung-cancer/predict", formData);
}
