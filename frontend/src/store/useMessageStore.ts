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

interface MessageState {
  messages: AdminMessage[];
  activePopupMessage: AdminMessage | null;
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
  dismissPopup: () => void;
  getMessagesForUser: (userId?: string) => AdminMessage[];
  getUnreadCountForUser: (userId?: string) => number;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: [],
  activePopupMessage: null,
  isLoading: false,

  fetchMyMessages: async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('tanda_token') : null;
    if (!token) return;

    set({ isLoading: true });
    try {
      const { data } = await api.get('/api/v1/me/messages');
      if (Array.isArray(data)) {
        set({ messages: data });
      }
    } catch (err: any) {
      if (err?.response?.status === 401) {
        set({ messages: [] });
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

  dismissPopup: () => {
    set({ activePopupMessage: null });
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
