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
  role: 'admin' | 'client' | 'author';
  isAuthenticated: boolean;
  isLoading: boolean;
  authModalOpen: boolean;
  authModalMode: 'login' | 'signup';

  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  restoreSession: () => Promise<void>;
  updateProfile: (data: { name: string; email: string; phone?: string; username?: string; birthDate?: string; gender?: 'male' | 'female' | 'other'; avatarUrl?: string }) => Promise<{ success: boolean; error?: string }>;
  updateAvatar: (avatarUrl: string | null) => Promise<{ success: boolean; error?: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  updateUserByAdmin: (userId: string, data: { name: string; firstName?: string; lastName?: string; email: string; phone?: string; password?: string; username?: string; idNumber?: string; birthDate?: string; role?: 'admin' | 'client' | 'author'; isActive?: boolean; personalMessage?: { text: string; days?: number; isActive?: boolean } | null }) => Promise<{ success: boolean; error?: string }>;
  toggleBlockUser: (userId: string) => Promise<{ success: boolean; isBlocked?: boolean; error?: string }>;
  createReaderByAdmin: (data: { name: string; firstName?: string; lastName?: string; email: string; phone?: string; password?: string; username?: string; idNumber?: string; birthDate?: string; role?: 'admin' | 'client' | 'author'; personalMessage?: { text: string; days?: number; isActive?: boolean } }) => Promise<{ success: boolean; user?: User; error?: string }>;
  grantBirthdayGiftManually: (userId: string) => Promise<{ success: boolean; error?: string }>;
  resetBirthdayGiftHistory: (userId: string) => Promise<{ success: boolean; error?: string }>;
  getUserById: (userId: string) => User | undefined;
  getAllClients: () => User[];
  getClientsCount: () => number;
  checkUsernameAvailable: (username: string, excludeUserId?: string) => { available: boolean; error?: string };
  checkIdNumberAvailable: (idNumber: string, excludeUserId?: string) => { available: boolean; error?: string };
  getNextAvailableIdNumber: () => string;

  // Reserved usernames (Бұғатталған/резервтелген юзернеймдер)
  getReservedUsernames: () => string[];
  addReservedUsername: (username: string) => { success: boolean; error?: string };
  addReservedUsernames: (usernames: string[]) => { addedCount: number; skippedCount: number; invalidCount: number; error?: string };
  removeReservedUsername: (username: string) => { success: boolean; error?: string };

  // Manager (Көмекші / Басқару) operations
  getAllManagers: () => User[];
  createManagerByAdmin: (data: { name: string; email: string; password?: string; duty?: string; avatarUrl?: string | null; idNumber?: string; permissions: AdminPermission[] }) => Promise<{ success: boolean; user?: User; error?: string }>;
  updateManagerPermissions: (userId: string, data: { name: string; email: string; password?: string; duty?: string; avatarUrl?: string | null; idNumber?: string; permissions: AdminPermission[]; isActive?: boolean }) => Promise<{ success: boolean; error?: string }>;
  deleteManager: (userId: string) => Promise<{ success: boolean; error?: string }>;

  // Author (Авторлар) operations
  getAllAuthors: () => User[];
  createAuthorByAdmin: (data: { name: string; email: string; password?: string; phone?: string; idNumber?: string; avatarUrl?: string | null; assignedAuthorName?: string; assignedBookIds?: string[] }) => Promise<{ success: boolean; user?: User; error?: string }>;
  updateAuthorByAdmin: (userId: string, data: { name: string; email: string; password?: string; phone?: string; idNumber?: string; avatarUrl?: string | null; assignedAuthorName?: string; assignedBookIds?: string[]; isActive?: boolean }) => Promise<{ success: boolean; error?: string }>;
  deleteAuthor: (userId: string) => Promise<{ success: boolean; error?: string }>;

  // Modal helpers
  openAuthModal: (mode?: 'login' | 'signup') => void;
  closeAuthModal: () => void;

  // Convenience helpers
  loginAsAdmin: () => Promise<void>;
  loginAsClient: (email?: string, name?: string) => Promise<void>;
}

const USERS_REGISTRY_KEY = 'tanda_users_registry_v1';
export const DEFAULT_READER_AVATAR = '/default-reader-avatar.jpg';
export const DEFAULT_MANAGER_AVATAR = '/default-manager-avatar.jpg';

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
          if ((u.id === '001007' || u.email === 'admin@tanda.kz' || u.idNumber === '000 001' || u.idNumber === '0000 0001') && !u.isSuperAdmin) {
            u.isSuperAdmin = true;
            modified = true;
          }
          if (u.role === 'client' && !u.avatarUrl) {
            u.avatarUrl = DEFAULT_READER_AVATAR;
            modified = true;
          }
          if (u.role === 'admin' && !u.isSuperAdmin && !u.avatarUrl && u.id !== '001007' && u.email !== 'admin@tanda.kz') {
            u.avatarUrl = DEFAULT_MANAGER_AVATAR;
            modified = true;
          }
          // Migrate Admin / Manager IDs like "000 001" -> "0000 0001", "000 002" -> "0000 0002"
          if (u.role === 'admin' && u.idNumber) {
            const match3_3 = u.idNumber.match(/^000\s*(\d+)$/);
            if (match3_3) {
              u.idNumber = `0000 ${String(match3_3[1]).padStart(4, '0')}`;
              modified = true;
            }
          }
          // Migrate Reader IDs to "0000 1001", "0000 1002", etc.
          if (u.role === 'client' && u.idNumber) {
            const matchOld1 = u.idNumber.match(/^(?:001|0001)\s*0*(\d+)$/);
            if (matchOld1) {
              const num = parseInt(matchOld1[1], 10);
              if (num < 1000) {
                u.idNumber = `0000 ${String(1000 + num).padStart(4, '0')}`;
                modified = true;
              } else {
                u.idNumber = `0000 ${String(num).padStart(4, '0')}`;
                modified = true;
              }
            } else {
              const match3_3 = u.idNumber.match(/^(\d{3})\s+(\d{3})$/);
              if (match3_3 && match3_3[1] === '001') {
                const n = parseInt(match3_3[2], 10);
                u.idNumber = `0000 ${String(1000 + n).padStart(4, '0')}`;
                modified = true;
              }
            }
          }
          if (u.isSuperAdmin && u.idNumber !== '0000 0001') {
            u.idNumber = '0000 0001';
            modified = true;
          }
        });

        // Auto-fix duplicate idNumbers so each reader has a strictly unique ID
        const usedIds = new Set<string>();
        let maxClientNum = 1000;

        // Find max client number among existing IDs
        list.forEach((u: User) => {
          if (u.role === 'client' && u.idNumber) {
            const match = u.idNumber.match(/0000\s*(\d+)/i) || u.idNumber.match(/(\d+)/);
            if (match) {
              const num = parseInt(match[1], 10);
              if (!isNaN(num) && num > maxClientNum && num >= 1000) {
                maxClientNum = num;
              }
            }
          }
        });

        // Resolve duplicates by giving the later entry a new unique ID
        list.forEach((u: User) => {
          if (u.role === 'client') {
            const rawId = (u.idNumber || '').trim();
            const norm = rawId.replace(/\s+/g, '').toLowerCase();
            if (norm && usedIds.has(norm)) {
              maxClientNum += 1;
              const newId = `0000 ${String(maxClientNum).padStart(4, '0')}`;
              u.idNumber = newId;
              usedIds.add(newId.replace(/\s+/g, '').toLowerCase());
              modified = true;
            } else if (norm) {
              usedIds.add(norm);
            }
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
      idNumber: '0000 0001',
      name: 'Әкімші',
      email: 'admin@tanda.kz',
      username: 'admin',
      role: 'admin',
      isSuperAdmin: true,
      createdAt: '2026-09-01T10:00:00.000Z',
    },
    {
      id: 'user-001001',
      idNumber: '0000 1001',
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

export function checkAndSendBirthdayGreeting(user?: User | null): boolean {
  if (!user || !user.birthDate) return false;

  try {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
    const currentDay = String(today.getDate()).padStart(2, '0');
    const todayStr = `${currentYear}-${currentMonth}-${currentDay}`;

    // Parse user birthDate (supports "DD.MM.YYYY", "YYYY-MM-DD", "DD/MM/YYYY")
    const parts = user.birthDate.split(/[-./]/);
    let birthMonth = '';
    let birthDay = '';

    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        birthMonth = parts[1].padStart(2, '0');
        birthDay = parts[2].padStart(2, '0');
      } else {
        // DD.MM.YYYY
        birthDay = parts[0].padStart(2, '0');
        birthMonth = parts[1].padStart(2, '0');
      }
    } else if (parts.length === 2) {
      birthDay = parts[0].padStart(2, '0');
      birthMonth = parts[1].padStart(2, '0');
    }

    if (!birthMonth || !birthDay) return false;

    // Check if today is the user's birthday (same month and day)
    if (birthMonth === currentMonth && birthDay === currentDay) {
      // Deliver birthday greeting & 1-month free premium gift only once per calendar year
      if (user.lastBirthdayGiftYear !== currentYear && user.lastBirthdayGreetingYear !== currentYear) {
        // Calculate new 1-month (30-day) premium expiry date
        const baseTime = (user.isPremium && user.premiumExpiresAt && new Date(user.premiumExpiresAt).getTime() > Date.now())
          ? new Date(user.premiumExpiresAt).getTime()
          : Date.now();
        const newExpiresAt = new Date(baseTime + 30 * 24 * 60 * 60 * 1000).toISOString();

        // Send celebratory message to reader
        useMessageStore.getState().sendMessage({
          title: `🎉 Туған күніңіз құтты болсын, ${user.name || 'құрметті оқырман'}!`,
          content: `Құрметті ${user.name || 'оқырман'}! Сізді бүгінгі жеке мерекеңіз — туған күніңізбен Tanda онлайн кітапханасының ұжымы шын жүректен құттықтайды! 🎂✨\n\nСізге арнайы 1 айлық (30 күндік) Tanda Premium сыйлыққа берілді! Барлық кітаптар мен аудиокітаптарды шектеусіз оқып, тыңдауыңызға тілектеспіз! 🎁📚`,
          targetType: 'single',
          targetUserIds: [user.id],
          targetUserNames: [user.name || 'Оқырман'],
          priority: 'important',
          senderName: 'Tanda',
          canReaderDelete: true,
        });

        // Update user state with premium and gift flags
        const updatedUser: User = {
          ...user,
          isPremium: true,
          premiumExpiresAt: newExpiresAt,
          lastBirthdayGreetingYear: currentYear,
          lastBirthdayGiftYear: currentYear,
          lastBirthdayGiftDate: todayStr,
        };

        const allUsers = getStoredUsers();
        const idx = allUsers.findIndex((u) => u.id === user.id);
        if (idx >= 0) {
          allUsers[idx] = updatedUser;
          saveStoredUsers(allUsers);
        }
        useAuthStore.setState({ user: updatedUser });
        return true;
      }
    }
  } catch (err) {
    console.error('Birthday greeting check error:', err);
  }
  return false;
}

const RESERVED_USERNAMES_KEY = 'tanda_reserved_usernames_v1';
const DEFAULT_RESERVED_USERNAMES = [
  'admin',
  'administrator',
  'tanda',
  'tandakz',
  'tanda_kz',
  'tanda_official',
  'support',
  'moderator',
  'help',
  'official',
  'root',
  'system',
  'owner',
  'manager',
  'books',
  'audiobooks',
  'kitap',
];

function getStoredReservedUsernames(): string[] {
  try {
    const raw = localStorage.getItem(RESERVED_USERNAMES_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) {
        return list;
      }
    }
  } catch {}
  saveStoredReservedUsernames(DEFAULT_RESERVED_USERNAMES);
  return DEFAULT_RESERVED_USERNAMES;
}

function saveStoredReservedUsernames(list: string[]) {
  try {
    localStorage.setItem(RESERVED_USERNAMES_KEY, JSON.stringify(list));
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

      getReservedUsernames: (): string[] => {
        return getStoredReservedUsernames();
      },

      addReservedUsername: (username: string) => {
        const clean = username.trim().toLowerCase().replace(/^@/, '');
        if (!clean) {
          return { success: false, error: 'Юзернеймді енгізіңіз' };
        }
        if (clean.length < 3) {
          return { success: false, error: 'Юзернейм кемінде 3 әріптен тұруы керек' };
        }
        if (!/^[a-zA-Z0-9_.]+$/.test(clean)) {
          return { success: false, error: 'Юзернеймде тек ағылшын әріптері, сандар, _ және . рұқсат етілген' };
        }
        const currentList = getStoredReservedUsernames();
        if (currentList.map((u) => u.toLowerCase()).includes(clean)) {
          return { success: false, error: 'Бұл юзернейм тізімде бар' };
        }
        const updated = [clean, ...currentList];
        saveStoredReservedUsernames(updated);
        return { success: true };
      },

      addReservedUsernames: (rawUsernames: string[]) => {
        const currentList = getStoredReservedUsernames();
        const currentSet = new Set(currentList.map((u) => u.toLowerCase()));

        let addedCount = 0;
        let skippedCount = 0;
        let invalidCount = 0;
        const newToAdd: string[] = [];

        rawUsernames.forEach((item) => {
          const clean = item.trim().toLowerCase().replace(/^@/, '');
          if (!clean) return;
          if (clean.length < 3 || !/^[a-zA-Z0-9_.]+$/.test(clean)) {
            invalidCount++;
            return;
          }
          if (currentSet.has(clean)) {
            skippedCount++;
            return;
          }
          currentSet.add(clean);
          newToAdd.push(clean);
          addedCount++;
        });

        if (newToAdd.length > 0) {
          const updated = [...newToAdd, ...currentList];
          saveStoredReservedUsernames(updated);
        }

        return { addedCount, skippedCount, invalidCount };
      },

      removeReservedUsername: (username: string) => {
        const clean = username.trim().toLowerCase().replace(/^@/, '');
        const currentList = getStoredReservedUsernames();
        const updated = currentList.filter((u) => u.toLowerCase() !== clean);
        saveStoredReservedUsernames(updated);
        return { success: true };
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

        // Check if reserved by admin
        const reservedList = getStoredReservedUsernames();
        if (reservedList.map((r) => r.toLowerCase()).includes(trimmed)) {
          const currentUser = get().user;
          const isSuperAdminHoldingIt = currentUser?.isSuperAdmin && currentUser?.username?.toLowerCase() === trimmed;
          if (!isSuperAdminHoldingIt) {
            return { available: false, error: 'Бұл юзернейм бос емес' };
          }
        }

        const effectiveExcludeId = excludeUserId !== undefined ? excludeUserId : get().user?.id;
        const allUsers = getStoredUsers();
        const existing = allUsers.find(
          (u) => (u.username?.toLowerCase() === trimmed) && u.id !== effectiveExcludeId
        );

        if (existing) {
          return { available: false, error: 'Бұл юзернейм бос емес' };
        }

        return { available: true };
      },

      checkIdNumberAvailable: (idNumber: string, excludeUserId?: string) => {
        const trimmed = idNumber.trim();
        if (!trimmed) {
          return { available: false, error: 'ID нөмірін енгізіңіз' };
        }
        const norm = trimmed.replace(/\s+/g, '').toLowerCase();
        const allUsers = getStoredUsers();
        const conflict = allUsers.find(
          (u) => u.id !== excludeUserId && u.idNumber && u.idNumber.replace(/\s+/g, '').toLowerCase() === norm
        );

        if (conflict) {
          return {
            available: false,
            error: `Бұл ID нөмірі (${trimmed}) тіркеліп қойған (${conflict.name || conflict.email})`,
          };
        }

        return { available: true };
      },

      getNextAvailableIdNumber: (): string => {
        const allUsers = getStoredUsers();
        const usedNums = new Set<number>();
        let maxNum = 1000;

        allUsers.forEach((u) => {
          if (u.idNumber) {
            const match = u.idNumber.match(/0000\s*(\d+)/i) || u.idNumber.match(/0001\s*(\d+)/i) || u.idNumber.match(/(\d+)/);
            if (match) {
              let n = parseInt(match[1], 10);
              if (!isNaN(n) && n > 0) {
                if (n < 1000 && u.role === 'client') {
                  n = 1000 + n;
                }
                if (n >= 1001) {
                  usedNums.add(n);
                  if (n > maxNum) maxNum = n;
                }
              }
            }
          }
        });

        let next = 1001;
        while (usedNums.has(next)) {
          next++;
        }
        const candidate = Math.max(next, maxNum + 1);
        return `0000 ${String(candidate).padStart(4, '0')}`;
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
        duty?: string;
        avatarUrl?: string | null;
        idNumber?: string;
        permissions: AdminPermission[];
      }) => {
        const allUsers = getStoredUsers();
        const cleanName = data.name.trim();
        const cleanEmail = data.email.trim().toLowerCase();
        const cleanPassword = data.password?.trim() || '';
        const cleanDuty = data.duty?.trim() || undefined;

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

        let idNum = data.idNumber?.trim();
        if (idNum) {
          const idCheck = get().checkIdNumberAvailable(idNum);
          if (!idCheck.available) {
            return { success: false, error: idCheck.error || 'Бұл ID нөмірі бос емес' };
          }
        } else {
          const adminCount = allUsers.filter((u) => u.role === 'admin').length + 1;
          idNum = `0000 ${String(adminCount).padStart(4, '0')}`;
        }

        const newManager: User = {
          id: `manager-${Date.now()}`,
          idNumber: idNum,
          name: cleanName,
          email: cleanEmail,
          duty: cleanDuty,
          avatarUrl: data.avatarUrl !== undefined ? (data.avatarUrl || DEFAULT_MANAGER_AVATAR) : DEFAULT_MANAGER_AVATAR,
          username: cleanEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') || `admin${Date.now()}`,
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
          duty?: string;
          avatarUrl?: string | null;
          idNumber?: string;
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
        const cleanDuty = data.duty !== undefined ? (data.duty.trim() || undefined) : target.duty;
        const newAvatarUrl = data.avatarUrl !== undefined ? (data.avatarUrl || DEFAULT_MANAGER_AVATAR) : (target.avatarUrl || DEFAULT_MANAGER_AVATAR);
        let cleanIdNumber = data.idNumber !== undefined ? data.idNumber.trim() : target.idNumber;

        if (!cleanName) {
          return { success: false, error: 'Аты-жөнін енгізіңіз' };
        }
        if (!cleanEmail) {
          return { success: false, error: 'Электронды поштасын енгізіңіз' };
        }
        if (!data.permissions || data.permissions.length === 0) {
          return { success: false, error: 'Кем дегенде бір рұқсатты таңдаңыз' };
        }

        if (cleanIdNumber && cleanIdNumber !== target.idNumber) {
          const idCheck = get().checkIdNumberAvailable(cleanIdNumber, userId);
          if (!idCheck.available) {
            return { success: false, error: idCheck.error || 'Бұл ID нөмірі бос емес' };
          }
        } else if (!cleanIdNumber) {
          cleanIdNumber = target.idNumber;
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
          duty: cleanDuty,
          avatarUrl: newAvatarUrl,
          idNumber: cleanIdNumber || target.idNumber,
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

      getAllAuthors: (): User[] => {
        const allUsers = getStoredUsers();
        return allUsers.filter((u) => u.role === 'author' || u.isAuthor === true);
      },

      createAuthorByAdmin: async (data: {
        name: string;
        email: string;
        password?: string;
        phone?: string;
        idNumber?: string;
        avatarUrl?: string | null;
        assignedAuthorName?: string;
        assignedBookIds?: string[];
      }) => {
        const allUsers = getStoredUsers();
        const cleanName = data.name.trim();
        const cleanEmail = data.email.trim().toLowerCase();
        const cleanPassword = data.password?.trim() || '';
        const cleanPhone = data.phone?.trim() || undefined;
        const cleanAssignedAuthorName = data.assignedAuthorName?.trim() || cleanName;

        if (!cleanName) {
          return { success: false, error: 'Автордың аты-жөнін енгізіңіз' };
        }
        if (!cleanEmail) {
          return { success: false, error: 'Электронды поштасын енгізіңіз' };
        }

        // Check if email already exists
        const emailConflict = allUsers.find(
          (u) => u.email.toLowerCase() === cleanEmail
        );
        if (emailConflict) {
          return { success: false, error: 'Бұл электронды поштамен пайдаланушы тіркеліп қойған' };
        }

        let idNum = data.idNumber?.trim();
        if (idNum) {
          const idCheck = get().checkIdNumberAvailable(idNum);
          if (!idCheck.available) {
            return { success: false, error: idCheck.error || 'Бұл ID нөмірі бос емес' };
          }
        } else {
          const authorCount = allUsers.filter((u) => u.role === 'author' || u.isAuthor === true).length + 1;
          idNum = `0000 ${String(authorCount).padStart(4, '0')}`;
        }

        const newAuthor: User = {
          id: `author-${Date.now()}`,
          idNumber: idNum,
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          duty: 'Автор',
          avatarUrl: data.avatarUrl !== undefined ? (data.avatarUrl || DEFAULT_MANAGER_AVATAR) : DEFAULT_MANAGER_AVATAR,
          username: cleanEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') || `author${Date.now()}`,
          role: 'author',
          isAuthor: true,
          assignedAuthorName: cleanAssignedAuthorName,
          assignedBookIds: data.assignedBookIds || [],
          isActive: true,
          hasPassword: !!cleanPassword,
          password: cleanPassword || undefined,
          authProvider: cleanEmail.includes('@gmail.com') ? 'GOOGLE' : 'LOCAL',
          createdAt: new Date().toISOString(),
        };

        allUsers.push(newAuthor);
        saveStoredUsers(allUsers);

        return { success: true, user: newAuthor };
      },

      updateAuthorByAdmin: async (
        userId: string,
        data: {
          name: string;
          email: string;
          password?: string;
          phone?: string;
          idNumber?: string;
          avatarUrl?: string | null;
          assignedAuthorName?: string;
          assignedBookIds?: string[];
          isActive?: boolean;
        }
      ) => {
        const allUsers = getStoredUsers();
        const existingIdx = allUsers.findIndex((u) => u.id === userId);
        if (existingIdx === -1) {
          return { success: false, error: 'Автор табылмады' };
        }

        const target = allUsers[existingIdx];
        const cleanName = data.name.trim();
        const cleanEmail = data.email.trim().toLowerCase();
        const cleanPhone = data.phone !== undefined ? (data.phone.trim() || undefined) : target.phone;
        const cleanAssignedAuthorName = data.assignedAuthorName !== undefined ? (data.assignedAuthorName.trim() || cleanName) : (target.assignedAuthorName || cleanName);
        const newAvatarUrl = data.avatarUrl !== undefined ? (data.avatarUrl || DEFAULT_MANAGER_AVATAR) : (target.avatarUrl || DEFAULT_MANAGER_AVATAR);
        let cleanIdNumber = data.idNumber !== undefined ? data.idNumber.trim() : target.idNumber;

        if (!cleanName) {
          return { success: false, error: 'Автордың аты-жөнін енгізіңіз' };
        }
        if (!cleanEmail) {
          return { success: false, error: 'Электронды поштасын енгізіңіз' };
        }

        if (cleanIdNumber && cleanIdNumber !== target.idNumber) {
          const idCheck = get().checkIdNumberAvailable(cleanIdNumber, userId);
          if (!idCheck.available) {
            return { success: false, error: idCheck.error || 'Бұл ID нөмірі бос емес' };
          }
        }

        if (cleanEmail !== target.email.toLowerCase()) {
          const conflict = allUsers.find(
            (u) => u.id !== userId && u.email.toLowerCase() === cleanEmail
          );
          if (conflict) {
            return { success: false, error: 'Бұл электронды поштамен басқа пайдаланушы тіркелген' };
          }
        }

        const updatedAuthor: User = {
          ...target,
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          duty: 'Автор',
          avatarUrl: newAvatarUrl,
          idNumber: cleanIdNumber || target.idNumber,
          assignedAuthorName: cleanAssignedAuthorName,
          assignedBookIds: data.assignedBookIds !== undefined ? data.assignedBookIds : target.assignedBookIds,
          isActive: data.isActive !== undefined ? data.isActive : target.isActive,
          role: 'author',
          isAuthor: true,
        };

        if (data.password !== undefined && data.password.trim()) {
          updatedAuthor.password = data.password.trim();
          updatedAuthor.hasPassword = true;
        }

        allUsers[existingIdx] = updatedAuthor;
        saveStoredUsers(allUsers);

        if (get().user?.id === userId) {
          set({ user: updatedAuthor, role: 'author' });
        }

        return { success: true };
      },

      deleteAuthor: async (userId: string) => {
        const allUsers = getStoredUsers();
        const existingIdx = allUsers.findIndex((u) => u.id === userId);
        if (existingIdx === -1) {
          return { success: false, error: 'Автор табылмады' };
        }

        allUsers.splice(existingIdx, 1);
        saveStoredUsers(allUsers);
        return { success: true };
      },

      updateUserByAdmin: async (
        userId: string,
        data: {
          name: string;
          firstName?: string;
          lastName?: string;
          email: string;
          phone?: string;
          password?: string;
          username?: string;
          idNumber?: string;
          birthDate?: string;
          role?: 'admin' | 'client' | 'author';
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
        const cleanFirstName = data.firstName !== undefined ? data.firstName.trim() : targetUser.firstName;
        const cleanLastName = data.lastName !== undefined ? data.lastName.trim() : targetUser.lastName;
        const cleanEmail = data.email.trim().toLowerCase();
        const cleanPhone = data.phone?.trim() || '';
        const rawUsername = data.username?.trim().toLowerCase().replace(/^@/, '') || '';
        const cleanIdNumber = data.idNumber?.trim() || targetUser.idNumber;
        const cleanRole = data.role || targetUser.role;
        const cleanPassword = data.password ? data.password.trim() : undefined;
        const cleanBirthDate = data.birthDate !== undefined ? (data.birthDate.trim() || undefined) : targetUser.birthDate;

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

        // Validate ID number uniqueness
        if (cleanIdNumber) {
          const idCheck = get().checkIdNumberAvailable(cleanIdNumber, userId);
          if (!idCheck.available) {
            return { success: false, error: idCheck.error || 'Бұл ID нөмірі басқа оқырманға тіркелген' };
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
          firstName: cleanFirstName || undefined,
          lastName: cleanLastName || undefined,
          email: cleanEmail,
          phone: cleanPhone,
          birthDate: cleanBirthDate,
          username: rawUsername || undefined,
          idNumber: cleanIdNumber,
          role: cleanRole,
          isActive: data.isActive !== undefined ? data.isActive : targetUser.isActive,
          password: cleanPassword !== undefined ? (cleanPassword || targetUser.password) : targetUser.password,
          hasPassword: cleanPassword ? true : targetUser.hasPassword,
          personalMessage: updatedPersonalMessage,
        };

        // Update registry
        allUsers[existingIdx] = updatedUser;
        saveStoredUsers(allUsers);

        // If the current logged-in user in session is this user
        const currentUser = get().user;
        if (currentUser && currentUser.id === userId) {
          if (updatedUser.isActive === false) {
            get().logout();
          } else {
            set({ user: updatedUser, role: updatedUser.role });
          }
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('tanda:user-status-changed', {
              detail: { userId, isActive: updatedUser.isActive !== false },
            })
          );
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

      grantBirthdayGiftManually: async (userId: string) => {
        const allUsers = getStoredUsers();
        const idx = allUsers.findIndex((u) => u.id === userId);
        if (idx === -1) {
          return { success: false, error: 'Оқырман табылмады' };
        }

        const targetUser = allUsers[idx];
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
        const currentDay = String(today.getDate()).padStart(2, '0');
        const todayStr = `${currentYear}-${currentMonth}-${currentDay}`;

        const baseTime = (targetUser.isPremium && targetUser.premiumExpiresAt && new Date(targetUser.premiumExpiresAt).getTime() > Date.now())
          ? new Date(targetUser.premiumExpiresAt).getTime()
          : Date.now();
        const newExpiresAt = new Date(baseTime + 30 * 24 * 60 * 60 * 1000).toISOString();

        // Send celebratory message
        useMessageStore.getState().sendMessage({
          title: `🎉 Туған күніңіз құтты болсын, ${targetUser.name || 'құрметті оқырман'}!`,
          content: `Құрметті ${targetUser.name || 'оқырман'}! Сізді бүгінгі жеке мерекеңіз — туған күніңізбен Tanda онлайн кітапханасының ұжымы шын жүректен құттықтайды! 🎂✨\n\nСізге арнайы 1 айлық (30 күндік) Tanda Premium сыйлыққа берілді! Барлық кітаптар мен аудиокітаптарды шектеусіз оқып, тыңдауыңызға тілектеспіз! 🎁📚`,
          targetType: 'single',
          targetUserIds: [targetUser.id],
          targetUserNames: [targetUser.name || 'Оқырман'],
          priority: 'important',
          senderName: 'Tanda',
          canReaderDelete: true,
        });

        const updatedUser: User = {
          ...targetUser,
          isPremium: true,
          premiumExpiresAt: newExpiresAt,
          lastBirthdayGreetingYear: currentYear,
          lastBirthdayGiftYear: currentYear,
          lastBirthdayGiftDate: todayStr,
        };

        allUsers[idx] = updatedUser;
        saveStoredUsers(allUsers);

        const currentUser = get().user;
        if (currentUser && currentUser.id === userId) {
          set({ user: updatedUser });
        }

        return { success: true };
      },

      resetBirthdayGiftHistory: async (userId: string) => {
        const allUsers = getStoredUsers();
        const idx = allUsers.findIndex((u) => u.id === userId);
        if (idx === -1) {
          return { success: false, error: 'Оқырман табылмады' };
        }

        const targetUser = allUsers[idx];
        const updatedUser: User = {
          ...targetUser,
          lastBirthdayGreetingYear: undefined,
          lastBirthdayGiftYear: undefined,
          lastBirthdayGiftDate: undefined,
        };

        allUsers[idx] = updatedUser;
        saveStoredUsers(allUsers);

        const currentUser = get().user;
        if (currentUser && currentUser.id === userId) {
          set({ user: updatedUser });
        }

        return { success: true };
      },

      toggleBlockUser: async (userId: string) => {
        const allUsers = getStoredUsers();
        const idx = allUsers.findIndex((u) => u.id === userId);
        if (idx === -1) {
          return { success: false, error: 'Оқырман табылмады' };
        }

        const current = allUsers[idx];
        const newIsActive = current.isActive === false ? true : false;
        const updated: User = {
          ...current,
          isActive: newIsActive,
        };

        allUsers[idx] = updated;
        saveStoredUsers(allUsers);

        // If the current user was blocked, immediately logout!
        const currentUser = get().user;
        if (currentUser && currentUser.id === userId && !newIsActive) {
          get().logout();
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('tanda:user-status-changed', {
              detail: { userId, isActive: newIsActive },
            })
          );
        }

        return { success: true, isBlocked: !newIsActive };
      },

      createReaderByAdmin: async (data: {
        name: string;
        firstName?: string;
        lastName?: string;
        email: string;
        phone?: string;
        password?: string;
        username?: string;
        idNumber?: string;
        birthDate?: string;
        role?: 'admin' | 'client' | 'author';
        personalMessage?: { text: string; days?: number; isActive?: boolean };
      }) => {
        const allUsers = getStoredUsers();
        const cleanName = data.name.trim();
        const cleanFirstName = data.firstName?.trim() || undefined;
        const cleanLastName = data.lastName?.trim() || undefined;
        const cleanEmail = data.email.trim().toLowerCase();
        const cleanPhone = data.phone?.trim() || '';
        const rawUsername = data.username?.trim().toLowerCase().replace(/^@/, '') || '';
        const cleanRole = data.role || 'client';
        const cleanBirthDate = data.birthDate?.trim() || undefined;

        if (!cleanName) {
          return { success: false, error: 'Аты-жөнін енгізіңіз' };
        }
        if (!cleanEmail) {
          return { success: false, error: 'Электронды поштасын енгізіңіз' };
        }

        // Validate email uniqueness against all users (including blocked)
        const emailConflict = allUsers.find(
          (u) => u.email.toLowerCase() === cleanEmail
        );
        if (emailConflict) {
          if (emailConflict.isActive === false) {
            return { success: false, error: 'Бұл электронды пошта жүйеде бұғатталған оқырманға тиесілі' };
          }
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
            if (phoneConflict.isActive === false) {
              return { success: false, error: 'Бұл телефон нөмірі жүйеде бұғатталған оқырманға тиесілі' };
            }
            return { success: false, error: 'Бұл телефон нөмірімен басқа оқырман тіркелген' };
          }
        }

        // Validate username uniqueness if provided
        if (rawUsername) {
          const check = get().checkUsernameAvailable(rawUsername);
          if (!check.available) {
            return { success: false, error: check.error || 'Бұл пайдаланушы аты (username) тіркеліп қойған' };
          }
        }

        // Validate or Generate unique ID Number
        let idNumber = data.idNumber?.trim();
        if (!idNumber) {
          idNumber = get().getNextAvailableIdNumber();
        } else {
          const idCheck = get().checkIdNumberAvailable(idNumber);
          if (!idCheck.available) {
            return { success: false, error: idCheck.error || 'Бұл ID нөмірі басқа оқырманға тіркелген' };
          }
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
          firstName: cleanFirstName,
          lastName: cleanLastName,
          email: cleanEmail,
          phone: cleanPhone || undefined,
          birthDate: cleanBirthDate,
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

      updateProfile: async (data: {
        name: string;
        email: string;
        phone?: string;
        username?: string;
        birthDate?: string;
        gender?: 'male' | 'female' | 'other';
        avatarUrl?: string;
      }) => {
        const currentUser = get().user;
        if (!currentUser) {
          return { success: false, error: 'Жүйеге кірмегенсіз' };
        }

        const cleanName = data.name.trim();
        const cleanEmail = data.email.trim().toLowerCase();
        const cleanPhone = data.phone?.trim() || '';
        const rawUsername = data.username?.trim().toLowerCase().replace(/^@/, '') || '';
        const cleanBirthDate = data.birthDate !== undefined ? (data.birthDate.trim() || undefined) : currentUser.birthDate;
        const cleanGender = data.gender !== undefined ? (data.gender || undefined) : currentUser.gender;
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
          birthDate: cleanBirthDate,
          gender: cleanGender,
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

        // Trigger birthday greeting check if birthDate was set
        checkAndSendBirthdayGreeting(updatedUser);

        // Optional sync with backend
        try {
          await api.put('/api/auth/profile', {
            name: cleanName,
            email: cleanEmail,
            phone: cleanPhone,
            username: rawUsername,
            birthDate: cleanBirthDate || null,
            gender: cleanGender || null,
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

          if (data.user?.isActive === false) {
            throw new Error('Сіздің аккаунтыңыз әкімші тарапынан бұғатталған. Жүйеге кіре алмайсыз.');
          }

          localStorage.setItem('tanda_token', data.token);
          set({
            user: data.user,
            role: data.user.role as 'admin' | 'client',
            isAuthenticated: true,
            authModalOpen: false,
          });
        } catch (err: any) {
          if (err.message && err.message.includes('бұғатталған')) {
            throw err;
          }

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

          if (matched && matched.isActive === false) {
            throw new Error('Сіздің аккаунтыңыз әкімші тарапынан бұғатталған. Жүйеге кіре алмайсыз.');
          }

          if (!matched) {
            const isAdmin = trimmed.includes('admin') || trimmed === 'admin@tanda.kz';
            matched = {
              id: isAdmin ? '001007' : `user-${Date.now()}`,
              idNumber: isAdmin ? '0000 0001' : get().getNextAvailableIdNumber(),
              name: isAdmin ? 'Әкімші' : 'Оқырман',
              email: trimmed.includes('@') ? trimmed : `${trimmed}@tanda.kz`,
              username: isAdmin ? 'admin' : (trimmed.includes('@') ? trimmed.split('@')[0] : trimmed),
              phone: phoneNational ? formatPhoneNumber(trimmed) : undefined,
              role: isAdmin ? 'admin' : 'client',
              avatarUrl: isAdmin ? undefined : DEFAULT_READER_AVATAR,
              isActive: true,
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
          if (data.user?.isActive === false) {
            throw new Error('Сіздің аккаунтыңыз әкімші тарапынан бұғатталған. Жүйеге кіре алмайсыз.');
          }

          localStorage.setItem('tanda_token', data.token);
          set({
            user: data.user,
            role: data.user.role as 'admin' | 'client',
            isAuthenticated: true,
            authModalOpen: false,
          });
        } catch (err: any) {
          if (err.message && err.message.includes('бұғатталған')) {
            throw err;
          }

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

          if (matched && matched.isActive === false) {
            throw new Error('Сіздің аккаунтыңыз әкімші тарапынан бұғатталған. Жүйеге кіре алмайсыз.');
          }

          if (!matched) {
            const idNum = get().getNextAvailableIdNumber();
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
              isActive: true,
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

        // Check if email belongs to any registered or blocked user
        const allUsers = getStoredUsers();
        const existingUser = allUsers.find((u) => u.email.toLowerCase() === trimmedEmail);
        if (existingUser) {
          set({ isLoading: false });
          if (existingUser.isActive === false) {
            throw new Error('Бұл электрондық пошта жүйеде бұғатталған. Жаңа аккаунт ашуға рұқсат етілмейді.');
          }
          throw new Error('Бұл электрондық поштамен аккаунт тіркелген. Жүйеге кіру бөлімін пайдаланыңыз.');
        }

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
        } catch (err: any) {
          if (err.message && (err.message.includes('бұғатталған') || err.message.includes('тіркелген'))) {
            throw err;
          }

          // Fallback mock registration
          const idNum = get().getNextAvailableIdNumber();
          const count = allUsers.filter((u) => u.role === 'client').length + 1;
          const defaultUsername = trimmedEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') || `user${count}`;

          const mockUser: User = {
            id: `user-${Date.now()}`,
            idNumber: idNum,
            name: name.trim() || 'Оқырман',
            email: trimmedEmail,
            username: defaultUsername,
            role: 'client',
            avatarUrl: DEFAULT_READER_AVATAR,
            isActive: true,
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
