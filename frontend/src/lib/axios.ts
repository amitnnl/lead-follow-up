import axios from 'axios';

// The /api proxy is used locally, but in production we point directly to the backend
const api = axios.create({
  baseURL: import.meta.env.PROD ? '/backend/api' : '/api',
  withCredentials: true, // Crucial for PHP sessions
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Response interceptor to catch 401s globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Logic to clear user store can be dispatched here or handled in the store directly
    }
    return Promise.reject(error);
  }
);

export default api;
