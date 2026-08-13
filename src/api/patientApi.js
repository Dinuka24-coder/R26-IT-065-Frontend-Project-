import { api } from "./client";

export const listPatients   = ()         => api.get("/patients");
export const searchPatients = (q)        => api.get(`/patients/search?q=${encodeURIComponent(q)}`);
export const getPatient     = (id)       => api.get(`/patients/${id}`);
export const createPatient  = (data)     => api.post("/patients", data);
export const updatePatient  = (id, data) => api.put(`/patients/${id}`, data);
export const deletePatient  = (id)       => api.del(`/patients/${id}`);
export const addNote        = (id, note) => api.post(`/patients/${id}/notes`, { note });
