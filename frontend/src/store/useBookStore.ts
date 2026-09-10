import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Book } from '../types';
import { INITIAL_BOOKS } from '../data/initialBooks';
import { sanitizeInput, sanitizeUrl } from '../utils/security';

const API_ENDPOINT = '/api/books';

// Helper to persist to server books.json
async function saveToBackend(books: Book[]) {
  try {
    await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(books),
    });
  } catch (err) {
    // If running purely client-side without python server, silently ignore
  }
}

interface BookState {
  books: Book[];
  searchQuery: string;
  selectedCategory: string;
  formatFilter: 'all' | 'audio' | 'ebook';
  freeFilter: 'all' | 'free' | 'paid';
  isSyncing: boolean;

  // Filter setters
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (cat: string) => void;
  setFormatFilter: (format: 'all' | 'audio' | 'ebook') => void;
  setFreeFilter: (free: 'all' | 'free' | 'paid') => void;

  // CRUD actions
  addBook: (newBook: Omit<Book, 'id'>, customId?: string) => Book;
  updateBook: (id: string, updates: Partial<Book>) => void;
  deleteBook: (id: string) => void;
  toggleArchive: (id: string) => void;
  resetToDefaults: () => void;
  fetchFromBackend: () => Promise<void>;
}

export const useBookStore = create<BookState>()(
  persist(
    (set, get) => ({
      books: INITIAL_BOOKS,
      searchQuery: '',
      selectedCategory: 'Барлығы',
      formatFilter: 'all',
      freeFilter: 'all',
      isSyncing: false,

      setSearchQuery: (query) => set({ searchQuery: query }),
      setSelectedCategory: (cat) => set({ selectedCategory: cat }),
      setFormatFilter: (format) => set({ formatFilter: format }),
      setFreeFilter: (free) => set({ freeFilter: free }),

      addBook: (newBook, customId) => {
        const id = customId || `book-${Date.now()}`;
        const book: Book = {
          ...newBook,
          id,
          title: sanitizeInput(newBook.title) || 'Атаусыз кітап',
          author: sanitizeInput(newBook.author) || 'Белгісіз автор',
          category: newBook.category || 'Көркем әдебиет',
          pages: newBook.pages ? Number(newBook.pages) : null,
          hasAudio: Boolean(newBook.hasAudio),
          audioNarrator: sanitizeInput(newBook.audioNarrator || ''),
          audioDuration: sanitizeInput(newBook.audioDuration || ''),
          audioChapters: newBook.audioChapters || [],
          audioUrl: sanitizeUrl(newBook.audioUrl),
          coverImage: sanitizeUrl(newBook.coverImage),
          gradient: newBook.gradient || 'linear-gradient(135deg, #0057A8, #003d7a)',
          description: sanitizeInput(newBook.description || ''),
          isFree: Boolean(newBook.isFree),
          isArchived: Boolean(newBook.isArchived),
          createdAt: new Date().toISOString(),
        };

        const updated = [book, ...get().books];
        set({ books: updated });
        saveToBackend(updated);
        return book;
      },

      updateBook: (id, updates) => {
        const updated = get().books.map((b) => {
          if (b.id !== id) return b;
          return {
            ...b,
            ...updates,
            title: updates.title !== undefined ? sanitizeInput(updates.title) : b.title,
            author: updates.author !== undefined ? sanitizeInput(updates.author) : b.author,
            description: updates.description !== undefined ? sanitizeInput(updates.description) : b.description,
          };
        });
        set({ books: updated });
        saveToBackend(updated);
      },

      deleteBook: (id) => {
        const updated = get().books.filter((b) => b.id !== id);
        set({ books: updated });
        saveToBackend(updated);
      },

      toggleArchive: (id) => {
        const updated = get().books.map((b) =>
          b.id === id ? { ...b, isArchived: !b.isArchived } : b
        );
        set({ books: updated });
        saveToBackend(updated);
      },

      resetToDefaults: () => {
        set({ books: INITIAL_BOOKS });
        saveToBackend(INITIAL_BOOKS);
      },

      fetchFromBackend: async () => {
        try {
          set({ isSyncing: true });
          const res = await fetch(API_ENDPOINT);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              set({ books: data });
            }
          }
        } catch {
          // Keep local state if server unreachable
        } finally {
          set({ isSyncing: false });
        }
      },
    }),
    {
      name: 'tanda_books_storage',
    }
  )
);

// Initial auto-sync trigger
if (typeof window !== 'undefined') {
  setTimeout(() => {
    useBookStore.getState().fetchFromBackend();
  }, 100);

  // Sync across tabs
  window.addEventListener('storage', (e) => {
    if (e.key === 'tanda_books_storage' && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (parsed?.state?.books) {
          useBookStore.setState({ books: parsed.state.books });
        }
      } catch {}
    }
  });
}
