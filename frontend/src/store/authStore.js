import { create } from 'zustand';
import apiClient, { setAuthToken } from '../services/api';

const persistedToken = localStorage.getItem('auth_token');
if (persistedToken) {
  setAuthToken(persistedToken);
}

export const useAuthStore = create((set, get) => ({
  user: null,
  token: persistedToken || null,
  initializing: true,

  initialize: async () => {
    const token = get().token;
    if (!token) {
      set({ initializing: false });
      return;
    }
    try {
      const { data } = await apiClient.get('/auth/me');
      set({ user: data.user, initializing: false });
    } catch (error) {
      console.error('Failed to bootstrap auth', error);
      setAuthToken(null);
      localStorage.removeItem('auth_token');
      set({ user: null, token: null, initializing: false });
    }
  },

  login: async (credentials) => {
    const { data } = await apiClient.post('/auth/login', credentials);
    setAuthToken(data.token);
    localStorage.setItem('auth_token', data.token);
    set({ user: data.user, token: data.token });
    return data.user;
  },

  logout: () => {
    setAuthToken(null);
    localStorage.removeItem('auth_token');
    set({ user: null, token: null });
  },
}));

