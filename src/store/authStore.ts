import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import api from '../lib/api';

interface User {
  username: string;
  role?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      login: async (username, password) => {
        // New backend path: api/auth/login/
        const { data } = await api.post('/auth/login/', { username, password });

        localStorage.setItem('access_token', data.access);
        localStorage.setItem('refresh_token', data.refresh);

        const user = { username }; // Em produção, pegar do backend ou decodificar JWT
        set({ user, isAuthenticated: true });
      },

      logout: () => {
        localStorage.clear();
        set({ user: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
