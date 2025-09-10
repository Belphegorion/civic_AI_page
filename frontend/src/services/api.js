import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || (process.env.REACT_APP_API_URL || 'http://localhost:5000/api');

const api = axios.create({
  baseURL: API_BASE,
  timeout: 20000
});

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('cc_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export default api;
