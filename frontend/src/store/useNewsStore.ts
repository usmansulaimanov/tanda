import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { NewsArticle } from '../types';

interface NewsState {
  articles: NewsArticle[];
  
  // Actions
  addArticle: (data: {
    title: string;
    content: string;
    summary?: string;
    imageUrl?: string;
    linkUrl?: string;
    linkText?: string;
    authorName?: string;
    isPublished?: boolean;
  }) => Promise<{ success: boolean; article?: NewsArticle; error?: string }>;
  
  updateArticle: (
    id: string,
    data: Partial<Omit<NewsArticle, 'id' | 'publishedAt'>>
  ) => Promise<{ success: boolean; error?: string }>;
  
  deleteArticle: (id: string) => Promise<{ success: boolean; error?: string }>;
  
  getArticleById: (id: string) => NewsArticle | undefined;
  incrementViews: (id: string) => void;
  getPublishedArticles: () => NewsArticle[];
}

const STORAGE_KEY = 'tanda_news_articles_v1';

const INITIAL_NEWS: NewsArticle[] = [
  {
    id: 'news-1',
    title: 'Tanda онлайн кітапханасының жаңа мүмкіндіктері іске қосылды',
    summary: 'Құрметті оқырмандар! Tanda платформасында кітаптарды аудио форматында тыңдау, жеке сөре жасау және күнделікті цитаталар алу мүмкіндіктері толықтай жаңартылды.',
    content: `Құрметті Tanda оқырмандары мен әдебиет сүйер қауым!

Біздің командамыз платформаны дамыту бойынша ауқымды жұмыстар жүргізіп, сіздердің кітап оқу сапарыңызды одан әрі жайлы ету үшін жаңа функционалдарды іске қосты:

1. **Аудиокітаптар қоры:** Енді кез келген қазақ және әлем әдебиетінің жауһарларын кәсіби дикторлардың орындауында жоғары сапада тыңдай аласыз.
2. **«Менің сөрем» бөлімі:** Өзіңізге ұнаған, оқып жатқан және оқуды жоспарлаған кітаптарды ыңғайлы сұрыптап, прогресті бақылаңыз.
3. **Күнделікті даналық цитаталары:** Күн сайын шабыттандыратын ұлы тұлғалардың сөздері мен ақыл-ой маржандары оқырмандарға ұсынылып отырады.

Бізбен бірге болыңыздар, білім мен таным көкжиегін бірге кеңейтейік!`,
    imageUrl: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=1000&auto=format&fit=crop',
    linkUrl: '/catalog',
    linkText: 'Кітаптар қорына өту',
    authorName: 'Tanda әкімшілігі',
    publishedAt: '2026-09-18T10:00:00.000Z',
    isPublished: true,
    viewsCount: 142,
  },
  {
    id: 'news-2',
    title: 'Қазақ әдебиетінің жауһарлары: Абай мен Шәкәрімнің электронды жинағы',
    summary: 'Хакім Абайдың қара сөздері, өлеңдері мен Шәкәрім Құдайбердіұлының тағылымды шығармалары жаңа сандық форматта оқырмандарға қолжетімді болды.',
    content: `Ұлы даланың рухани қазынасын ұрпақтан-ұрпаққа жеткізу — басты мақсаттарымыздың бірі.

Tanda кітапханасына қазақтың бас ақыны Абай Құнанбайұлының толық шығармалар жинағы, поэмалары мен даналыққа толы «Қара сөздері» қосылды. Сондай-ақ Шәкәрім Құдайбердіұлының философиялық толғаулары мен өлеңдері электронды және аудио нұсқада оқырман назарына ұсынылды.

Кітаптарды электронды түрде оқып, сүйікті үзінділерді цитата ретінде сақтап қоюға болады.`,
    imageUrl: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?q=80&w=1000&auto=format&fit=crop',
    linkUrl: '/#catalog',
    linkText: 'Каталогтан табу',
    authorName: 'Tanda редакциясы',
    publishedAt: '2026-09-15T14:30:00.000Z',
    isPublished: true,
    viewsCount: 89,
  },
];

export const useNewsStore = create<NewsState>()(
  persist(
    (set, get) => ({
      articles: INITIAL_NEWS,

      addArticle: async (data) => {
        const title = data.title.trim();
        const content = data.content.trim();

        if (!title) {
          return { success: false, error: 'Мақаланың тақырыбын жазыңыз' };
        }
        if (!content) {
          return { success: false, error: 'Мақаланың мәтінін жазыңыз' };
        }

        const newArticle: NewsArticle = {
          id: `news-${Date.now()}`,
          title,
          content,
          summary: data.summary?.trim() || content.substring(0, 180) + (content.length > 180 ? '...' : ''),
          imageUrl: data.imageUrl?.trim() || undefined,
          linkUrl: data.linkUrl?.trim() || undefined,
          linkText: data.linkText?.trim() || (data.linkUrl ? 'Толығырақ білу' : undefined),
          authorName: data.authorName?.trim() || 'Tanda',
          publishedAt: new Date().toISOString(),
          isPublished: data.isPublished !== undefined ? data.isPublished : true,
          viewsCount: 0,
        };

        set((state) => ({
          articles: [newArticle, ...state.articles],
        }));

        return { success: true, article: newArticle };
      },

      updateArticle: async (id, data) => {
        const article = get().articles.find((a) => a.id === id);
        if (!article) {
          return { success: false, error: 'Мақала табылмады' };
        }

        set((state) => ({
          articles: state.articles.map((a) => {
            if (a.id === id) {
              const updatedContent = data.content !== undefined ? data.content.trim() : a.content;
              const updatedSummary = data.summary !== undefined ? data.summary.trim() : (data.content ? updatedContent.substring(0, 180) + (updatedContent.length > 180 ? '...' : '') : a.summary);
              return {
                ...a,
                ...data,
                title: data.title !== undefined ? data.title.trim() : a.title,
                content: updatedContent,
                summary: updatedSummary,
                imageUrl: data.imageUrl !== undefined ? data.imageUrl.trim() || undefined : a.imageUrl,
                linkUrl: data.linkUrl !== undefined ? data.linkUrl.trim() || undefined : a.linkUrl,
                linkText: data.linkText !== undefined ? data.linkText.trim() || undefined : a.linkText,
              };
            }
            return a;
          }),
        }));

        return { success: true };
      },

      deleteArticle: async (id) => {
        set((state) => ({
          articles: state.articles.filter((a) => a.id !== id),
        }));
        return { success: true };
      },

      getArticleById: (id) => {
        return get().articles.find((a) => a.id === id);
      },

      incrementViews: (id) => {
        set((state) => ({
          articles: state.articles.map((a) => (a.id === id ? { ...a, viewsCount: (a.viewsCount || 0) + 1 } : a)),
        }));
      },

      getPublishedArticles: () => {
        return get()
          .articles.filter((a) => a.isPublished)
          .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
      },
    }),
    {
      name: STORAGE_KEY,
    }
  )
);
