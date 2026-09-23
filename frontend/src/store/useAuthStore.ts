import { create } from 'zustand';
import { api } from '../lib/api';
import { User, AdminPermission } from '../types';

interface AuthState {
  user: User | null;
  role: 'admin' | 'client' | 'author';
  isAuthenticated: boolean;
  isAuthInitialized: boolean;
  isLoading: boolean;
  authModalOpen: boolean;
  authModalMode: 'login' | 'signup';

  clients: User[];
  managers: User[];
  authors: User[];
  reservedUsernames: string[];

  login: (email: string, password: string) => Promise<void>;
  loginAsAdmin: () => Promise<void>;
  loginAsClient: (email?: string, name?: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  sendVerificationCode: (email: string, type?: 'REGISTER' | 'RESET_PASSWORD') => Promise<{ success: boolean; message: string; cooldown: number }>;
  register: (name: string, email: string, password: string, code?: string) => Promise<void>;
  logout: () => void;
  restoreSession: () => Promise<void>;
  updateProfile: (data: { name: string; email: string; phone?: string; username?: string; birthDate?: string; gender?: 'male' | 'female' | 'other'; avatarUrl?: string }) => Promise<{ success: boolean; error?: string }>;
  updateAvatar: (avatarUrl: string | null) => Promise<{ success: boolean; error?: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  updateUserByAdmin: (userId: string, data: { name: string; firstName?: string; lastName?: string; email: string; phone?: string; password?: string; username?: string; idNumber?: string; birthDate?: string; role?: 'admin' | 'client' | 'author'; isActive?: boolean; personalMessage?: { text: string; days?: number; isActive?: boolean } | null }) => Promise<{ success: boolean; user?: User; error?: string }>;
  toggleBlockUser: (userId: string) => Promise<{ success: boolean; isBlocked?: boolean; error?: string }>;
  createReaderByAdmin: (data: { name: string; firstName?: string; lastName?: string; email: string; phone?: string; password?: string; username?: string; idNumber?: string; birthDate?: string; role?: 'admin' | 'client' | 'author'; personalMessage?: { text: string; days?: number; isActive?: boolean } }) => Promise<{ success: boolean; user?: User; error?: string }>;
  deleteUser: (userId: string) => Promise<{ success: boolean; error?: string }>;
  grantBirthdayGiftManually: (userId: string) => Promise<{ success: boolean; error?: string }>;
  resetBirthdayGiftHistory: (userId: string) => Promise<{ success: boolean; error?: string }>;
  getUserById: (userId: string) => User | undefined;
  fetchClients: (search?: string) => Promise<User[]>;
  getAllClients: () => User[];
  getClientsCount: () => number;
  checkUsernameAvailable: (username: string, excludeUserId?: string) => { available: boolean; error?: string };
  checkIdNumberAvailable: (idNumber: string, excludeUserId?: string) => { available: boolean; error?: string };
  getNextAvailableIdNumber: () => string;

  // Reserved usernames (Бұғатталған/резервтелген юзернеймдер)
  fetchReservedUsernames: () => Promise<string[]>;
  getReservedUsernames: () => string[];
  addReservedUsername: (username: string) => Promise<{ success: boolean; error?: string }>;
  addReservedUsernames: (usernames: string[]) => Promise<{ addedCount: number; skippedCount: number; invalidCount: number; error?: string }>;
  removeReservedUsername: (username: string) => Promise<{ success: boolean; error?: string }>;

  // Manager (Көмекші / Басқару) operations
  fetchManagers: () => Promise<User[]>;
  getAllManagers: () => User[];
  createManagerByAdmin: (data: { name: string; email: string; password?: string; duty?: string; avatarUrl?: string | null; idNumber?: string; permissions: AdminPermission[] }) => Promise<{ success: boolean; user?: User; error?: string }>;
  updateManagerPermissions: (userId: string, data: { name: string; email: string; password?: string; duty?: string; avatarUrl?: string | null; idNumber?: string; permissions: AdminPermission[]; isActive?: boolean }) => Promise<{ success: boolean; error?: string }>;
  deleteManager: (userId: string) => Promise<{ success: boolean; error?: string }>;

  // Author (Авторлар) operations
  fetchAuthors: () => Promise<User[]>;
  getAllAuthors: () => User[];
  createAuthorByAdmin: (data: { name: string; email: string; password?: string; phone?: string; idNumber?: string; avatarUrl?: string | null; assignedAuthorName?: string; assignedBookIds?: string[] }) => Promise<{ success: boolean; user?: User; error?: string }>;
  updateAuthorByAdmin: (userId: string, data: { name: string; email: string; password?: string; phone?: string; idNumber?: string; avatarUrl?: string | null; assignedAuthorName?: string; assignedBookIds?: string[]; isActive?: boolean }) => Promise<{ success: boolean; error?: string }>;
  deleteAuthor: (userId: string) => Promise<{ success: boolean; error?: string }>;

  // Modal helpers
  openAuthModal: (mode?: 'login' | 'signup') => void;
  closeAuthModal: () => void;
}

export const DEFAULT_READER_AVATAR = '/default-reader-avatar.jpg';
export const DEFAULT_MANAGER_AVATAR = '/default-manager-avatar.jpg';

function toAuthorUser(a: any): User {
  return {
    id: a.userId || a.id,
    authorId: a.id,
    name: a.name || '',
    email: a.email || '',
    phone: a.phone || undefined,
    idNumber: a.idNumber || undefined,
    avatarUrl: a.avatarUrl || DEFAULT_MANAGER_AVATAR,
    assignedAuthorName: a.assignedAuthorName || a.name || '',
    assignedBookIds: a.bookIds || a.assignedBookIds || [],
    role: 'author',
    isAuthor: true,
    duty: 'Автор',
    isActive: a.isActive !== false,
    createdAt: a.createdAt,
  };
}

export const useAuthStore = create<AuthState>()((set, get) => ({
      user: null,
      role: 'client',
      isAuthenticated: false,
      isAuthInitialized: false,
      isLoading: false,
      authModalOpen: false,
      authModalMode: 'login',

      openAuthModal: (mode = 'login') => {
        set({ authModalOpen: true, authModalMode: mode });
      },

      closeAuthModal: () => {
        set({ authModalOpen: false });
      },

      clients: [],
      managers: [],
      authors: [],
      reservedUsernames: [],

      fetchClients: async (search?: string) => {
        try {
          const params: any = { role: 'client' };
          if (search) params.search = search;
          const { data } = await api.get('/api/v1/admin/users', { params });
          const list: User[] = Array.isArray(data) ? data : [];
          set({ clients: list });
          return list;
        } catch (err) {
          console.error('Failed to fetch clients:', err);
          return get().clients;
        }
      },

      getAllClients: (): User[] => {
        const list = get().clients;
        if (list.length === 0 && get().isAuthenticated && get().role === 'admin') {
          get().fetchClients();
        }
        return list;
      },

      getClientsCount: (): number => {
        return get().clients.length;
      },

      fetchManagers: async () => {
        try {
          const { data } = await api.get('/api/v1/admin/managers');
          const list: User[] = Array.isArray(data) ? data : [];
          set({ managers: list });
          return list;
        } catch {
          return get().managers;
        }
      },

      getAllManagers: (): User[] => {
        const list = get().managers;
        if (list.length === 0 && get().isAuthenticated && get().role === 'admin') {
          get().fetchManagers();
        }
        return list;
      },

      fetchAuthors: async () => {
        try {
          const { data } = await api.get('/api/v1/admin/authors');
          const list: User[] = Array.isArray(data) ? data.map(toAuthorUser) : [];
          set({ authors: list });
          return list;
        } catch {
          return get().authors;
        }
      },

      getAllAuthors: (): User[] => {
        const list = get().authors;
        if (list.length === 0) {
          get().fetchAuthors();
        }
        return list;
      },

      fetchReservedUsernames: async () => {
        try {
          const { data } = await api.get('/api/v1/admin/usernames/reserved');
          const list: string[] = Array.isArray(data) ? data : [];
          set({ reservedUsernames: list });
          return list;
        } catch {
          return get().reservedUsernames;
        }
      },

      getReservedUsernames: (): string[] => {
        const list = get().reservedUsernames;
        if (list.length === 0 && get().isAuthenticated && get().role === 'admin') {
          get().fetchReservedUsernames();
        }
        return list;
      },

      addReservedUsername: async (username: string) => {
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
        try {
          await api.post('/api/v1/admin/usernames/reserved', { username: clean });
          set((state) => ({
            reservedUsernames: state.reservedUsernames.includes(clean)
              ? state.reservedUsernames
              : [clean, ...state.reservedUsernames],
          }));
          return { success: true };
        } catch (err: any) {
          return {
            success: false,
            error: err.response?.data?.message || err.message || 'Юзернеймді қосу сәтсіз аяқталды',
          };
        }
      },

      addReservedUsernames: async (rawUsernames: string[]) => {
        const validList: string[] = [];
        let invalidCount = 0;

        rawUsernames.forEach((item) => {
          const clean = item.trim().toLowerCase().replace(/^@/, '');
          if (!clean) return;
          if (clean.length < 3 || !/^[a-zA-Z0-9_.]+$/.test(clean)) {
            invalidCount++;
            return;
          }
          validList.push(clean);
        });

        if (validList.length === 0) {
          return { addedCount: 0, skippedCount: 0, invalidCount };
        }

        try {
          await api.post('/api/v1/admin/usernames/reserved', { usernames: validList });
          const { data } = await api.get('/api/v1/admin/usernames/reserved');
          const updatedList: string[] = Array.isArray(data) ? data : [];
          const prevSet = new Set(get().reservedUsernames.map((u) => u.toLowerCase()));
          let addedCount = 0;
          let skippedCount = 0;
          validList.forEach((u) => {
            if (prevSet.has(u)) skippedCount++;
            else addedCount++;
          });
          set({ reservedUsernames: updatedList });
          return { addedCount, skippedCount, invalidCount };
        } catch (err: any) {
          return {
            addedCount: 0,
            skippedCount: 0,
            invalidCount,
            error: err.response?.data?.message || err.message || 'Юзернеймдерді қосу сәтсіз аяқталды',
          };
        }
      },

      removeReservedUsername: async (username: string) => {
        const clean = username.trim().toLowerCase().replace(/^@/, '');
        try {
          await api.delete(`/api/v1/admin/usernames/reserved/${encodeURIComponent(clean)}`);
          set((state) => ({
            reservedUsernames: state.reservedUsernames.filter((u) => u.toLowerCase() !== clean),
          }));
          return { success: true };
        } catch (err: any) {
          return {
            success: false,
            error: err.response?.data?.message || err.message || 'Юзернеймді өшіру сәтсіз аяқталды',
          };
        }
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

        // Check if reserved
        const reservedList = get().reservedUsernames;
        if (reservedList.map((r) => r.toLowerCase()).includes(trimmed)) {
          const currentUser = get().user;
          const isSuperAdminHoldingIt = currentUser?.isSuperAdmin && currentUser?.username?.toLowerCase() === trimmed;
          if (!isSuperAdminHoldingIt) {
            return { available: false, error: 'Бұл юзернейм бос емес' };
          }
        }

        const effectiveExcludeId = excludeUserId !== undefined ? excludeUserId : get().user?.id;
        const allKnown = [...get().clients, ...get().managers, ...get().authors];
        const existing = allKnown.find(
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
        const allKnown = [...get().clients, ...get().managers, ...get().authors];
        const conflict = allKnown.find(
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
        const allClients = get().clients;
        const usedNums = new Set<number>();
        let maxNum = 1000;

        allClients.forEach((u) => {
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
        const allKnown = [...get().clients, ...get().managers, ...get().authors];
        return allKnown.find((u) => u.id === userId || (u as any).authorId === userId);
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
        try {
          const { data: newManager } = await api.post('/api/v1/admin/managers', {
            name: data.name.trim(),
            email: data.email.trim().toLowerCase(),
            password: data.password?.trim() || null,
            duty: data.duty?.trim() || null,
            idNumber: data.idNumber?.trim() || null,
            avatarUrl: data.avatarUrl || DEFAULT_MANAGER_AVATAR,
            permissions: data.permissions,
          });
          set((state) => ({
            managers: [...state.managers, newManager],
          }));
          return { success: true, user: newManager };
        } catch (err: any) {
          return {
            success: false,
            error: err.response?.data?.message || err.message || 'Көмекшіні қосу сәтсіз аяқталды',
          };
        }
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
        try {
          const { data: updated } = await api.patch(`/api/v1/admin/managers/${userId}`, {
            name: data.name.trim(),
            email: data.email.trim().toLowerCase(),
            password: data.password?.trim() || null,
            duty: data.duty?.trim() || null,
            idNumber: data.idNumber?.trim() || null,
            avatarUrl: data.avatarUrl || DEFAULT_MANAGER_AVATAR,
            permissions: data.permissions,
            isActive: data.isActive,
          });
          set((state) => ({
            managers: state.managers.map((m) => (m.id === userId ? updated : m)),
            user: state.user?.id === userId ? { ...state.user, ...updated } : state.user,
          }));
          return { success: true, user: updated };
        } catch (err: any) {
          return {
            success: false,
            error: err.response?.data?.message || err.message || 'Көмекшіні жаңарту сәтсіз аяқталды',
          };
        }
      },

      deleteManager: async (userId: string) => {
        try {
          await api.delete(`/api/v1/admin/managers/${userId}`);
          set((state) => ({
            managers: state.managers.filter((m) => m.id !== userId),
          }));
          return { success: true };
        } catch (err: any) {
          return {
            success: false,
            error: err.response?.data?.message || err.message || 'Көмекшіні өшіру сәтсіз аяқталды',
          };
        }
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
        try {
          const { data: res } = await api.post('/api/v1/admin/authors', {
            name: data.name.trim(),
            email: data.email.trim().toLowerCase(),
            password: data.password?.trim() || null,
            phone: data.phone?.trim() || null,
            idNumber: data.idNumber?.trim() || null,
            avatarUrl: data.avatarUrl || DEFAULT_MANAGER_AVATAR,
            assignedAuthorName: data.assignedAuthorName?.trim() || data.name.trim(),
            assignedBookIds: data.assignedBookIds || [],
          });
          const newAuthorUser = toAuthorUser(res);
          set((state) => ({
            authors: [...state.authors, newAuthorUser],
          }));
          return { success: true, user: newAuthorUser };
        } catch (err: any) {
          return {
            success: false,
            error: err.response?.data?.message || err.message || 'Авторды қосу сәтсіз аяқталды',
          };
        }
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
        try {
          const { data: res } = await api.patch(`/api/v1/admin/authors/${userId}`, {
            name: data.name.trim(),
            email: data.email.trim().toLowerCase(),
            password: data.password?.trim() || null,
            phone: data.phone?.trim() || null,
            idNumber: data.idNumber?.trim() || null,
            avatarUrl: data.avatarUrl || DEFAULT_MANAGER_AVATAR,
            assignedAuthorName: data.assignedAuthorName?.trim() || data.name.trim(),
            assignedBookIds: data.assignedBookIds || [],
            isActive: data.isActive,
          });
          const updated = toAuthorUser(res);
          set((state) => ({
            authors: state.authors.map((a) => (a.id === userId || (a as any).authorId === userId ? updated : a)),
          }));
          return { success: true, user: updated };
        } catch (err: any) {
          return {
            success: false,
            error: err.response?.data?.message || err.message || 'Авторды жаңарту сәтсіз аяқталды',
          };
        }
      },

      deleteAuthor: async (userId: string) => {
        try {
          await api.delete(`/api/v1/admin/authors/${userId}`);
          set((state) => ({
            authors: state.authors.filter((a) => a.id !== userId && (a as any).authorId !== userId),
          }));
          return { success: true };
        } catch (err: any) {
          return {
            success: false,
            error: err.response?.data?.message || err.message || 'Авторды өшіру сәтсіз аяқталды',
          };
        }
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
        const cleanName = data.name.trim();
        const cleanEmail = data.email.trim().toLowerCase();
        const rawUsername = data.username?.trim().toLowerCase().replace(/^@/, '') || '';

        try {
          const { data: updatedData } = await api.patch(`/api/v1/admin/users/${userId}`, {
            name: cleanName,
            email: cleanEmail,
            phone: data.phone?.trim() || null,
            password: data.password ? data.password.trim() : null,
            username: rawUsername || null,
            idNumber: data.idNumber?.trim() || null,
            birthDate: data.birthDate?.trim() || null,
            role: data.role,
            isActive: data.isActive,
            personalMessage: data.personalMessage?.text || null,
            personalMessageDays: data.personalMessage?.days || null,
            personalMessageActive: data.personalMessage?.isActive,
          });

          set((state) => ({
            clients: state.clients.map((u) => (u.id === userId ? { ...u, ...updatedData } : u)),
            user: state.user?.id === userId ? { ...state.user, ...updatedData } : state.user,
          }));

          const currentUser = get().user;
          if (currentUser && currentUser.id === userId && updatedData.isActive === false) {
            get().logout();
          }

          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('tanda:user-status-changed', {
                detail: { userId, isActive: updatedData.isActive !== false },
              })
            );
          }

          return { success: true, user: updatedData };
        } catch (err: any) {
          return {
            success: false,
            error: err.response?.data?.message || err.message || 'Оқырман деректерін сақтау сәтсіз аяқталды',
          };
        }
      },

      grantBirthdayGiftManually: async (userId: string) => {
        try {
          await api.post(`/api/v1/admin/users/${userId}/birthday-gift`);
          await get().fetchClients();
          return { success: true };
        } catch (err: any) {
          return {
            success: false,
            error: err.response?.data?.message || err.message || 'Сыйлық қосу сәтсіз аяқталды',
          };
        }
      },

      resetBirthdayGiftHistory: async (userId: string) => {
        set((state) => ({
          clients: state.clients.map((u) =>
            u.id === userId
              ? {
                  ...u,
                  lastBirthdayGreetingYear: undefined,
                  lastBirthdayGiftYear: undefined,
                  lastBirthdayGiftDate: undefined,
                }
              : u
          ),
        }));
        return { success: true };
      },

      toggleBlockUser: async (userId: string) => {
        try {
          const { data } = await api.patch(`/api/v1/admin/users/${userId}/block`);
          const newIsActive = data.isActive !== false && !data.isBlocked;

          set((state) => ({
            clients: state.clients.map((u) => (u.id === userId ? { ...u, ...data, isActive: newIsActive } : u)),
            user: state.user?.id === userId ? { ...state.user, ...data, isActive: newIsActive } : state.user,
          }));

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
        } catch (err: any) {
          return {
            success: false,
            error: err.response?.data?.message || err.message || 'Бұғаттау сәтсіз аяқталды',
          };
        }
      },

      deleteUser: async (userId: string) => {
        try {
          await api.delete(`/api/v1/admin/users/${userId}`);
          set((state) => ({
            clients: state.clients.filter((u) => u.id !== userId),
          }));
          return { success: true };
        } catch (err: any) {
          return {
            success: false,
            error: err.response?.data?.message || err.message || 'Оқырманды өшіру сәтсіз аяқталды',
          };
        }
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
        const cleanName = data.name.trim();
        const cleanEmail = data.email.trim().toLowerCase();
        const rawUsername = data.username?.trim().toLowerCase().replace(/^@/, '') || '';

        try {
          const { data: newUser } = await api.post('/api/v1/admin/users', {
            name: cleanName,
            email: cleanEmail,
            phone: data.phone?.trim() || null,
            password: data.password || 'reader123',
            username: rawUsername || null,
            idNumber: data.idNumber?.trim() || null,
            birthDate: data.birthDate?.trim() || null,
            role: data.role || 'client',
            personalMessage: data.personalMessage?.text || null,
            personalMessageDays: data.personalMessage?.days || null,
            personalMessageActive: data.personalMessage?.isActive,
          });

          set((state) => ({
            clients: [newUser, ...state.clients.filter((u) => u.id !== newUser.id)],
          }));

          return { success: true, user: newUser };
        } catch (err: any) {
          return {
            success: false,
            error: err.response?.data?.message || err.message || 'Оқырманды тіркеу сәтсіз аяқталды',
          };
        }
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

        try {
          const { data: updatedData } = await api.patch('/api/v1/auth/profile', {
            name: cleanName,
            email: cleanEmail,
            phone: cleanPhone,
            username: rawUsername,
            birthDate: cleanBirthDate || null,
            gender: cleanGender || null,
            avatarUrl: newAvatarUrl || null,
          });

          if (updatedData?.token) {
            localStorage.setItem('tanda_token', updatedData.token);
          }

          const updatedUser: User = {
            ...currentUser,
            ...updatedData,
            name: cleanName,
            email: cleanEmail,
            phone: cleanPhone,
            username: rawUsername || currentUser.username,
            birthDate: cleanBirthDate || currentUser.birthDate,
            gender: cleanGender || currentUser.gender,
            avatarUrl: newAvatarUrl || currentUser.avatarUrl,
          };

          set((state) => ({
            user: updatedUser,
            clients: state.clients.map((u) => (u.id === currentUser.id ? { ...u, ...updatedUser } : u)),
          }));
          return { success: true };
        } catch (err: any) {
          return {
            success: false,
            error: err.response?.data?.message || err.message || 'Профильді жаңарту сәтсіз аяқталды',
          };
        }
      },

      updateAvatar: async (avatarUrl: string | null) => {
        const currentUser = get().user;
        if (!currentUser) {
          return { success: false, error: 'Жүйеге кірмегенсіз' };
        }

        try {
          const { data: updatedData } = await api.patch('/api/v1/auth/profile', {
            avatarUrl: avatarUrl || null,
          });

          const updatedUser: User = {
            ...currentUser,
            ...updatedData,
            avatarUrl: avatarUrl || undefined,
          };

          set((state) => ({
            user: updatedUser,
            clients: state.clients.map((u) => (u.id === currentUser.id ? { ...u, ...updatedUser } : u)),
          }));
          return { success: true };
        } catch (err: any) {
          return {
            success: false,
            error: err.response?.data?.message || err.message || 'Аватарды жаңарту сәтсіз аяқталды',
          };
        }
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

        try {
          await api.put('/api/v1/auth/password', {
            currentPassword,
            newPassword,
          });
          return { success: true };
        } catch (err: any) {
          return {
            success: false,
            error: err.response?.data?.message || err.message || 'Құпиясөзді өзгерту сәтсіз аяқталды',
          };
        }
      },

      login: async (emailOrPhone: string, password: string) => {
        set({ isLoading: true });
        const trimmed = emailOrPhone.trim().toLowerCase();

        try {
          const { data } = await api.post('/api/v1/auth/login', {
            email: trimmed,
            password,
          });

          if (data.user?.isActive === false || data.user?.isBlocked) {
            throw new Error('Сіздің аккаунтыңыз әкімші тарапынан бұғатталған. Жүйеге кіре алмайсыз.');
          }

          localStorage.setItem('tanda_token', data.token);
          if (data.refreshToken) {
            localStorage.setItem('tanda_refresh_token', data.refreshToken);
          }
          set({
            user: data.user,
            role: data.user.role as 'admin' | 'client' | 'author',
            isAuthenticated: true,
            authModalOpen: false,
          });

          if (data.user?.role === 'admin') {
            get().fetchClients();
            get().fetchManagers();
            get().fetchAuthors();
            get().fetchReservedUsernames();
          }
        } finally {
          set({ isLoading: false });
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

      loginWithGoogle: async (credential: string) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/api/v1/auth/google', { credential });
          if (data.user?.isActive === false || data.user?.isBlocked) {
            throw new Error('Сіздің аккаунтыңыз әкімші тарапынан бұғатталған. Жүйеге кіре алмайсыз.');
          }

          localStorage.setItem('tanda_token', data.token);
          if (data.refreshToken) {
            localStorage.setItem('tanda_refresh_token', data.refreshToken);
          }
          set({
            user: data.user,
            role: data.user.role as 'admin' | 'client' | 'author',
            isAuthenticated: true,
            authModalOpen: false,
          });

          if (data.user?.role === 'admin') {
            get().fetchClients();
            get().fetchManagers();
            get().fetchAuthors();
            get().fetchReservedUsernames();
          }
        } finally {
          set({ isLoading: false });
        }
      },

      sendVerificationCode: async (email: string, type: 'REGISTER' | 'RESET_PASSWORD' = 'REGISTER') => {
        set({ isLoading: true });
        const cleanEmail = email.trim().toLowerCase();
        try {
          const { data } = await api.post('/api/v1/auth/send-verification-code', { email: cleanEmail, type });
          return {
            success: true,
            message: data?.message || 'Растау коды поштаңызға сәтті жіберілді',
            cooldown: data?.cooldown || 60,
          };
        } catch (err: any) {
          return {
            success: false,
            message: err.response?.data?.message || err.message || 'Растау кодын жіберу сәтсіз аяқталды',
            cooldown: 0,
          };
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (name: string, email: string, password: string, code?: string) => {
        set({ isLoading: true });
        const cleanName = name.trim();
        const cleanEmail = email.trim().toLowerCase();
        try {
          const { data } = await api.post('/api/v1/auth/register', {
            name: cleanName,
            email: cleanEmail,
            password,
            code,
          });

          localStorage.setItem('tanda_token', data.token);
          if (data.refreshToken) {
            localStorage.setItem('tanda_refresh_token', data.refreshToken);
          }
          set({
            user: data.user,
            role: data.user.role as 'admin' | 'client' | 'author',
            isAuthenticated: true,
            authModalOpen: false,
          });
        } finally {
          set({ isLoading: false });
        }
      },

      logout: () => {
        const refreshToken = localStorage.getItem('tanda_refresh_token');
        localStorage.removeItem('tanda_token');
        localStorage.removeItem('tanda_refresh_token');
        api.post('/api/v1/auth/logout', refreshToken ? { refreshToken } : {}).catch(() => {});
        set({
          user: null,
          role: 'client',
          isAuthenticated: false,
          authModalOpen: false,
          clients: [],
          managers: [],
          authors: [],
          reservedUsernames: [],
        });
      },

      restoreSession: async () => {
        let token = localStorage.getItem('tanda_token');
        if (!token || token.startsWith('mock-')) {
          if (token?.startsWith('mock-')) {
            localStorage.removeItem('tanda_token');
            localStorage.removeItem('tanda_refresh_token');
          }
          // Attempt refresh if refresh token is present
          const refreshToken = localStorage.getItem('tanda_refresh_token');
          if (refreshToken) {
            try {
              const refreshUrl = (import.meta.env.VITE_API_URL || '') + '/api/v1/auth/refresh';
              const { data } = await api.post(
                refreshUrl,
                { refreshToken },
                { withCredentials: true }
              );
              token = data.token;
              localStorage.setItem('tanda_token', token as string);
              if (data.refreshToken) {
                localStorage.setItem('tanda_refresh_token', data.refreshToken);
              }
            } catch {
              localStorage.removeItem('tanda_refresh_token');
              set({ isAuthInitialized: true });
              return;
            }
          } else {
            set({ isAuthInitialized: true });
            return;
          }
        }

        try {
          const { data } = await api.get('/api/v1/auth/me');
          set({
            user: data,
            role: data.role as 'admin' | 'client' | 'author',
            isAuthenticated: true,
            isAuthInitialized: true,
          });

          if (data.role === 'admin') {
            get().fetchClients();
            get().fetchManagers();
            get().fetchAuthors();
            get().fetchReservedUsernames();
          }
        } catch (err: any) {
          if (err?.response?.status === 401) {
            localStorage.removeItem('tanda_token');
            localStorage.removeItem('tanda_refresh_token');
            set({ user: null, role: 'client', isAuthenticated: false, isAuthInitialized: true });
          } else {
            set({ isAuthInitialized: true });
          }
        }
      },
}));

if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('tanda_auth_storage_v1');
    localStorage.removeItem('tanda_users_registry_v1');
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

