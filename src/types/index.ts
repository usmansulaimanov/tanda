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
  | 'Классика'
  | 'Тұлғалық даму'
  | 'Тарих'
  | 'Ертегілер'
  | 'Бизнес'
  | 'Психология';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'client';
  date?: string;
}
