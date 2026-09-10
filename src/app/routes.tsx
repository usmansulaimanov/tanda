import { createHashRouter, Navigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { LandingPage } from '../features/landing/LandingPage';
import { CatalogPage } from '../features/catalog/CatalogPage';
import { BookDetailPage } from '../features/book/BookDetailPage';
import { ReaderPage } from '../features/reader/ReaderPage';
import { AdminDashboard } from '../features/admin/AdminDashboard';
import { BookFormPage } from '../features/admin/BookFormPage';
import { ReadersPage } from '../features/admin/ReadersPage';
import { ProfilePage } from '../features/profile/ProfilePage';

export const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <LandingPage />,
      },
      {
        path: 'catalog',
        element: <CatalogPage />,
      },
      {
        path: 'book/:id',
        element: <BookDetailPage />,
      },
      {
        path: 'profile',
        element: <ProfilePage />,
      },
      {
        path: 'admin',
        element: <AdminDashboard />,
      },
      {
        path: 'admin/readers',
        element: <ReadersPage />,
      },
      {
        path: 'admin/books/new',
        element: <BookFormPage />,
      },
      {
        path: 'admin/books/:id/edit',
        element: <BookFormPage />,
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
  {
    path: '/read/:id',
    element: <ReaderPage />,
  },
]);
