import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { NewsArticle } from '../types';
import { useMessageStore } from './useMessageStore';

interface NewsState {
  articles: NewsArticle[];
  
  // Actions
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
    authorName: 'Tanda News',
    publishedAt: '2026-09-18T10:00:00.000Z',
    isPublished: true,
    viewsCount: 142,
    notifiedAt: '2026-09-18T10:00:00.000Z',
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
    authorName: 'Tanda News',
    publishedAt: '2026-09-15T14:30:00.000Z',
    isPublished: true,
    viewsCount: 89,
    notifiedAt: '2026-09-15T14:30:00.000Z',
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

        const imagesList = data.images && data.images.length > 0
          ? data.images
          : (data.imageUrl ? [data.imageUrl.trim()] : []);
        const primaryImage = imagesList.length > 0 ? imagesList[0] : (data.imageUrl?.trim() || undefined);

        const newArticle: NewsArticle = {
          id: `news-${Date.now()}`,
          title,
          content,
          summary: data.summary?.trim() || content.substring(0, 180) + (content.length > 180 ? '...' : ''),
          imageUrl: primaryImage,
          images: imagesList,
          linkUrl: data.linkUrl?.trim() || undefined,
          linkText: data.linkText?.trim() || (data.linkUrl ? 'Толығырақ білу' : undefined),
          authorName: data.authorName?.trim() || 'Tanda News',
          publishedAt: data.publishedAt ? new Date(data.publishedAt).toISOString() : new Date().toISOString(),
          scheduledAt: data.scheduledAt ? new Date(data.scheduledAt).toISOString() : undefined,
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
              
              let updatedImages = a.images || (a.imageUrl ? [a.imageUrl] : []);
              if (data.images !== undefined) {
                updatedImages = data.images;
              } else if (data.imageUrl !== undefined) {
                updatedImages = data.imageUrl ? [data.imageUrl.trim()] : [];
              }

              const primaryImage = updatedImages.length > 0 ? updatedImages[0] : (data.imageUrl !== undefined ? (data.imageUrl.trim() || undefined) : a.imageUrl);

              return {
                ...a,
                ...data,
                title: data.title !== undefined ? data.title.trim() : a.title,
                content: updatedContent,
                summary: updatedSummary,
                imageUrl: primaryImage,
                images: updatedImages,
                linkUrl: data.linkUrl !== undefined ? data.linkUrl.trim() || undefined : a.linkUrl,
                linkText: data.linkText !== undefined ? data.linkText.trim() || undefined : a.linkText,
                authorName: data.authorName !== undefined ? (data.authorName.trim() || 'Tanda News') : (a.authorName || 'Tanda News'),
                publishedAt: data.publishedAt ? new Date(data.publishedAt).toISOString() : a.publishedAt,
                scheduledAt: 'scheduledAt' in data
                  ? (data.scheduledAt ? new Date(data.scheduledAt).toISOString() : undefined)
                  : a.scheduledAt,
                notifiedAt: 'notifiedAt' in data ? data.notifiedAt : a.notifiedAt,
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
        const now = Date.now();
        return get()
          .articles.filter(
            (a) =>
              a.isPublished &&
              (!a.scheduledAt || new Date(a.scheduledAt).getTime() <= now) &&
              new Date(a.publishedAt).getTime() <= now
          )
          .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
      },

      checkAndTriggerScheduledNewsNotifications: () => {
        const now = Date.now();
        const articles = get().articles;

        for (const article of articles) {
          // Тек жоспарланған (scheduledAt бар) жаңалықтардың уақыты жеткенде ғана уведомление жіберіледі
          if (article.isPublished && article.scheduledAt) {
            const schedTime = new Date(article.scheduledAt).getTime();
            const notifiedTime = article.notifiedAt ? new Date(article.notifiedAt).getTime() : 0;
            const isAlreadyNotifiedAfterSched = notifiedTime >= schedTime;

            if (!isAlreadyNotifiedAfterSched && now >= schedTime) {
              // Қайталанбас үшін бірден notifiedAt белгілейміз
              set((state) => ({
                articles: state.articles.map((a) =>
                  a.id === article.id ? { ...a, notifiedAt: new Date().toISOString() } : a
                ),
              }));

              // Оқырмандарға жаңалық туралы хабарлама жібереміз
              useMessageStore.getState().sendMessage({
                title: article.title,
                content:
                  article.summary ||
                  (article.content.length > 180 ? article.content.substring(0, 180) + '...' : article.content),
                targetType: 'all',
                priority: 'news',
                senderName: article.authorName || 'Tanda News',
                newsId: article.id,
                newsTitle: article.title,
                canReaderDelete: true,
              });
            }
          } else if (article.isPublished && !article.scheduledAt && !article.notifiedAt) {
            // Жоспарланбаған бұрынғы өткен жаңалықтарға уведомление жіберілмейді, тек notifiedAt қойылады
            set((state) => ({
              articles: state.articles.map((a) =>
                a.id === article.id ? { ...a, notifiedAt: article.publishedAt || new Date().toISOString() } : a
              ),
            }));
          }
        }
      },
    }),
    {
      name: STORAGE_KEY,
    }
  )
);
