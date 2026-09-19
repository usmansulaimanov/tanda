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
  | 'analytics_view'    // Статистика мен көрсеткіштерді көру
  | 'news_manage'       // Жаңалықтарды басқару және жариялау
  | 'managers_manage';  // Көмекшілерді тағайындау және рұқсат беру

export interface NewsArticle {
  id: string;
  title: string;
  content: string;
  summary?: string;
  imageUrl?: string;
  linkUrl?: string;
  linkText?: string;
  authorName?: string;
  publishedAt: string;
  isPublished: boolean;
  viewsCount?: number;
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
  idNumber?: string; // e.g. "000 001" for admin, "001 001" for readers
  name: string;
  email: string;
  username?: string; // Unique username (e.g. "usman", "reader01")
  phone?: string; // Phone number (e.g. "+7 (777) 123-45-67")
  role: 'admin' | 'client';
  isSuperAdmin?: boolean; // true for primary Super Admin (full control)
  permissions?: AdminPermission[]; // For assistants/managers
  isActive?: boolean;
  createdAt?: string;
  savedBooksCount?: number;
  avatarUrl?: string;
  authProvider?: 'LOCAL' | 'GOOGLE';
  hasPassword?: boolean;
  password?: string;
  personalMessage?: UserPersonalMessage;
}
