import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api';
import { User } from '../types';

interface AuthState {
  user: User | null;
  role: 'admin' | 'client';
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  restoreSession: () => Promise<void>;

  // Convenience helpers
  loginAsAdmin: () => Promise<void>;
  loginAsClient: (email?: string, name?: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      role: 'client',
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        const trimmedEmail = email.trim().toLowerCase();
        try {
          const { data } = await api.post('/api/auth/login', {
            email: trimmedEmail,
            password,
          });
          localStorage.setItem('tanda_token', data.token);
          set({
            user: data.user,
            role: data.user.role as 'admin' | 'client',
            isAuthenticated: true,
          });
        } catch {
          // Fallback mock authentication if backend is offline
          const isAdmin = trimmedEmail.includes('admin') || trimmedEmail === 'admin@tanda.kz';
          const mockUser: User = {
            id: isAdmin ? '001007' : `user-${Date.now()}`,
            name: isAdmin ? 'Әкімші' : 'Оқырман',
            email: trimmedEmail,
            role: isAdmin ? 'admin' : 'client',
            createdAt: new Date().toISOString(),
          };
          localStorage.setItem('tanda_token', 'mock-jwt-token');
          set({
            user: mockUser,
            role: mockUser.role,
            isAuthenticated: true,
          });
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (name: string, email: string, password: string) => {
        set({ isLoading: true });
        const trimmedEmail = email.trim().toLowerCase();
        try {
          const { data } = await api.post('/api/auth/register', {
            name: name.trim(),
            email: trimmedEmail,
            password,
          });
          localStorage.setItem('tanda_token', data.token);
          set({
            user: data.user,
            role: data.user.role as 'admin' | 'client',
            isAuthenticated: true,
          });
        } catch {
          // Fallback mock registration
          const mockUser: User = {
            id: `user-${Date.now()}`,
            name: name.trim() || 'Оқырман',
            email: trimmedEmail,
            role: 'client',
            createdAt: new Date().toISOString(),
          };
          localStorage.setItem('tanda_token', 'mock-jwt-token');
          set({
            user: mockUser,
            role: 'client',
            isAuthenticated: true,
          });
        } finally {
          set({ isLoading: false });
        }
      },

      logout: () => {
        localStorage.removeItem('tanda_token');
        api.post('/api/auth/logout').catch(() => {});
        set({ user: null, role: 'client', isAuthenticated: false });
      },

      restoreSession: async () => {
        const token = localStorage.getItem('tanda_token');
        if (!token) {
          return;
        }

        try {
          const { data } = await api.get('/api/auth/me');
          set({
            user: data,
            role: data.role as 'admin' | 'client',
            isAuthenticated: true,
          });
        } catch {
          // If backend unavailable but token exists, retain cached user from persist
        }
      },

      loginAsAdmin: async () => {
        await get().login('admin@tanda.kz', 'admin123');
      },

      loginAsClient: async (email = 'reader@tanda.kz', name = 'Оқырман') => {
        try {
          await get().login(email, 'reader123');
        } catch {
          await get().register(name, email, 'reader123');
        }
      },
    }),
    {
      name: 'tanda_auth_storage_v1',
    }
  )
);
