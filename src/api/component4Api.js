import { api } from "./client";

// Lung Cancer — PNG/JPG classification. Verified against the real
// Component 4 backend contract established through real testing:
// POST /lung-cancer/predict, multipart fields: patient_id, file.
// api.upload() (from client.js) already attaches auth headers and
// resolves BASE_URL (which includes /api/v1) - no changes needed there.
export function predictLungCancer(patientId, file) {
  const formData = new FormData();
  formData.append("patient_id", patientId);
  formData.append("file", file);
  return api.upload("/lung-cancer/predict", formData);
}