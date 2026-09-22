import { create } from 'zustand';
import { NewsArticle } from '../types';
import { api } from '../lib/api';

interface NewsState {
  articles: NewsArticle[];
  isLoading: boolean;

  fetchArticles: (asAdmin?: boolean) => Promise<void>;
  addArticle: (data: {
    title: string;
    content: string;
    summary?: string;
    imageUrl?: string;
    images?: string[];
    linkUrl?: string;
    linkText?: string;
    authorName?: string;
    publishedAt?: string;
    scheduledAt?: string;
    isPublished?: boolean;
  }) => Promise<{ success: boolean; article?: NewsArticle; error?: string }>;
  updateArticle: (
    id: string,
    data: Partial<Omit<NewsArticle, 'id'>>
  ) => Promise<{ success: boolean; error?: string }>;
  deleteArticle: (id: string) => Promise<{ success: boolean; error?: string }>;
  getArticleById: (id: string) => NewsArticle | undefined;
  incrementViews: (id: string) => void;
  getPublishedArticles: () => NewsArticle[];
  checkAndTriggerScheduledNewsNotifications: () => void;
}

export const useNewsStore = create<NewsState>((set, get) => ({
  articles: [],
  isLoading: false,

  fetchArticles: async (asAdmin = false) => {
    set({ isLoading: true });
    try {
      const endpoint = asAdmin ? '/api/v1/admin/news' : '/api/v1/news';
      const { data } = await api.get(endpoint);
      if (Array.isArray(data)) {
        set({ articles: data });
      }
    } catch (err: any) {
      // If admin endpoint failed due to 403, fallback to public news
      if (asAdmin && err?.response?.status === 403) {
        try {
          const { data } = await api.get('/api/v1/news');
          if (Array.isArray(data)) set({ articles: data });
        } catch {}
      }
    } finally {
      set({ isLoading: false });
    }
  },

  addArticle: async (data) => {
    try {
      const payload = {
        title: data.title.trim(),
        content: data.content.trim(),
        summary: data.summary?.trim(),
        imageUrl: data.imageUrl?.trim(),
        images: data.images,
        linkUrl: data.linkUrl?.trim(),
        linkText: data.linkText?.trim(),
        authorName: data.authorName?.trim(),
        publishedAt: data.publishedAt ? new Date(data.publishedAt).toISOString() : new Date().toISOString(),
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt).toISOString() : undefined,
        isPublished: data.isPublished !== undefined ? data.isPublished : true,
      };

      const res = await api.post('/api/v1/admin/news', payload);
      const newArticle: NewsArticle = res.data;

      set((state) => ({
        articles: [newArticle, ...state.articles.filter((a) => a.id !== newArticle.id)],
      }));

      return { success: true, article: newArticle };
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Мақаланы қосу мүмкін болмады';
      return { success: false, error: msg };
    }
  },

  updateArticle: async (id, data) => {
    try {
      const res = await api.patch(`/api/v1/admin/news/${id}`, data);
      const updatedArticle: NewsArticle = res.data;

      set((state) => ({
        articles: state.articles.map((a) => (a.id === id ? updatedArticle : a)),
      }));

      return { success: true };
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Мақаланы жаңарту мүмкін болмады';
      return { success: false, error: msg };
    }
  },

  deleteArticle: async (id) => {
    try {
      await api.delete(`/api/v1/admin/news/${id}`);
      set((state) => ({
        articles: state.articles.filter((a) => a.id !== id),
      }));
      return { success: true };
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Мақаланы өшіру мүмкін болмады';
      return { success: false, error: msg };
    }
  },

  getArticleById: (id) => {
    return get().articles.find((a) => a.id === id);
  },

  incrementViews: (id) => {
    api.post(`/api/v1/news/${id}/views`).catch(() => {});
    set((state) => ({
      articles: state.articles.map((a) =>
        a.id === id ? { ...a, viewsCount: (a.viewsCount || 0) + 1 } : a
      ),
    }));
  },

  getPublishedArticles: () => {
    const now = new Date();
    return get().articles.filter((a) => {
      if (!a.isPublished) return false;
      if (a.publishedAt && new Date(a.publishedAt) > now) return false;
      return true;
    });
  },

  checkAndTriggerScheduledNewsNotifications: () => {
    // Scheduled news notifications are handled server-side
  },
}));

// Clean up legacy localStorage key immediately
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('tanda_news_articles_v2');
  } catch {}
}
