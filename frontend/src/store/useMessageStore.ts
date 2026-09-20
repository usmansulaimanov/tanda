import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  canReaderDelete: boolean; // Whether readers are permitted to delete this message (default: false)
  expiresInHours?: number | null; // e.g. 1, 6, 12, 24, 72 (3 days), 168 (7 days), null for never
  expiresAt?: string | null; // Exact expiration ISO timestamp
  readByUserIds: string[]; // User IDs who marked/viewed this message
  deletedByUserIds?: string[]; // User IDs who deleted/hidden this message from their personal inbox
}

interface MessageState {
  messages: AdminMessage[];
  activePopupMessage: AdminMessage | null;

  // Actions
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
  }) => AdminMessage;

  deleteMessage: (id: string) => void;
  deleteMessageForUser: (messageId: string, userId: string) => void;
  markAsRead: (messageId: string, userId: string) => void;
  markAllAsRead: (userId: string) => void;
  dismissPopup: () => void;
  getMessagesForUser: (userId?: string) => AdminMessage[];
  getUnreadCountForUser: (userId?: string) => number;
}

const DEFAULT_MESSAGES: AdminMessage[] = [
  {
    id: 'msg-welcome-001',
    title: 'Tanda платформасына қош келдіңіз!',
    content: 'Құрметті оқырман! Біздің онлайн кітапханамызға қош келдіңіз. Мұнда қазақ және әлем әдебиетінің таңдаулы жауһарларын электронды түрде оқып, аудио нұсқасын тыңдай аласыз. Сұрақтарыңыз болса, бізге кез келген уақытта жаза аласыз.',
    targetType: 'all',
    priority: 'news',
    senderName: 'Tanda',
    senderRole: 'admin',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    canReaderDelete: false,
    expiresInHours: null,
    expiresAt: null,
    readByUserIds: [],
    deletedByUserIds: [],
  },
];

export const useMessageStore = create<MessageState>()(
  persist(
    (set, get) => ({
      messages: DEFAULT_MESSAGES,
      activePopupMessage: null,

      sendMessage: (data) => {
        const now = Date.now();
        let expiresAt: string | null = null;
        const expHours = data.expiresInHours && data.expiresInHours > 0 ? data.expiresInHours : null;
        if (expHours) {
          expiresAt = new Date(now + expHours * 3600 * 1000).toISOString();
        }

        const newMessage: AdminMessage = {
          id: `msg-${now}-${Math.random().toString(36).substring(2, 6)}`,
          title: data.title.trim(),
          content: data.content.trim(),
          targetType: data.targetType,
          targetUserIds: data.targetUserIds || [],
          targetUserNames: data.targetUserNames || [],
          bookId: data.bookId || undefined,
          bookTitle: data.bookTitle?.trim() || undefined,
          newsId: data.newsId || undefined,
          newsTitle: data.newsTitle?.trim() || undefined,
          priority: data.priority || 'normal',
          senderName: data.senderName || 'Tanda',
          senderRole: 'admin',
          createdAt: new Date(now).toISOString(),
          canReaderDelete: data.canReaderDelete ?? false,
          expiresInHours: expHours,
          expiresAt,
          readByUserIds: [],
          deletedByUserIds: [],
        };

        set((state) => ({
          messages: [newMessage, ...state.messages],
          activePopupMessage: newMessage,
        }));

        return newMessage;
      },

      deleteMessage: (id) => {
        set((state) => ({
          messages: state.messages.filter((m) => m.id !== id),
          activePopupMessage: state.activePopupMessage?.id === id ? null : state.activePopupMessage,
        }));
      },

      deleteMessageForUser: (messageId, userId) => {
        if (!userId) return;
        set((state) => ({
          messages: state.messages.map((m) => {
            if (m.id === messageId) {
              // Only allow deleting if message permits reader deletion
              if (m.canReaderDelete) {
                const deletedBy = m.deletedByUserIds || [];
                if (!deletedBy.includes(userId)) {
                  return { ...m, deletedByUserIds: [...deletedBy, userId] };
                }
              }
            }
            return m;
          }),
        }));
      },

      markAsRead: (messageId, userId) => {
        if (!userId) return;
        set((state) => ({
          messages: state.messages.map((m) => {
            if (m.id === messageId) {
              const readList = m.readByUserIds || [];
              if (!readList.includes(userId)) {
                return { ...m, readByUserIds: [...readList, userId] };
              }
            }
            return m;
          }),
        }));
      },

      markAllAsRead: (userId) => {
        if (!userId) return;
        set((state) => ({
          messages: state.messages.map((m) => {
            const isTargeted =
              m.targetType === 'all' ||
              (m.targetUserIds && m.targetUserIds.includes(userId));

            if (isTargeted) {
              const readList = m.readByUserIds || [];
              if (!readList.includes(userId)) {
                return { ...m, readByUserIds: [...readList, userId] };
              }
            }
            return m;
          }),
        }));
      },

      dismissPopup: () => {
        set({ activePopupMessage: null });
      },

      getMessagesForUser: (userId) => {
        const { messages } = get();
        const now = Date.now();

        return messages.filter((m) => {
          // Check if message is auto-expired
          if (m.expiresAt && new Date(m.expiresAt).getTime() <= now) {
            return false;
          }

          // Check if user has explicitly deleted this message (if deletion was allowed)
          if (userId && m.deletedByUserIds && m.deletedByUserIds.includes(userId)) {
            return false;
          }

          if (!userId) {
            return m.targetType === 'all';
          }

          if (m.targetType === 'all') return true;
          return m.targetUserIds && m.targetUserIds.includes(userId);
        });
      },

      getUnreadCountForUser: (userId) => {
        const userMessages = get().getMessagesForUser(userId);
        if (!userId) return 0;
        return userMessages.filter((m) => !(m.readByUserIds || []).includes(userId)).length;
      },
    }),
    {
      name: 'tanda_admin_messages_v1',
      version: 1,
    }
  )
);
