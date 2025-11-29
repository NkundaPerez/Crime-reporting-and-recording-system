
// src/services/api.js
import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api', // ← Backend base URL
});

// ───── Add JWT to every request ─────
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ───── Optional: Global error handler (dev only) ─────
if (process.env.NODE_ENV === 'development') {
  API.interceptors.response.use(
    (res) => res,
    (err) => {
      console.error('API Error:', err.response?.data || err.message);
      return Promise.reject(err);
    }
  );
}

export default API;