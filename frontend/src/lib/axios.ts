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
      // Automatically log out user if session expires
      const authStore = (window as any).useAuthStore?.getState?.();
      if (authStore) {
          authStore.setUser(null);
      }
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
