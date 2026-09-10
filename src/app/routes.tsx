import { createHashRouter, Navigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { LandingPage } from '../features/landing/LandingPage';
import { CatalogPage } from '../features/catalog/CatalogPage';
import { BookDetailPage } from '../features/book/BookDetailPage';
import { ReaderPage } from '../features/reader/ReaderPage';
import { AdminDashboard } from '../features/admin/AdminDashboard';
import { BookFormPage } from '../features/admin/BookFormPage';

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
        path: 'admin',
        element: <AdminDashboard />,
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
