import axios from "axios";

// baseURL is intentionally empty — Vite proxy forwards /api/* to the target defined in vite.config.js
const api = axios.create({
  baseURL: "",
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// Products
export const getProducts      = (params)        => api.get("/api/products", { params });
export const getProduct       = (id)            => api.get(`/api/products/${id}`);
export const createProduct    = (data)          => api.post("/api/products", data);
export const updateProduct    = (id, data)      => api.patch(`/api/products/${id}`, data);
export const updateStock      = (id, stock)     => api.patch(`/api/products/${id}/stock`, { stock });
export const getPriceHistory  = (id)            => api.get(`/api/products/${id}/price-history`);
export const triggerAdvise    = (id, reason)    => api.post(`/api/products/${id}/advise`, { triggerReason: reason });
export const simulateSale     = (id, qty = 1)   => api.post(`/api/products/${id}/orders`, { quantity: qty });

// Suggestions
export const getSuggestions     = (params) => api.get("/api/suggestions", { params });
export const getSuggestion      = (id)     => api.get(`/api/suggestions/${id}`);
export const acceptSuggestion   = (id, type) => type === "PRICING" 
  ? api.patch(`/api/pricing-suggestions/${id}`, { status: "ACCEPTED" })
  : api.patch(`/api/reorder-suggestions/${id}`, { status: "ACCEPTED" });
export const rejectSuggestion   = (id, type) => type === "PRICING"
  ? api.patch(`/api/pricing-suggestions/${id}`, { status: "REJECTED" })
  : api.patch(`/api/reorder-suggestions/${id}`, { status: "REJECTED" });
export const getSuggestionStats = ()       => api.get("/api/suggestions/stats/summary");

// Chat
export const askQuestion       = (question)   => api.post("/api/chat/query", { question });

// Health
export const getHealth = () => api.get("/health");

export default api;
