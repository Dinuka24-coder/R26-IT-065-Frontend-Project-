import { api } from "./client";

export const getOverview = () => api.get("/dashboard/overview");

// Kept if you need them individually
export const getStats        = () => api.get("/dashboard/stats");
export const getWeeklyVolume = () => api.get("/dashboard/weekly-volume");
export const getDistribution = () => api.get("/dashboard/disease-distribution");