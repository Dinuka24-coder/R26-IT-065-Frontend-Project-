import { api } from "./client";

export const getHistory = (params = {}) => {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v));
  const qs = new URLSearchParams(clean).toString();
  return api.get(`/reports/history${qs ? `?${qs}` : ""}`);
};
