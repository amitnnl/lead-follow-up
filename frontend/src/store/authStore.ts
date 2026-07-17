import { create } from 'zustand';
import api from '../lib/axios';

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  role_name?: string;
  mobile?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User) => void;
  setUser: (user: User) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: (user) => set({ user, isAuthenticated: true }),
  setUser: (user) => set({ user }),

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error(e);
    } finally {
      set({ user: null, isAuthenticated: false });
    }
  },

  checkAuth: async () => {
    try {
      set({ isLoading: true });
      const response = await api.get('/auth/me');
      if (response.data.user) {
        set({ user: response.data.user, isAuthenticated: true });
      } else {
        set({ user: null, isAuthenticated: false });
      }
    } catch (error) {
      set({ user: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  }
}));
