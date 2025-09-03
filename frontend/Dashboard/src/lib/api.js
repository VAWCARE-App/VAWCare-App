// src/lib/api.js
import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const saveToken = (t) => localStorage.setItem("token", t);
export const clearToken = () => localStorage.removeItem("token");
export const isAuthed   = () => !!localStorage.getItem("token");
