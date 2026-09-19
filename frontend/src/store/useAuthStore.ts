import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api';
import { User, AdminPermission } from '../types';
import { useMessageStore } from './useMessageStore';

function sendWelcomeMessage(user: { id: string; name?: string; email: string }) {
  try {
    useMessageStore.getState().sendMessage({
      title: 'Tanda әлеміне қош келдіңіз!',
      content: `Құрметті ${user.name || 'оқырман'}! Tanda онлайн кітапханасына сәтті тіркелуіңізбен құттықтаймыз! Мұнда қазақ және әлем әдебиетінің таңдаулы жауһарларын электронды түрде оқып, аудио нұсқасын тыңдай аласыз. Өзіңізге ұнаған кітаптарды «Менің сөрем» бөліміне қосып, кітап оқу сапарыңызды бастаңыз!`,
      targetType: 'single',
      targetUserIds: [user.id],
      targetUserNames: [user.name || 'Оқырман'],
      priority: 'news',
      senderName: 'Tanda',
      canReaderDelete: false,
    });
  } catch {}
}

interface AuthState {
  user: User | null;
  role: 'admin' | 'client';
  isAuthenticated: boolean;
  isLoading: boolean;
  authModalOpen: boolean;
  authModalMode: 'login' | 'signup';

  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  restoreSession: () => Promise<void>;
  updateProfile: (data: { name: string; email: string; phone?: string; username?: string; avatarUrl?: string }) => Promise<{ success: boolean; error?: string }>;
  updateAvatar: (avatarUrl: string | null) => Promise<{ success: boolean; error?: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  updateUserByAdmin: (userId: string, data: { name: string; email: string; phone?: string; username?: string; idNumber?: string; role?: 'admin' | 'client'; isActive?: boolean; personalMessage?: { text: string; days?: number; isActive?: boolean } | null }) => Promise<{ success: boolean; error?: string }>;
  createReaderByAdmin: (data: { name: string; email: string; phone?: string; password?: string; username?: string; idNumber?: string; role?: 'admin' | 'client'; personalMessage?: { text: string; days?: number; isActive?: boolean } }) => Promise<{ success: boolean; user?: User; error?: string }>;
  getUserById: (userId: string) => User | undefined;
  getAllClients: () => User[];
  getClientsCount: () => number;
  checkUsernameAvailable: (username: string, excludeUserId?: string) => { available: boolean; error?: string };

  // Manager (Көмекші / Басқару) operations
  getAllManagers: () => User[];
  createManagerByAdmin: (data: { name: string; email: string; password?: string; permissions: AdminPermission[] }) => Promise<{ success: boolean; user?: User; error?: string }>;
  updateManagerPermissions: (userId: string, data: { name: string; email: string; password?: string; permissions: AdminPermission[]; isActive?: boolean }) => Promise<{ success: boolean; error?: string }>;
  deleteManager: (userId: string) => Promise<{ success: boolean; error?: string }>;

  // Modal helpers
  openAuthModal: (mode?: 'login' | 'signup') => void;
  closeAuthModal: () => void;

  // Convenience helpers
  loginAsAdmin: () => Promise<void>;
  loginAsClient: (email?: string, name?: string) => Promise<void>;
}

const USERS_REGISTRY_KEY = 'tanda_users_registry_v1';
export const DEFAULT_READER_AVATAR = '/default-reader-avatar.jpg';

function formatPhoneNumber(val: string): string {
  if (!val) return '';
  const isPrefixed = val.trim().startsWith('+');
  const digits = val.replace(/\D/g, '');
  if (!digits) return '';

  let national = '';
  if (isPrefixed) {
    national = digits.substring(1, 11);
  } else if ((digits.startsWith('8') || digits.startsWith('7')) && digits.length === 11) {
    national = digits.substring(1, 11);
  } else if (digits === '8' && digits.length === 1) {
    return '';
  } else {
    national = digits.substring(0, 10);
  }

  if (!national) return '';

  let res = '+7 (';
  res += national.substring(0, Math.min(3, national.length));
  if (national.length > 3) {
    res += ') ' + national.substring(3, Math.min(6, national.length));
  }
  if (national.length > 6) {
    res += '-' + national.substring(6, Math.min(8, national.length));
  }
  if (national.length > 8) {
    res += '-' + national.substring(8, Math.min(10, national.length));
  }
  return res;
}

function getStoredUsers(): User[] {
  try {
    const raw = localStorage.getItem(USERS_REGISTRY_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) {
        let modified = false;
        list.forEach((u: User) => {
          if ((u.id === '001007' || u.email === 'admin@tanda.kz' || u.idNumber === '000 001') && !u.isSuperAdmin) {
            u.isSuperAdmin = true;
            modified = true;
          }
          if (u.role === 'client' && !u.avatarUrl) {
            u.avatarUrl = DEFAULT_READER_AVATAR;
            modified = true;
          }
        });
        if (modified) saveStoredUsers(list);
        return list;
      }
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
      isSuperAdmin: true,
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
      avatarUrl: DEFAULT_READER_AVATAR,
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

      checkUsernameAvailable: (username: string, excludeUserId?: string) => {
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

        const effectiveExcludeId = excludeUserId !== undefined ? excludeUserId : get().user?.id;
        const allUsers = getStoredUsers();
        const existing = allUsers.find(
          (u) => (u.username?.toLowerCase() === trimmed) && u.id !== effectiveExcludeId
        );

        if (existing) {
          return { available: false, error: 'Бұл юзернейм бос емес. Басқа юзернейм таңдаңыз' };
        }

        return { available: true };
      },

      getUserById: (userId: string): User | undefined => {
        const allUsers = getStoredUsers();
        return allUsers.find((u) => u.id === userId);
      },

      getAllClients: (): User[] => {
        const allUsers = getStoredUsers();
        return allUsers.filter((u) => u.role === 'client');
      },

      getClientsCount: (): number => {
        const allUsers = getStoredUsers();
        return allUsers.filter((u) => u.role === 'client').length;
      },

      getAllManagers: (): User[] => {
        const allUsers = getStoredUsers();
        return allUsers.filter((u) => u.role === 'admin');
      },

      createManagerByAdmin: async (data: {
        name: string;
        email: string;
        password?: string;
        permissions: AdminPermission[];
      }) => {
        const allUsers = getStoredUsers();
        const cleanName = data.name.trim();
        const cleanEmail = data.email.trim().toLowerCase();
        const cleanPassword = data.password?.trim() || '';

        if (!cleanName) {
          return { success: false, error: 'Көмекшінің аты-жөнін енгізіңіз' };
        }
        if (!cleanEmail) {
          return { success: false, error: 'Google аккаунтын немесе электронды поштасын енгізіңіз' };
        }
        if (!data.permissions || data.permissions.length === 0) {
          return { success: false, error: 'Кем дегенде бір рұқсат (функция) таңдалуы керек' };
        }

        // Check if email already exists
        const emailConflict = allUsers.find(
          (u) => u.email.toLowerCase() === cleanEmail
        );
        if (emailConflict) {
          return { success: false, error: 'Бұл электронды поштамен пайдаланушы тіркелген' };
        }

        const adminCount = allUsers.filter((u) => u.role === 'admin').length + 1;
        const idNum = `000 ${String(adminCount).padStart(3, '0')}`;
        const newManager: User = {
          id: `manager-${Date.now()}`,
          idNumber: idNum,
          name: cleanName,
          email: cleanEmail,
          username: cleanEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') || `admin${adminCount}`,
          role: 'admin',
          isSuperAdmin: false,
          permissions: data.permissions,
          isActive: true,
          hasPassword: !!cleanPassword,
          password: cleanPassword || undefined,
          authProvider: cleanEmail.includes('@gmail.com') ? 'GOOGLE' : 'LOCAL',
          createdAt: new Date().toISOString(),
        };

        allUsers.push(newManager);
        saveStoredUsers(allUsers);

        return { success: true, user: newManager };
      },

      updateManagerPermissions: async (
        userId: string,
        data: {
          name: string;
          email: string;
          password?: string;
          permissions: AdminPermission[];
          isActive?: boolean;
        }
      ) => {
        const allUsers = getStoredUsers();
        const existingIdx = allUsers.findIndex((u) => u.id === userId);
        if (existingIdx === -1) {
          return { success: false, error: 'Көмекші табылмады' };
        }

        const target = allUsers[existingIdx];
        const cleanName = data.name.trim();
        const cleanEmail = data.email.trim().toLowerCase();

        if (!cleanName) {
          return { success: false, error: 'Аты-жөнін енгізіңіз' };
        }
        if (!cleanEmail) {
          return { success: false, error: 'Электронды поштасын енгізіңіз' };
        }
        if (!data.permissions || data.permissions.length === 0) {
          return { success: false, error: 'Кем дегенде бір рұқсатты таңдаңыз' };
        }

        const emailConflict = allUsers.find(
          (u) => u.email.toLowerCase() === cleanEmail && u.id !== userId
        );
        if (emailConflict) {
          return { success: false, error: 'Бұл поштамен басқа аккаунт тіркелген' };
        }

        const updated: User = {
          ...target,
          name: cleanName,
          email: cleanEmail,
          permissions: data.permissions,
          isActive: data.isActive !== undefined ? data.isActive : target.isActive,
          password: data.password ? data.password.trim() : target.password,
          hasPassword: data.password ? true : target.hasPassword,
        };

        allUsers[existingIdx] = updated;
        saveStoredUsers(allUsers);

        const currentUser = get().user;
        if (currentUser && currentUser.id === userId) {
          set({ user: updated, role: updated.role });
        }

        return { success: true };
      },

      deleteManager: async (userId: string) => {
        const allUsers = getStoredUsers();
        const target = allUsers.find((u) => u.id === userId);
        if (!target) {
          return { success: false, error: 'Көмекші табылмады' };
        }
        if (target.isSuperAdmin || target.id === '001007' || target.email === 'admin@tanda.kz') {
          return { success: false, error: 'Бас әкімшіні өшіруге болмайды' };
        }

        const filtered = allUsers.filter((u) => u.id !== userId);
        saveStoredUsers(filtered);

        return { success: true };
      },

      updateUserByAdmin: async (
        userId: string,
        data: {
          name: string;
          email: string;
          phone?: string;
          username?: string;
          idNumber?: string;
          role?: 'admin' | 'client';
          isActive?: boolean;
          personalMessage?: { text: string; days?: number; isActive?: boolean } | null;
        }
      ) => {
        const allUsers = getStoredUsers();
        const existingIdx = allUsers.findIndex((u) => u.id === userId);
        if (existingIdx === -1) {
          return { success: false, error: 'Оқырман дерекқорынан табылмады' };
        }

        const targetUser = allUsers[existingIdx];
        const cleanName = data.name.trim();
        const cleanEmail = data.email.trim().toLowerCase();
        const cleanPhone = data.phone?.trim() || '';
        const rawUsername = data.username?.trim().toLowerCase().replace(/^@/, '') || '';
        const cleanIdNumber = data.idNumber?.trim() || targetUser.idNumber;
        const cleanRole = data.role || targetUser.role;

        if (!cleanName) {
          return { success: false, error: 'Аты-жөнін енгізіңіз' };
        }
        if (!cleanEmail) {
          return { success: false, error: 'Электронды поштасын енгізіңіз' };
        }

        // Validate email uniqueness across other users
        const emailConflict = allUsers.find(
          (u) => u.email.toLowerCase() === cleanEmail && u.id !== userId
        );
        if (emailConflict) {
          return { success: false, error: 'Бұл электронды поштамен басқа оқырман тіркелген' };
        }

        // Validate phone format: either empty or 10 national digits
        if (cleanPhone) {
          const rawDigits = cleanPhone.replace(/\D/g, '');
          let national = rawDigits;
          if (rawDigits.length > 10 && (rawDigits.startsWith('7') || rawDigits.startsWith('8'))) {
            national = rawDigits.substring(1, 11);
          } else if (rawDigits === '8') {
            national = '';
          } else {
            national = rawDigits.substring(0, 10);
          }
          if (national.length !== 10) {
            return { success: false, error: 'Телефон нөмірін толық жазыңыз (+7 (777) 123-45-67) немесе бос қалдырыңыз' };
          }
        }

        // Validate username uniqueness
        if (rawUsername) {
          const check = get().checkUsernameAvailable(rawUsername, userId);
          if (!check.available) {
            return { success: false, error: check.error || 'Бұл юзернейм бос емес' };
          }
        }

        let updatedPersonalMessage = targetUser.personalMessage;
        if (data.personalMessage === null) {
          updatedPersonalMessage = undefined;
        } else if (data.personalMessage !== undefined) {
          if (!data.personalMessage.text.trim()) {
            updatedPersonalMessage = undefined;
          } else {
            const days = Math.max(1, data.personalMessage.days || 7);
            const now = new Date();
            const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
            updatedPersonalMessage = {
              text: data.personalMessage.text.trim(),
              days,
              createdAt: now.toISOString(),
              expiresAt,
              isActive: data.personalMessage.isActive !== false,
            };
          }
        }

        const updatedUser: User = {
          ...targetUser,
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          username: rawUsername || undefined,
          idNumber: cleanIdNumber,
          role: cleanRole,
          isActive: data.isActive !== undefined ? data.isActive : targetUser.isActive,
          personalMessage: updatedPersonalMessage,
        };

        // Update registry
        allUsers[existingIdx] = updatedUser;
        saveStoredUsers(allUsers);

        // If the current logged-in user in session is this user, update active auth user immediately!
        const currentUser = get().user;
        if (currentUser && currentUser.id === userId) {
          set({ user: updatedUser, role: updatedUser.role });
        }

        // Optional sync with backend
        try {
          await api.patch(`/api/admin/users/${userId}`, {
            name: cleanName,
            role: cleanRole,
            isActive: updatedUser.isActive,
          });
        } catch {}

        return { success: true };
      },

      createReaderByAdmin: async (data: {
        name: string;
        email: string;
        phone?: string;
        password?: string;
        username?: string;
        idNumber?: string;
        role?: 'admin' | 'client';
        personalMessage?: { text: string; days?: number; isActive?: boolean };
      }) => {
        const allUsers = getStoredUsers();
        const cleanName = data.name.trim();
        const cleanEmail = data.email.trim().toLowerCase();
        const cleanPhone = data.phone?.trim() || '';
        const rawUsername = data.username?.trim().toLowerCase().replace(/^@/, '') || '';
        const cleanRole = data.role || 'client';

        if (!cleanName) {
          return { success: false, error: 'Аты-жөнін енгізіңіз' };
        }
        if (!cleanEmail) {
          return { success: false, error: 'Электронды поштасын енгізіңіз' };
        }

        // Validate email uniqueness
        const emailConflict = allUsers.find(
          (u) => u.email.toLowerCase() === cleanEmail
        );
        if (emailConflict) {
          return { success: false, error: 'Бұл электронды поштамен оқырман тіркелген' };
        }

        // Validate phone format & uniqueness if provided
        if (cleanPhone) {
          const rawDigits = cleanPhone.replace(/\D/g, '');
          let national = rawDigits;
          if (rawDigits.length > 10 && (rawDigits.startsWith('7') || rawDigits.startsWith('8'))) {
            national = rawDigits.substring(1, 11);
          } else {
            national = rawDigits.substring(0, 10);
          }
          if (national.length !== 10) {
            return { success: false, error: 'Телефон нөмірін толық жазыңыз (+7 (777) 123-45-67)' };
          }

          const phoneConflict = allUsers.find((u) => {
            if (!u.phone) return false;
            const uDigits = u.phone.replace(/\D/g, '');
            const uNat = (uDigits.length > 10 && (uDigits.startsWith('7') || uDigits.startsWith('8')))
              ? uDigits.substring(1, 11)
              : uDigits.substring(0, 10);
            return uNat === national;
          });
          if (phoneConflict) {
            return { success: false, error: 'Бұл телефон нөмірімен басқа оқырман тіркелген' };
          }
        }

        // Validate username uniqueness if provided
        if (rawUsername) {
          const check = get().checkUsernameAvailable(rawUsername);
          if (!check.available) {
            return { success: false, error: check.error || 'Бұл юзернейм бос емес' };
          }
        }

        // Generate ID Number if not provided
        let idNumber = data.idNumber?.trim();
        if (!idNumber) {
          const clientCount = allUsers.filter((u) => u.role === 'client').length + 1;
          idNumber = `001 ${String(clientCount).padStart(3, '0')}`;
        }

        let personalMessage = undefined;
        if (data.personalMessage && data.personalMessage.text.trim()) {
          const days = Math.max(1, data.personalMessage.days || 7);
          const now = new Date();
          const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
          personalMessage = {
            text: data.personalMessage.text.trim(),
            days,
            createdAt: now.toISOString(),
            expiresAt,
            isActive: data.personalMessage.isActive !== false,
          };
        }

        const newUserId = `user-${Date.now()}`;
        const newUser: User = {
          id: newUserId,
          idNumber,
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone || undefined,
          username: rawUsername || undefined,
          role: cleanRole,
          avatarUrl: cleanRole === 'client' ? DEFAULT_READER_AVATAR : undefined,
          password: data.password || 'reader123',
          hasPassword: true,
          isActive: true,
          personalMessage,
          createdAt: new Date().toISOString(),
        };

        allUsers.push(newUser);
        saveStoredUsers(allUsers);
        sendWelcomeMessage(newUser);

        // Try backend sync if online
        try {
          await api.post('/api/admin/users', {
            name: cleanName,
            email: cleanEmail,
            phone: cleanPhone,
            password: data.password || 'reader123',
            role: cleanRole,
          });
        } catch {}

        return { success: true, user: newUser };
      },

      updateProfile: async (data: { name: string; email: string; phone?: string; username?: string; avatarUrl?: string }) => {
        const currentUser = get().user;
        if (!currentUser) {
          return { success: false, error: 'Жүйеге кірмегенсіз' };
        }

        const cleanName = data.name.trim();
        const cleanEmail = data.email.trim().toLowerCase();
        const cleanPhone = data.phone?.trim() || '';
        const rawUsername = data.username?.trim().toLowerCase().replace(/^@/, '') || '';
        const newAvatarUrl = data.avatarUrl !== undefined ? (data.avatarUrl || undefined) : currentUser.avatarUrl;

        if (!cleanName) {
          return { success: false, error: 'Аты-жөніңізді енгізіңіз' };
        }
        if (!cleanEmail) {
          return { success: false, error: 'Электронды поштаңызды енгізіңіз' };
        }

        // Validate phone format: either empty or 10 national digits
        if (cleanPhone) {
          const rawDigits = cleanPhone.replace(/\D/g, '');
          let national = rawDigits;
          if (rawDigits.length > 10 && (rawDigits.startsWith('7') || rawDigits.startsWith('8'))) {
            national = rawDigits.substring(1, 11);
          } else if (rawDigits === '8') {
            national = '';
          } else {
            national = rawDigits.substring(0, 10);
          }
          if (national.length !== 10) {
            return { success: false, error: 'Телефон нөмірін толық жазыңыз (+7 (777) 123-45-67) немесе бос қалдырыңыз' };
          }
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
          avatarUrl: newAvatarUrl,
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
            avatarUrl: newAvatarUrl || null,
          });
        } catch {}

        return { success: true };
      },

      updateAvatar: async (avatarUrl: string | null) => {
        const currentUser = get().user;
        if (!currentUser) {
          return { success: false, error: 'Жүйеге кірмегенсіз' };
        }

        const updatedUser: User = {
          ...currentUser,
          avatarUrl: avatarUrl || undefined,
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
            name: currentUser.name,
            email: currentUser.email,
            avatarUrl: avatarUrl || null,
          });
        } catch {}

        return { success: true };
      },

      changePassword: async (currentPassword: string, newPassword: string) => {
        const currentUser = get().user;
        if (!currentUser) {
          return { success: false, error: 'Жүйеге кірмегенсіз' };
        }
        if (!currentPassword.trim()) {
          return { success: false, error: 'Қазіргі құпиясөзді енгізіңіз' };
        }
        if (!newPassword || newPassword.length < 6) {
          return { success: false, error: 'Жаңа құпиясөз кемінде 6 таңбадан тұруы керек' };
        }

        // Try backend sync if available
        try {
          await api.put('/api/auth/password', {
            currentPassword,
            newPassword,
          });
        } catch {}

        return { success: true };
      },

      login: async (emailOrPhone: string, password: string) => {
        set({ isLoading: true });
        const trimmed = emailOrPhone.trim().toLowerCase();
        
        // Extract national phone digits if an entered value looks like a phone number
        const cleanDigits = trimmed.replace(/\D/g, '');
        let phoneNational = '';
        if (cleanDigits.length === 11 && (cleanDigits.startsWith('7') || cleanDigits.startsWith('8'))) {
          phoneNational = cleanDigits.substring(1, 11);
        } else if (cleanDigits.length === 10) {
          phoneNational = cleanDigits;
        }

        try {
          const { data } = await api.post('/api/auth/login', {
            email: trimmed,
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
          const allUsers = getStoredUsers();
          let matched = allUsers.find((u) => {
            if (u.email.toLowerCase() === trimmed) return true;
            if (u.username && u.username.toLowerCase() === trimmed.replace(/^@/, '')) return true;
            if (u.idNumber && u.idNumber.toLowerCase() === trimmed) return true;
            if (phoneNational && u.phone) {
              const uDigits = u.phone.replace(/\D/g, '');
              const uNat = (uDigits.length > 10 && (uDigits.startsWith('7') || uDigits.startsWith('8')))
                ? uDigits.substring(1, 11)
                : uDigits.substring(0, 10);
              if (uNat === phoneNational) return true;
            }
            return false;
          });

          if (!matched) {
            const isAdmin = trimmed.includes('admin') || trimmed === 'admin@tanda.kz';
            matched = {
              id: isAdmin ? '001007' : `user-${Date.now()}`,
              idNumber: isAdmin ? '000 001' : '001 001',
              name: isAdmin ? 'Әкімші' : 'Оқырман',
              email: trimmed.includes('@') ? trimmed : `${trimmed}@tanda.kz`,
              username: isAdmin ? 'admin' : (trimmed.includes('@') ? trimmed.split('@')[0] : trimmed),
              phone: phoneNational ? formatPhoneNumber(trimmed) : undefined,
              role: isAdmin ? 'admin' : 'client',
              avatarUrl: isAdmin ? undefined : DEFAULT_READER_AVATAR,
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

      loginWithGoogle: async (credential: string) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/api/auth/google', { credential });
          localStorage.setItem('tanda_token', data.token);
          set({
            user: data.user,
            role: data.user.role as 'admin' | 'client',
            isAuthenticated: true,
            authModalOpen: false,
          });
        } catch {
          const payload = (() => {
            try {
              const base64Url = credential.split('.')[1];
              const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
              const jsonPayload = decodeURIComponent(
                atob(base64)
                  .split('')
                  .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                  .join('')
              );
              return JSON.parse(jsonPayload);
            } catch {
              return { email: 'google.user@gmail.com', name: 'Google Пайдаланушысы' };
            }
          })();

          const email = (payload.email || 'google.user@gmail.com').toLowerCase();
          const name = payload.name || payload.given_name || 'Google Пайдаланушысы';
          const picture = payload.picture || DEFAULT_READER_AVATAR;
          const allUsers = getStoredUsers();
          let matched = allUsers.find((u) => u.email.toLowerCase() === email);

          if (!matched) {
            const count = allUsers.filter((u) => u.role === 'client').length + 1;
            const idNum = `001 ${String(count).padStart(3, '0')}`;
            matched = {
              id: `google-${Date.now()}`,
              idNumber: idNum,
              name,
              email,
              username: email.split('@')[0],
              role: 'client',
              authProvider: 'GOOGLE',
              avatarUrl: picture,
              hasPassword: false,
              createdAt: new Date().toISOString(),
            };
            allUsers.push(matched);
            saveStoredUsers(allUsers);
            sendWelcomeMessage(matched);
          } else {
            if (picture) {
              matched.avatarUrl = picture;
              saveStoredUsers(allUsers);
            }
          }

          localStorage.setItem('tanda_token', 'mock-google-token');
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
          const regUser = {
            ...data.user,
            avatarUrl: data.user?.avatarUrl || DEFAULT_READER_AVATAR,
          };
          localStorage.setItem('tanda_token', data.token);
          set({
            user: regUser,
            role: regUser.role as 'admin' | 'client',
            isAuthenticated: true,
            authModalOpen: false,
          });
          sendWelcomeMessage(regUser);
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
            avatarUrl: DEFAULT_READER_AVATAR,
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
          sendWelcomeMessage(mockUser);
        } finally {
          set({ isLoading: false });
        }
      },

      logout: () => {
        // Automatically notify listeners (e.g. audio player) on logout
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tanda:logout'));
        }

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
