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
  pdfUrl?: string;
  epubUrl?: string;
  content?: string;
  createdAt?: string;
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
  | 'managers_manage';  // Көмекшілерді тағайындау және рұқсат беру

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
  role: 'admin' | 'client';
  isSuperAdmin?: boolean; // true for primary Super Admin (full control)
  duty?: string; // e.g. "Кітап модераторы", "Контент менеджері"
  permissions?: AdminPermission[]; // For assistants/managers
  isActive?: boolean;
  isPremium?: boolean;
  premiumExpiresAt?: string;
  createdAt?: string;
  savedBooksCount?: number;
  avatarUrl?: string;
  authProvider?: 'LOCAL' | 'GOOGLE';
  hasPassword?: boolean;
  password?: string;
  personalMessage?: UserPersonalMessage;
}
