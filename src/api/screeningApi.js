import { api } from "./client";

export function runFullScreening(patientId, file) {
    const formData = new FormData();
    formData.append("patient_id", patientId);
    formData.append("file", file);
    return api.upload("/screening/full", formData);
}