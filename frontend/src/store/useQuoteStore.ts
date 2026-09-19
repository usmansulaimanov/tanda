import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  isEnabled: boolean; // Master toggle for quotes delivery
  frequencyPerDay: number; // e.g. 3 times per day
  scheduledTimes: string[]; // e.g. ['09:00', '14:00', '20:00']
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
  lastTriggeredSlots: Record<string, string[]>; // { "2026-09-19": ["09:00", "14:00"] }
  lastShownQuoteIndex: number;

  // Actions
  addQuote: (data: { text: string; author?: string; bookId?: string; bookTitle?: string; isActive?: boolean }) => QuoteItem;
  addBulkQuotes: (items: Array<{ text: string; author?: string; bookId?: string; bookTitle?: string }>) => number;
  updateQuote: (id: string, updates: Partial<QuoteItem>) => void;
  deleteQuote: (id: string) => void;
  deleteQuotes: (ids: string[]) => void;
  toggleQuoteActive: (id: string) => void;
  updateSettings: (partial: Partial<QuoteSettings>) => void;
  
  // Notification controls
  triggerQuoteNotification: (quoteId?: string) => QuoteItem | null;
  dismissNotification: () => void;
  checkAndTriggerScheduledQuotes: () => void;
  clearHistory: () => void;
}

const DEFAULT_QUOTES: QuoteItem[] = [
  {
    id: 'quote-001',
    text: 'Артық білім кітапта, ерінбей оқып көруге.',
    author: 'Абай Құнанбайұлы',
    bookTitle: 'Қара сөздер',
    isActive: true,
    sentCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'quote-002',
    text: 'Өзге тілдің бәрін біл, өз тіліңді құрметте!',
    author: 'Қадыр Мырза Әлі',
    bookTitle: 'Таңдамалы өлеңдер',
    isActive: true,
    sentCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'quote-003',
    text: 'Тәртіпке бас иген құл болмайды, тәртіпсіз ел болмайды.',
    author: 'Бауыржан Момышұлы',
    bookTitle: 'Ұшқан ұя',
    isActive: true,
    sentCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'quote-004',
    text: 'Білімдіден шыққан сөз, талаптыға болсын кез.',
    author: 'Абай Құнанбайұлы',
    bookTitle: 'Өлеңдер жинағы',
    isActive: true,
    sentCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'quote-005',
    text: 'Ел боламын десең, бесігіңді түзе.',
    author: 'Мұхтар Әуезов',
    bookTitle: 'Абай жолы',
    isActive: true,
    sentCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'quote-006',
    text: 'Оқыған білер әр істі, надандық жұртқа тар істі.',
    author: 'Ыбырай Алтынсарин',
    bookTitle: 'Кел, балалар, оқылық!',
    isActive: true,
    sentCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'quote-007',
    text: 'Кітап — адам баласы ақыл-ойының асыл қазынасы.',
    author: 'Әл-Фараби',
    bookTitle: 'Ғылымдар энциклопедиясы',
    isActive: true,
    sentCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'quote-008',
    text: 'Адамның адамшылығы — ақыл, ғылым, жақсы ата, жақсы ана, жақсы құрбы, жақсы ұстаздан болады.',
    author: 'Абай Құнанбайұлы',
    bookTitle: 'Он сегізінші сөз',
    isActive: true,
    sentCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'quote-009',
    text: 'Тән құмары — тамақ, ұйқы, күлкі; Жан құмары — білмекке құмарлық.',
    author: 'Шәкәрім Құдайбердіұлы',
    bookTitle: 'Үш анық',
    isActive: true,
    sentCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'quote-010',
    text: 'Балаларға оқу үйрет, өнер үйрет, жақсы мінезді болсын.',
    author: 'Ахмет Байтұрсынұлы',
    bookTitle: 'Оқу құралы',
    isActive: true,
    sentCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'quote-011',
    text: 'Кітап оқыған адам ешқашан жалғыз қалмайды.',
    author: 'Шерхан Мұртаза',
    bookTitle: 'Қызыл жебе',
    isActive: true,
    sentCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'quote-012',
    text: 'Көзіңді аш, оян, қазақ, көтер басты, Өткізбей қараңғыда бекер жасты!',
    author: 'Міржақып Дулатұлы',
    bookTitle: 'Оян, қазақ!',
    isActive: true,
    sentCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

const DEFAULT_SETTINGS: QuoteSettings = {
  isEnabled: true,
  frequencyPerDay: 3,
  scheduledTimes: ['09:00', '14:00', '20:00'],
  browserPushEnabled: true,
  soundEnabled: true,
};

export const useQuoteStore = create<QuoteState>()(
  persist(
    (set, get) => ({
      quotes: DEFAULT_QUOTES,
      settings: DEFAULT_SETTINGS,
      activeNotification: null,
      deliveredHistory: [],
      lastTriggeredSlots: {},
      lastShownQuoteIndex: 0,

      addQuote: (data) => {
        const newQuote: QuoteItem = {
          id: `quote-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          text: data.text.trim(),
          author: data.author?.trim() || 'Халық даналығы',
          bookId: data.bookId || undefined,
          bookTitle: data.bookTitle?.trim() || undefined,
          isActive: data.isActive !== undefined ? data.isActive : true,
          sentCount: 0,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          quotes: [newQuote, ...state.quotes],
        }));

        return newQuote;
      },

      addBulkQuotes: (items) => {
        const validItems = items.filter((item) => item.text && item.text.trim().length > 0);
        if (validItems.length === 0) return 0;

        const newQuotes: QuoteItem[] = validItems.map((item, idx) => ({
          id: `quote-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          text: item.text.trim(),
          author: item.author?.trim() || 'Халық даналығы',
          bookId: item.bookId || undefined,
          bookTitle: item.bookTitle?.trim() || undefined,
          isActive: true,
          sentCount: 0,
          createdAt: new Date().toISOString(),
        }));

        set((state) => ({
          quotes: [...newQuotes, ...state.quotes],
        }));

        return newQuotes.length;
      },

      updateQuote: (id, updates) => {
        set((state) => ({
          quotes: state.quotes.map((q) => (q.id === id ? { ...q, ...updates } : q)),
        }));
      },

      deleteQuote: (id) => {
        set((state) => ({
          quotes: state.quotes.filter((q) => q.id !== id),
          activeNotification: state.activeNotification?.id === id ? null : state.activeNotification,
        }));
      },

      deleteQuotes: (ids) => {
        const idSet = new Set(ids);
        set((state) => ({
          quotes: state.quotes.filter((q) => !idSet.has(q.id)),
          activeNotification: state.activeNotification && idSet.has(state.activeNotification.id) ? null : state.activeNotification,
        }));
      },

      toggleQuoteActive: (id) => {
        set((state) => ({
          quotes: state.quotes.map((q) =>
            q.id === id ? { ...q, isActive: !q.isActive } : q
          ),
        }));
      },

      updateSettings: (partial) => {
        set((state) => ({
          settings: { ...state.settings, ...partial },
        }));
      },

      triggerQuoteNotification: (quoteId) => {
        const state = get();
        const activeQuotes = state.quotes.filter((q) => q.isActive);

        if (activeQuotes.length === 0) {
          return null;
        }

        let selectedQuote: QuoteItem;
        if (quoteId) {
          const found = state.quotes.find((q) => q.id === quoteId);
          selectedQuote = found || activeQuotes[0];
        } else {
          // Sequential rotation through active quotes
          const nextIndex = (state.lastShownQuoteIndex + 1) % activeQuotes.length;
          selectedQuote = activeQuotes[nextIndex] || activeQuotes[0];
          set({ lastShownQuoteIndex: nextIndex });
        }

        const now = new Date().toISOString();

        // Update sent count
        const updatedQuotes = state.quotes.map((q) =>
          q.id === selectedQuote.id
            ? { ...q, sentCount: q.sentCount + 1, lastSentAt: now }
            : q
        );

        const historyRecord: DeliveredQuoteRecord = {
          id: `history-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          quoteId: selectedQuote.id,
          text: selectedQuote.text,
          author: selectedQuote.author,
          bookId: selectedQuote.bookId,
          bookTitle: selectedQuote.bookTitle,
          deliveredAt: now,
        };

        set((prevState) => ({
          quotes: updatedQuotes,
          activeNotification: selectedQuote,
          deliveredHistory: [historyRecord, ...(prevState.deliveredHistory || []).slice(0, 49)],
        }));

        // Send HTML5 Browser Notification if enabled and supported
        if (
          state.settings.browserPushEnabled &&
          typeof window !== 'undefined' &&
          'Notification' in window &&
          Notification.permission === 'granted'
        ) {
          try {
            new Notification('Tanda • Күн цитатасы', {
              body: `«${selectedQuote.text}»\n— ${selectedQuote.author}`,
              icon: '/favicon.ico',
            });
          } catch {}
        }

        return selectedQuote;
      },

      dismissNotification: () => {
        set({ activeNotification: null });
      },

      checkAndTriggerScheduledQuotes: () => {
        const state = get();
        // If master switch is OFF, do not trigger anything
        if (!state.settings.isEnabled) {
          return;
        }

        const activeQuotes = state.quotes.filter((q) => q.isActive);
        if (activeQuotes.length === 0) {
          return;
        }

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const currentTimeSlot = `${hours}:${minutes}`;

        const triggeredToday = state.lastTriggeredSlots[todayStr] || [];

        // Check if current minute matches any scheduled slot and hasn't fired today
        const matchingSlot = state.settings.scheduledTimes.find(
          (time) => time === currentTimeSlot && !triggeredToday.includes(time)
        );

        if (matchingSlot) {
          // Record slot as triggered
          const updatedSlots = {
            ...state.lastTriggeredSlots,
            [todayStr]: [...triggeredToday, matchingSlot],
          };

          set({ lastTriggeredSlots: updatedSlots });
          get().triggerQuoteNotification();
        }
      },

      clearHistory: () => {
        set((state) => ({
          deliveredHistory: [],
          quotes: state.quotes.map((q) => ({ ...q, sentCount: 0, lastSentAt: undefined })),
        }));
      },
    }),
    {
      name: 'tanda_quotes_v2',
      version: 2,
      migrate: (persistedState: any, version: number) => {
        if (version < 2 && persistedState) {
          return {
            ...persistedState,
            deliveredHistory: [],
            quotes: (persistedState.quotes || DEFAULT_QUOTES).map((q: any) => ({
              ...q,
              sentCount: 0,
              lastSentAt: undefined,
            })),
          };
        }
        return persistedState;
      },
    }
  )
);
