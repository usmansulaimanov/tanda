export interface AudioChapter {
  id: string;
  title: string;
  duration: string;
  audioUrl?: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  categories?: string[];
  pages: number | null;
  hasAudio: boolean;
  audioNarrator?: string;
  audioDuration?: string;
  audioChapters?: AudioChapter[];
  audioUrl?: string;
  coverImage?: string;
  gradient?: string;
  description: string;
  isFree: boolean;
  isArchived: boolean;
  hasEbook?: boolean;
  ebookUrl?: string;
  ebookFormat?: string;
  pdfUrl?: string;
  epubUrl?: string;
  content?: string;
  createdAt?: string;
  readsCount?: number;
  viewsCount?: number;
  listensCount?: number;
  audioListensCount?: number;
  savedCount?: number;
}

export type Category = 
  | 'Барлығы'
  | 'Көркем әдебиет'
  | 'Детектив'
  | 'Романтика'
  | 'Фэнтези'
  | 'Фантастика'
  | 'Мистика және хоррор'
  | 'Психология'
  | 'Өзін-өзі дамыту'
  | 'Бизнес және қаржы'
  | 'Тарих'
  | 'Руханият және философия'
  | 'Білім және ғылым'
  | 'Балалар әдебиеті'
  | 'Жасөспірімдер әдебиеті'
  | 'Өмірбаян және мемуар';

export type AdminPermission =
  | 'books_view'        // Кітаптарды көру
  | 'books_create'      // Жаңа кітап қосу
  | 'books_edit'        // Кітаптарды өңдеу
  | 'books_delete'      // Кітаптарды өшіру және архивке салу
  | 'readers_view'      // Оқырмандар тізімін көру
  | 'readers_manage'    // Оқырман қосу, өңдеу, бұғаттау, хабарлама жазу
  | 'readers_delete'    // Оқырманды өшіру
  | 'promocodes_manage' // Промокодтарды жасау және басқару
  | 'quotes_manage'     // Цитаталарды енгізу, баптау және оқырмандарға тарату
  | 'messages_manage'   // Хабарламаларды басқару және тарату
  | 'news_manage'       // Жаңалықтарды басқару және жариялау
  | 'analytics_view'    // Статистика мен көрсеткіштерді көру
  | 'managers_manage'   // Көмекшілерді тағайындау және рұқсат беру
  | 'usernames_manage'; // Бұғатталған және арнайы юзернеймдерді басқару

export interface NewsArticle {
  id: string;
  title: string;
  content: string;
  summary?: string;
  imageUrl?: string;
  images?: string[];
  linkUrl?: string;
  linkText?: string;
  authorName?: string;
  publishedAt: string;
  scheduledAt?: string;
  isPublished: boolean;
  viewsCount?: number;
  notifiedAt?: string;
}

export interface UserPersonalMessage {
  text: string;
  days: number;
  createdAt: string;
  expiresAt: string;
  isActive?: boolean;
}

export interface User {
  id: string;
  authorId?: string;
  idNumber?: string; // e.g. "0000 0001" for admin, "0000 1001" for readers
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  username?: string; // Unique username (e.g. "usman", "reader01")
  phone?: string; // Phone number (e.g. "+7 (777) 123-45-67")
  birthDate?: string; // "YYYY-MM-DD" or "DD.MM.YYYY"
  gender?: 'male' | 'female' | 'other';
  lastBirthdayGreetingYear?: number;
  lastBirthdayGiftYear?: number;
  lastBirthdayGiftDate?: string;
  role: 'admin' | 'client' | 'author';
  isAuthor?: boolean;
  assignedAuthorName?: string; // e.g. "Мұхтар Әуезов" matching books.author
  assignedBookIds?: string[]; // Specific book IDs linked to this author
  isSuperAdmin?: boolean; // true for primary Super Admin (full control)
  duty?: string; // e.g. "Кітап модераторы", "Контент менеджері", "Автор"
  permissions?: AdminPermission[]; // For assistants/managers
  isActive?: boolean;
  isPremium?: boolean;
  premiumExpiresAt?: string;
  createdAt?: string;
  savedBooksCount?: number;
  avatarUrl?: string;
  authProvider?: 'LOCAL' | 'GOOGLE';
  googleId?: string;
  hasPassword?: boolean;
  password?: string;
  personalMessage?: UserPersonalMessage;
}

export interface BookDailyStat {
  date: string;
  label: string;
  shortLabel: string;
  seconds: number;
  minutes: number;
  isToday: boolean;
  isPeak: boolean;
}

export interface BookPeakDay {
  date: string;
  label: string;
  seconds: number;
  minutes: number;
}

export interface BookStatsResponse {
  bookId: string;
  title: string;
  author: string;
  coverImage?: string;
  category?: string;
  pages?: number;
  hasAudio?: boolean;
  hasEbook?: boolean;
  audioDuration?: string;
  assignedAuthorId?: string;
  selectedMonth: string;
  selectedMonthLabel: string;
  todaySeconds: number;
  todayMinutes: number;
  monthSeconds: number;
  monthMinutes: number;
  monthHours: number;
  allTimeSeconds: number;
  allTimeMinutes: number;
  monthUniqueListeners: number;
  allTimeUniqueListeners: number;
  monthListeners?: number;
  allTimeListeners?: number;
  monthReaders?: number;
  allTimeReaders?: number;
  monthActives?: number;
  allTimeActives?: number;
  peakDay?: BookPeakDay | null;
  dailyList: BookDailyStat[];
  totalListenedDays: number;
  averageDailyMinutes: number;
}

export interface BookAudienceMember {
  userId: string;
  idNumber?: string;
  name: string;
  email: string;
  phone?: string;
  username?: string;
  avatarUrl?: string;
  totalSeconds: number;
  totalMinutes: number;
  formattedDuration: string;
  todaySeconds?: number;
  todayFormattedDuration?: string;
  lastListenedAt?: string;
}

export interface UserBookListeningStatsResponse {
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  userAvatarUrl?: string;
  userIdNumber?: string;
  userUsername?: string;

  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  bookCoverImage?: string;
  bookCategory?: string;

  selectedMonth: string;
  selectedMonthLabel: string;

  userTodayTotalSeconds: number;
  userTodayTotalMinutes: number;

  todayBookSeconds: number;
  todayBookMinutes: number;

  monthBookSeconds: number;
  monthBookMinutes: number;
  monthBookHours: number;

  allTimeBookSeconds: number;
  allTimeBookMinutes: number;
  allTimeBookHours: number;

  peakDay?: BookPeakDay | null;
  dailyList: BookDailyStat[];

  totalListenedDays: number;
  averageDailyMinutes: number;
}
