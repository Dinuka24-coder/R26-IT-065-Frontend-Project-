import { api } from "./client";

// Pneumonia — TODO: verify endpoint path with your backend
export function predictPneumonia(patientId, file) {
  const formData = new FormData();
  formData.append("patient_id", patientId);
  formData.append("file", file);
  return api.upload("/pneumonia/predict", formData);
}
