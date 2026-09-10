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

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'client';
  date?: string;
}
