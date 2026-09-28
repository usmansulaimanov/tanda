import { create } from 'zustand';
import { api } from '../lib/api';

export type MessageTargetType = 'all' | 'single' | 'multiple';
export type MessagePriority = 'normal' | 'news' | 'important';

export interface AdminMessage {
  id: string;
  title: string;
  content: string;
  targetType: MessageTargetType;
  targetUserIds?: string[];
  targetUserNames?: string[];
  bookId?: string;
  bookTitle?: string;
  newsId?: string;
  newsTitle?: string;
  priority: MessagePriority;
  senderName: string;
  senderRole: string;
  createdAt: string;
  canReaderDelete: boolean;
  expiresInHours?: number | null;
  expiresAt?: string | null;
  isRead?: boolean;
  readByUserIds: string[];
  deletedByUserIds?: string[];
}

// --- LocalStorage helpers for persisted dismissed popup IDs ---
const LS_KEY = 'tanda_dismissed_popups_v1';

function loadDismissed(): string[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

function saveDismissed(ids: string[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(ids));
  } catch {}
}
// ---------------------------------------------------------------

interface MessageState {
  messages: AdminMessage[];
  activePopupMessage: AdminMessage | null;
  dismissedPopupIds: string[];
  isLoading: boolean;

  fetchMyMessages: () => Promise<void>;
  fetchAdminMessages: () => Promise<void>;
  sendMessage: (data: {
    title: string;
    content: string;
    targetType: MessageTargetType;
    targetUserIds?: string[];
    targetUserNames?: string[];
    bookId?: string;
    bookTitle?: string;
    newsId?: string;
    newsTitle?: string;
    priority?: MessagePriority;
    senderName?: string;
    canReaderDelete?: boolean;
    expiresInHours?: number | null;
  }) => Promise<AdminMessage | null>;
  deleteMessage: (id: string) => Promise<void>;
  deleteMessageForUser: (messageId: string, userId?: string) => Promise<void>;
  markAsRead: (messageId: string, userId?: string) => Promise<void>;
  markAllAsRead: (userId?: string) => Promise<void>;
  setActivePopupMessage: (msg: AdminMessage | null) => void;
  dismissPopup: () => void;
  getMessagesForUser: (userId?: string) => AdminMessage[];
  getUnreadCountForUser: (userId?: string) => number;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: [],
  activePopupMessage: null,
  dismissedPopupIds: loadDismissed(),
  isLoading: false,

  fetchMyMessages: async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('tanda_token') : null;
    if (!token) return;

    set({ isLoading: true });
    try {
      const { data } = await api.get('/api/v1/me/messages');
      if (Array.isArray(data)) {
        const state = get();
        const dismissed = state.dismissedPopupIds || [];

        // Check if there are unread messages not dismissed yet
        const unreadList = data.filter((m) => !m.isRead && !dismissed.includes(m.id));
        const nextPopup = state.activePopupMessage ? state.activePopupMessage : (unreadList.length > 0 ? unreadList[0] : null);

        set({
          messages: data,
          activePopupMessage: nextPopup,
        });
      }
    } catch (err: any) {
      if (err?.response?.status === 401) {
        set({ messages: [], activePopupMessage: null });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  fetchAdminMessages: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/api/v1/admin/messages');
      if (Array.isArray(data)) {
        set({ messages: data });
      }
    } catch (err) {
      console.error('Failed to fetch admin messages:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  sendMessage: async (data) => {
    try {
      const { data: created } = await api.post('/api/v1/admin/messages', data);
      if (created) {
        set((state) => ({
          messages: [created, ...state.messages],
        }));
        return created;
      }
      return null;
    } catch (err) {
      console.error('Failed to send message:', err);
      return null;
    }
  },

  deleteMessage: async (id: string) => {
    try {
      await api.delete(`/api/v1/admin/messages/${id}`);
      set((state) => ({
        messages: state.messages.filter((m) => m.id !== id),
      }));
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  },

  deleteMessageForUser: async (messageId: string, _userId?: string) => {
    try {
      await api.delete(`/api/v1/me/messages/${messageId}`);
      set((state) => ({
        messages: state.messages.filter((m) => m.id !== messageId),
      }));
    } catch (err) {
      console.error('Failed to delete personal message:', err);
    }
  },

  markAsRead: async (messageId: string, userId?: string) => {
    set((state) => ({
      messages: state.messages.map((m) => {
        if (m.id === messageId) {
          const reads = m.readByUserIds || [];
          return {
            ...m,
            isRead: true,
            readByUserIds: userId && !reads.includes(userId) ? [...reads, userId] : reads,
          };
        }
        return m;
      }),
    }));

    try {
      await api.patch(`/api/v1/me/messages/${messageId}/read`);
    } catch (err) {
      console.error('Failed to mark message as read on server:', err);
    }
  },

  markAllAsRead: async (userId?: string) => {
    set((state) => ({
      messages: state.messages.map((m) => ({
        ...m,
        isRead: true,
        readByUserIds: userId && !(m.readByUserIds || []).includes(userId)
          ? [...(m.readByUserIds || []), userId]
          : m.readByUserIds,
      })),
    }));

    try {
      await api.patch('/api/v1/me/messages/read-all');
    } catch (err) {
      console.error('Failed to mark all messages as read on server:', err);
    }
  },

  setActivePopupMessage: (msg: AdminMessage | null) => {
    set({ activePopupMessage: msg });
  },

  dismissPopup: () => {
    const current = get().activePopupMessage;
    const dismissed = get().dismissedPopupIds || [];
    const newDismissed = current && !dismissed.includes(current.id) ? [...dismissed, current.id] : dismissed;

    // Persist to localStorage so popup won't re-appear after page refresh
    saveDismissed(newDismissed);

    // Auto mark as read on the server so isRead=true → won't show in future polls
    if (current) {
      api.patch(`/api/v1/me/messages/${current.id}/read`).catch(() => {});
    }

    // Check if there is another unread message queued
    const remainingUnread = get().messages.filter((m) => !m.isRead && !newDismissed.includes(m.id) && m.id !== current?.id);
    const nextMsg = remainingUnread.length > 0 ? remainingUnread[0] : null;

    set({
      activePopupMessage: null,
      dismissedPopupIds: newDismissed,
    });

    if (nextMsg) {
      setTimeout(() => {
        set({ activePopupMessage: nextMsg });
      }, 400);
    }
  },


  getMessagesForUser: (_userId?: string) => {
    return get().messages;
  },

  getUnreadCountForUser: (userId?: string) => {
    return get().messages.filter((m) => {
      if (m.isRead) return false;
      if (userId && (m.readByUserIds || []).includes(userId)) return false;
      return true;
    }).length;
  },
}));

// Clean up legacy localStorage key immediately
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('tanda_admin_messages_v1');
  } catch {}
}
