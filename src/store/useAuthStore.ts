import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';

interface AuthState {
  user: User | null;
  role: 'admin' | 'client';
  isAuthenticated: boolean;
  loginAsAdmin: () => void;
  loginAsClient: (email?: string, name?: string) => void;
  setRole: (role: 'admin' | 'client') => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: {
        id: 'admin-1',
        name: 'Админ',
        email: 'admin@tanda.kz',
        role: 'admin',
      },
      role: 'admin',
      isAuthenticated: true,

      loginAsAdmin: () =>
        set({
          user: {
            id: 'admin-1',
            name: 'Админ',
            email: 'admin@tanda.kz',
            role: 'admin',
          },
          role: 'admin',
          isAuthenticated: true,
        }),

      loginAsClient: (email = 'reader@tanda.kz', name = 'Оқырман') =>
        set({
          user: {
            id: 'client-1',
            name,
            email,
            role: 'client',
          },
          role: 'client',
          isAuthenticated: true,
        }),

      setRole: (role) =>
        set((state) => ({
          role,
          user: state.user ? { ...state.user, role } : null,
        })),

      logout: () => set({ user: null, role: 'client', isAuthenticated: false }),
    }),
    {
      name: 'tanda_auth_storage',
    }
  )
);
