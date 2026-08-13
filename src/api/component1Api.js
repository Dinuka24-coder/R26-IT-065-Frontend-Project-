import { api } from "./client";

// Pneumothorax — CONNECTED
export function predictPneumothorax(patientId, file) {
  const formData = new FormData();
  formData.append("patient_id", patientId);
  formData.append("file", file);
  return api.upload("/pneumothorax/pneumothorax/predict", formData);
}
