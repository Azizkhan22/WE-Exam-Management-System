import { create } from 'zustand';
import apiClient, { setAuthToken } from '../services/api';

const persistedToken = localStorage.getItem('weems_token');
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
      localStorage.removeItem('weems_token');
      set({ user: null, token: null, initializing: false });
    }
  },

  login: async (credentials) => {
    const { data } = await apiClient.post('/auth/login', credentials);
    setAuthToken(data.token);
    localStorage.setItem('weems_token', data.token);
    set({ user: data.user, token: data.token });
    return data.user;
  },

  registerStudent: async (payload) => {
    const { data } = await apiClient.post('/auth/register', payload);
    setAuthToken(data.token);
    localStorage.setItem('weems_token', data.token);
    set({ user: data.user, token: data.token });
    return data.user;
  },

  logout: () => {
    setAuthToken(null);
    localStorage.removeItem('weems_token');
    set({ user: null, token: null });
  },
}));

