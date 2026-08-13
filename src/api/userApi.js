import { api } from "./client";

export const getMe        = ()         => api.get("/users/me");
export const listDoctors  = ()         => api.get("/users/doctors");
export const createDoctor = (data)     => api.post("/users/doctors", data);
export const updateDoctor = (id, data) => api.put(`/users/doctors/${id}`, data);
export const deleteDoctor = (id)       => api.del(`/users/doctors/${id}`);
