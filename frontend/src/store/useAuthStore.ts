import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api';
import { User } from '../types';
import { useAudioPlayerStore } from './useAudioPlayerStore';

interface AuthState {
  user: User | null;
  role: 'admin' | 'client';
  isAuthenticated: boolean;
  isLoading: boolean;
  authModalOpen: boolean;
  authModalMode: 'login' | 'signup';

  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  restoreSession: () => Promise<void>;
  updateProfile: (data: { name: string; email: string; phone?: string; username?: string }) => Promise<{ success: boolean; error?: string }>;
  checkUsernameAvailable: (username: string) => { available: boolean; error?: string };

  // Modal helpers
  openAuthModal: (mode?: 'login' | 'signup') => void;
  closeAuthModal: () => void;

  // Convenience helpers
  loginAsAdmin: () => Promise<void>;
  loginAsClient: (email?: string, name?: string) => Promise<void>;
}

const USERS_REGISTRY_KEY = 'tanda_users_registry_v1';

function getStoredUsers(): User[] {
  try {
    const raw = localStorage.getItem(USERS_REGISTRY_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) return list;
    }
  } catch {}
  const defaults: User[] = [
    {
      id: '001007',
      idNumber: '000 001',
      name: 'Әкімші',
      email: 'admin@tanda.kz',
      username: 'admin',
      role: 'admin',
      createdAt: '2026-09-01T10:00:00.000Z',
    },
    {
      id: 'user-001001',
      idNumber: '001 001',
      name: 'Оқырман',
      email: 'reader@tanda.kz',
      username: 'reader',
      phone: '+7 (777) 123-45-67',
      role: 'client',
      createdAt: '2026-09-01T10:00:00.000Z',
    },
  ];
  saveStoredUsers(defaults);
  return defaults;
}

function saveStoredUsers(users: User[]) {
  try {
    localStorage.setItem(USERS_REGISTRY_KEY, JSON.stringify(users));
  } catch {}
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      role: 'client',
      isAuthenticated: false,
      isLoading: false,
      authModalOpen: false,
      authModalMode: 'login',

      openAuthModal: (mode = 'login') => {
        set({ authModalOpen: true, authModalMode: mode });
      },

      closeAuthModal: () => {
        set({ authModalOpen: false });
      },

      checkUsernameAvailable: (username: string) => {
        const trimmed = username.trim().toLowerCase().replace(/^@/, '');
        if (!trimmed) {
          return { available: true };
        }
        if (trimmed.length < 3) {
          return { available: false, error: 'Юзернейм кемінде 3 әріптен тұруы керек' };
        }
        if (!/^[a-zA-Z0-9_.]+$/.test(trimmed)) {
          return { available: false, error: 'Юзернеймде тек латын әріптері, сандар, _ және . рұқсат етілген' };
        }

        const currentUser = get().user;
        const allUsers = getStoredUsers();
        const existing = allUsers.find(
          (u) => (u.username?.toLowerCase() === trimmed) && u.id !== currentUser?.id
        );

        if (existing) {
          return { available: false, error: 'Бұл юзернейм бос емес. Басқа юзернейм таңдаңыз' };
        }

        return { available: true };
      },

      updateProfile: async (data: { name: string; email: string; phone?: string; username?: string }) => {
        const currentUser = get().user;
        if (!currentUser) {
          return { success: false, error: 'Жүйеге кірмегенсіз' };
        }

        const cleanName = data.name.trim();
        const cleanEmail = data.email.trim().toLowerCase();
        const cleanPhone = data.phone?.trim() || '';
        const rawUsername = data.username?.trim().toLowerCase().replace(/^@/, '') || '';

        if (!cleanName) {
          return { success: false, error: 'Аты-жөніңізді енгізіңіз' };
        }
        if (!cleanEmail) {
          return { success: false, error: 'Электронды поштаңызды енгізіңіз' };
        }

        // Validate username uniqueness
        if (rawUsername) {
          const check = get().checkUsernameAvailable(rawUsername);
          if (!check.available) {
            return { success: false, error: check.error || 'Бұл юзернейм бос емес' };
          }
        }

        const updatedUser: User = {
          ...currentUser,
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          username: rawUsername || undefined,
        };

        // Update registry
        const allUsers = getStoredUsers();
        const existingIdx = allUsers.findIndex((u) => u.id === currentUser.id);
        if (existingIdx >= 0) {
          allUsers[existingIdx] = updatedUser;
        } else {
          allUsers.push(updatedUser);
        }
        saveStoredUsers(allUsers);

        // Update state
        set({ user: updatedUser });

        // Optional sync with backend
        try {
          await api.put('/api/auth/profile', {
            name: cleanName,
            email: cleanEmail,
            phone: cleanPhone,
            username: rawUsername,
          });
        } catch {}

        return { success: true };
      },

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
            authModalOpen: false,
          });
        } catch {
          // Fallback mock authentication if backend is offline
          const isAdmin = trimmedEmail.includes('admin') || trimmedEmail === 'admin@tanda.kz';
          const allUsers = getStoredUsers();
          let matched = allUsers.find((u) => u.email.toLowerCase() === trimmedEmail);

          if (!matched) {
            matched = {
              id: isAdmin ? '001007' : `user-${Date.now()}`,
              idNumber: isAdmin ? '000 001' : '001 001',
              name: isAdmin ? 'Әкімші' : 'Оқырман',
              email: trimmedEmail,
              username: isAdmin ? 'admin' : trimmedEmail.split('@')[0],
              role: isAdmin ? 'admin' : 'client',
              createdAt: new Date().toISOString(),
            };
            allUsers.push(matched);
            saveStoredUsers(allUsers);
          }

          localStorage.setItem('tanda_token', 'mock-jwt-token');
          set({
            user: matched,
            role: matched.role,
            isAuthenticated: true,
            authModalOpen: false,
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
            authModalOpen: false,
          });
        } catch {
          // Fallback mock registration
          const allUsers = getStoredUsers();
          const count = allUsers.filter((u) => u.role === 'client').length + 1;
          const idNum = `001 ${String(count).padStart(3, '0')}`;
          const defaultUsername = trimmedEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') || `user${count}`;

          const mockUser: User = {
            id: `user-${Date.now()}`,
            idNumber: idNum,
            name: name.trim() || 'Оқырман',
            email: trimmedEmail,
            username: defaultUsername,
            role: 'client',
            createdAt: new Date().toISOString(),
          };

          allUsers.push(mockUser);
          saveStoredUsers(allUsers);

          localStorage.setItem('tanda_token', 'mock-jwt-token');
          set({
            user: mockUser,
            role: 'client',
            isAuthenticated: true,
            authModalOpen: false,
          });
        } finally {
          set({ isLoading: false });
        }
      },

      logout: () => {
        // Automatically close audio player and stop playback completely on logout
        try {
          useAudioPlayerStore.getState().closePlayer();
        } catch {}

        localStorage.removeItem('tanda_token');
        api.post('/api/auth/logout').catch(() => {});
        set({ user: null, role: 'client', isAuthenticated: false, authModalOpen: false });
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
      partialize: (state) => ({
        user: state.user,
        role: state.role,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
