import { create } from 'zustand';
import { api } from '../lib/api';

export interface QuoteItem {
  id: string;
  text: string;
  author: string;
  bookId?: string;
  bookTitle?: string;
  isActive: boolean;
  sentCount: number;
  lastSentAt?: string;
  createdAt: string;
}

export interface QuoteSettings {
  isEnabled: boolean;
  frequencyPerDay: number;
  scheduledTimes: string[];
  browserPushEnabled: boolean;
  soundEnabled: boolean;
}

export interface DeliveredQuoteRecord {
  id: string;
  quoteId: string;
  text: string;
  author: string;
  bookId?: string;
  bookTitle?: string;
  deliveredAt: string;
}

interface QuoteState {
  quotes: QuoteItem[];
  settings: QuoteSettings;
  activeNotification: QuoteItem | null;
  deliveredHistory: DeliveredQuoteRecord[];
  isLoading: boolean;

  fetchQuotes: (asAdmin?: boolean) => Promise<void>;
  fetchRandomQuote: () => Promise<QuoteItem | null>;
  addQuote: (data: { text: string; author?: string; bookId?: string; bookTitle?: string; isActive?: boolean }) => Promise<QuoteItem | null>;
  addBulkQuotes: (items: Array<{ text: string; author?: string; bookId?: string; bookTitle?: string }>) => Promise<number>;
  updateQuote: (id: string, updates: Partial<QuoteItem>) => Promise<void>;
  sendQuote: (id: string) => Promise<QuoteItem | null>;
  deleteQuote: (id: string) => Promise<void>;
  deleteQuotes: (ids: string[]) => Promise<void>;
  toggleQuoteActive: (id: string) => Promise<void>;
  updateSettings: (partial: Partial<QuoteSettings>) => void;

  triggerQuoteNotification: (quoteId?: string) => QuoteItem | null;
  dismissNotification: () => void;
  checkAndTriggerScheduledQuotes: () => void;
  clearHistory: () => void;
}

const DEFAULT_SETTINGS: QuoteSettings = {
  isEnabled: true,
  frequencyPerDay: 3,
  scheduledTimes: ['09:00', '14:00', '20:00'],
  browserPushEnabled: true,
  soundEnabled: true,
};

export const useQuoteStore = create<QuoteState>((set, get) => ({
  quotes: [],
  settings: DEFAULT_SETTINGS,
  activeNotification: null,
  deliveredHistory: [],
  isLoading: false,

  fetchQuotes: async (asAdmin = false) => {
    set({ isLoading: true });
    try {
      const endpoint = asAdmin ? '/api/v1/admin/quotes' : '/api/v1/quotes';
      const { data } = await api.get(endpoint);
      if (Array.isArray(data)) {
        set({ quotes: data });
      }
    } catch (err: any) {
      if (asAdmin && err?.response?.status === 403) {
        try {
          const { data } = await api.get('/api/v1/quotes');
          if (Array.isArray(data)) set({ quotes: data });
        } catch {}
      }
    } finally {
      set({ isLoading: false });
    }
  },

  fetchRandomQuote: async () => {
    try {
      const { data } = await api.get('/api/v1/quotes/random');
      return data || null;
    } catch {
      return null;
    }
  },

  addQuote: async (data) => {
    try {
      const { data: created } = await api.post('/api/v1/admin/quotes', data);
      if (created) {
        set((state) => ({
          quotes: [created, ...state.quotes],
        }));
        return created;
      }
      return null;
    } catch (err) {
      console.error('Failed to create quote:', err);
      return null;
    }
  },

  addBulkQuotes: async (items) => {
    const validItems = items.filter((item) => item.text && item.text.trim().length > 0);
    if (validItems.length === 0) return 0;

    try {
      const { data } = await api.post('/api/v1/admin/quotes/bulk', validItems);
      if (Array.isArray(data)) {
        set((state) => ({
          quotes: [...data, ...state.quotes],
        }));
        return data.length;
      }
      return 0;
    } catch (err) {
      console.error('Failed to bulk add quotes:', err);
      return 0;
    }
  },

  updateQuote: async (id, updates) => {
    try {
      const { data: updated } = await api.patch(`/api/v1/admin/quotes/${id}`, updates);
      set((state) => ({
        quotes: state.quotes.map((q) => (q.id === id ? { ...q, ...updated } : q)),
      }));
    } catch (err) {
      console.error('Failed to update quote:', err);
    }
  },

  sendQuote: async (id) => {
    try {
      const { data: updated } = await api.post(`/api/v1/admin/quotes/${id}/send`);
      if (updated) {
        set((state) => ({
          quotes: state.quotes.map((q) => (q.id === id ? { ...q, ...updated } : q)),
        }));
        return updated;
      }
      return null;
    } catch (err) {
      console.error('Failed to send quote:', err);
      return null;
    }
  },

  deleteQuote: async (id) => {
    try {
      await api.delete(`/api/v1/admin/quotes/${id}`);
      set((state) => ({
        quotes: state.quotes.filter((q) => q.id !== id),
      }));
    } catch (err) {
      console.error('Failed to delete quote:', err);
    }
  },

  deleteQuotes: async (ids) => {
    try {
      await api.delete('/api/v1/admin/quotes', { data: ids });
      set((state) => ({
        quotes: state.quotes.filter((q) => !ids.includes(q.id)),
      }));
    } catch (err) {
      console.error('Failed to bulk delete quotes:', err);
    }
  },

  toggleQuoteActive: async (id) => {
    const quote = get().quotes.find((q) => q.id === id);
    if (!quote) return;
    const newStatus = !quote.isActive;
    await get().updateQuote(id, { isActive: newStatus });
  },

  updateSettings: (partial) => {
    set((state) => ({
      settings: { ...state.settings, ...partial },
    }));
  },

  triggerQuoteNotification: (quoteId) => {
    const quotes = get().quotes.filter((q) => q.isActive);
    if (quotes.length === 0) return null;

    let targetQuote = quoteId ? quotes.find((q) => q.id === quoteId) : null;
    if (!targetQuote) {
      const randIdx = Math.floor(Math.random() * quotes.length);
      targetQuote = quotes[randIdx];
    }

    const historyItem: DeliveredQuoteRecord = {
      id: 'deliv-' + Date.now(),
      quoteId: targetQuote.id,
      text: targetQuote.text,
      author: targetQuote.author,
      bookId: targetQuote.bookId,
      bookTitle: targetQuote.bookTitle,
      deliveredAt: new Date().toISOString(),
    };

    set((state) => ({
      activeNotification: targetQuote,
      deliveredHistory: [
        historyItem,
        ...state.deliveredHistory.filter((d) => d.quoteId !== targetQuote!.id).slice(0, 49),
      ],
    }));

    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted' &&
      get().settings.browserPushEnabled
    ) {
      try {
        new Notification(`Tanda • ${targetQuote.author}`, {
          body: targetQuote.text,
          icon: '/favicon.ico',
        });
      } catch {}
    }

    return targetQuote;
  },

  dismissNotification: () => {
    set({ activeNotification: null });
  },

  checkAndTriggerScheduledQuotes: async () => {
    const { quotes, settings, triggerQuoteNotification, fetchQuotes } = get();
    if (!settings.isEnabled) return;

    if (quotes.length === 0) {
      await fetchQuotes();
    }

    const currentQuotes = get().quotes.filter((q) => q.isActive);
    if (currentQuotes.length === 0) return;

    // 1. Check if there is an admin-sent quote that has not been delivered to this user yet
    const sentQuotes = currentQuotes
      .filter((q) => (q.sentCount && q.sentCount > 0) || Boolean(q.lastSentAt))
      .sort((a, b) => {
        const timeA = a.lastSentAt ? new Date(a.lastSentAt).getTime() : 0;
        const timeB = b.lastSentAt ? new Date(b.lastSentAt).getTime() : 0;
        return timeB - timeA;
      });

    if (sentQuotes.length > 0) {
      const latestSent = sentQuotes[0];
      const seenKey = `tanda_seen_quote_${latestSent.id}_${latestSent.lastSentAt || latestSent.sentCount}`;
      if (typeof window !== 'undefined' && !localStorage.getItem(seenKey)) {
        localStorage.setItem(seenKey, 'true');
        triggerQuoteNotification(latestSent.id);
        return;
      }
    }

    // 2. Check scheduled timeslots (e.g. 09:00, 14:00, 20:00)
    if (typeof window !== 'undefined') {
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTime = `${currentHours}:${currentMinutes}`;
      const todayDate = now.toISOString().slice(0, 10);

      if (settings.scheduledTimes.includes(currentTime)) {
        const scheduleKey = `tanda_scheduled_quote_${todayDate}_${currentTime}`;
        if (!localStorage.getItem(scheduleKey)) {
          localStorage.setItem(scheduleKey, 'true');
          triggerQuoteNotification();
        }
      }
    }
  },

  clearHistory: () => {
    set({ deliveredHistory: [] });
  },
}));

// Clean up legacy localStorage key immediately
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('tanda_quotes_storage_v1');
  } catch {}
}
