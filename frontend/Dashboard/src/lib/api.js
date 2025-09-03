// src/lib/api.js
import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const saveToken = (t) => localStorage.setItem("token", t);
export const clearToken = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("userType");
};
export const isAuthed = () => !!localStorage.getItem("token");
export const getUserType = () => localStorage.getItem("userType") || 'victim';

// Add an axios response interceptor to handle unauthorized responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearToken();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
