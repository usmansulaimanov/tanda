import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';

const API_USERS_ENDPOINT = '/api/users';

export function formatUserNumberId(num: number): string {
  const str = String(num).padStart(6, '0');
  return `${str.slice(0, 3)} ${str.slice(3)}`;
}

function getNextIdNumber(users: User[], role: 'admin' | 'client'): string {
  if (role === 'admin') {
    const adminUsers = users.filter((u) => u.role === 'admin');
    const nextAdminNum = adminUsers.length > 0 ? adminUsers.length : 1;
    return formatUserNumberId(nextAdminNum);
  }
  const clientUsers = users.filter((u) => u.role === 'client');
  const nextClientNum = 1001 + clientUsers.length;
  return formatUserNumberId(nextClientNum);
}

const DEFAULT_USERS: User[] = [
  {
    id: 'admin-1',
    idNumber: '000 001',
    email: 'admin@tanda.kz',
    name: 'Админ',
    role: 'admin',
    date: '2026-09-01',
  },
  {
    id: 'user-1',
    idNumber: '001 001',
    email: 'arman.aliev@gmail.com',
    name: 'Арман Әлиев',
    role: 'client',
    date: '2026-09-02',
  },
  {
    id: 'user-2',
    idNumber: '001 002',
    email: 'dina.sapar@mail.kz',
    name: 'Дина Сапарқызы',
    role: 'client',
    date: '2026-09-04',
  },
  {
    id: 'user-3',
    idNumber: '001 003',
    email: 'nurbol.k@tanda.kz',
    name: 'Нұрбол Кеңес',
    role: 'client',
    date: '2026-09-06',
  },
  {
    id: 'user-4',
    idNumber: '001 004',
    email: 'aigerim.b@gmail.com',
    name: 'Әйгерім Байұзақ',
    role: 'client',
    date: '2026-09-08',
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
        idNumber: '000 001',
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
          idNumber: '000 001',
          name: 'Админ',
          email: 'admin@tanda.kz',
          role: 'admin' as const,
          date: '2026-09-01',
        };
        if (!adminUser.idNumber) {
          adminUser.idNumber = '000 001';
        }
        if (adminUser.name === 'Бас Администратор') {
          adminUser.name = 'Админ';
        }
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
          if (!existing.idNumber) {
            existing.idNumber = getNextIdNumber(currentUsers, existing.role);
          }
          set({
            user: existing,
            role: existing.role,
            isAuthenticated: true,
          });
          return;
        }

        const idNumber = getNextIdNumber(currentUsers, 'client');
        const newUser: User = {
          id: `user-${Date.now()}`,
          idNumber,
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
        if (existing) {
          if (!existing.idNumber) {
            existing.idNumber = getNextIdNumber(currentUsers, existing.role);
          }
          return existing;
        }

        const idNumber = getNextIdNumber(currentUsers, role);
        const newUser: User = {
          id: `user-${Date.now()}`,
          idNumber,
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
