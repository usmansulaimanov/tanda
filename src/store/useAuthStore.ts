import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';

const API_USERS_ENDPOINT = '/api/users';

const DEFAULT_USERS: User[] = [
  {
    id: 'admin-1',
    email: 'admin@tanda.kz',
    name: 'Бас Администратор',
    role: 'admin',
    date: '2026-09-01',
  },
  {
    id: 'user-1',
    email: 'oqyrman@mail.kz',
    name: 'Айбек Қайратұлы',
    role: 'client',
    date: '2026-09-05',
  },
  {
    id: 'user-2',
    email: 'azamat@tanda.kz',
    name: 'Азамат Серікұлы',
    role: 'client',
    date: '2026-09-06',
  },
  {
    id: 'user-3',
    email: 'dana@gmail.com',
    name: 'Дана Нұрланқызы',
    role: 'client',
    date: '2026-09-07',
  },
  {
    id: 'user-4',
    email: 'arman@bk.ru',
    name: 'Арман Мақсатұлы',
    role: 'client',
    date: '2026-09-08',
  },
  {
    id: 'user-5',
    email: 'gulnar@tanda.kz',
    name: 'Гүлнар Әлиева',
    role: 'client',
    date: '2026-09-09',
  },
];

async function saveUsersToBackend(users: User[]) {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tanda_users', JSON.stringify(users));
    }
    await fetch(API_USERS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(users),
    });
  } catch {
    // Client-side fallback
  }
}

interface AuthState {
  user: User | null;
  role: 'admin' | 'client';
  isAuthenticated: boolean;
  users: User[];
  loginAsAdmin: () => void;
  loginAsClient: (email?: string, name?: string) => void;
  setRole: (role: 'admin' | 'client') => void;
  addUser: (email: string, name?: string, role?: 'admin' | 'client') => User;
  deleteUser: (id: string) => void;
  logout: () => void;
  fetchUsersFromBackend: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: {
        id: 'admin-1',
        name: 'Админ',
        email: 'admin@tanda.kz',
        role: 'admin',
        date: '2026-09-01',
      },
      role: 'admin',
      isAuthenticated: true,
      users: DEFAULT_USERS,

      loginAsAdmin: () => {
        const adminUser = get().users.find((u) => u.role === 'admin') || {
          id: 'admin-1',
          name: 'Админ',
          email: 'admin@tanda.kz',
          role: 'admin' as const,
          date: '2026-09-01',
        };
        set({
          user: adminUser,
          role: 'admin',
          isAuthenticated: true,
        });
      },

      loginAsClient: (email = 'reader@tanda.kz', name = 'Оқырман') => {
        const cleanEmail = email.trim().toLowerCase();
        const currentUsers = get().users;
        const existing = currentUsers.find((u) => u.email.toLowerCase() === cleanEmail);

        if (existing) {
          set({
            user: existing,
            role: existing.role,
            isAuthenticated: true,
          });
          return;
        }

        const newUser: User = {
          id: `user-${Date.now()}`,
          name: name.trim() || cleanEmail.split('@')[0] || 'Оқырман',
          email: cleanEmail,
          role: 'client',
          date: new Date().toISOString().slice(0, 10),
        };

        const updated = [...currentUsers, newUser];
        set({
          user: newUser,
          role: 'client',
          isAuthenticated: true,
          users: updated,
        });
        saveUsersToBackend(updated);
      },

      addUser: (email: string, name?: string, role: 'admin' | 'client' = 'client') => {
        const cleanEmail = email.trim().toLowerCase();
        const currentUsers = get().users;
        const existing = currentUsers.find((u) => u.email.toLowerCase() === cleanEmail);
        if (existing) return existing;

        const newUser: User = {
          id: `user-${Date.now()}`,
          name: (name || cleanEmail.split('@')[0] || 'Оқырман').trim(),
          email: cleanEmail,
          role,
          date: new Date().toISOString().slice(0, 10),
        };
        const updated = [...currentUsers, newUser];
        set({ users: updated });
        saveUsersToBackend(updated);
        return newUser;
      },

      deleteUser: (id: string) => {
        const updated = get().users.filter((u) => u.id !== id);
        set({ users: updated });
        saveUsersToBackend(updated);
      },

      setRole: (role) =>
        set((state) => ({
          role,
          user: state.user ? { ...state.user, role } : null,
        })),

      logout: () => set({ user: null, role: 'client', isAuthenticated: false }),

      fetchUsersFromBackend: async () => {
        try {
          const res = await fetch(API_USERS_ENDPOINT);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              set({ users: data });
              if (typeof window !== 'undefined') {
                localStorage.setItem('tanda_users', JSON.stringify(data));
              }
            }
          }
        } catch {
          // Keep local state
        }
      },
    }),
    {
      name: 'tanda_auth_storage',
    }
  )
);

if (typeof window !== 'undefined') {
  useAuthStore.getState().fetchUsersFromBackend();
}
