import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Skeleton } from '../shared/ui';

// Lazy-loaded page components for optimal bundle splitting
const LandingPage = lazy(() => import('../features/landing/LandingPage').then((m) => ({ default: m.LandingPage })));
const CatalogPage = lazy(() => import('../features/catalog/CatalogPage').then((m) => ({ default: m.CatalogPage })));
const BookDetailPage = lazy(() => import('../features/book/BookDetailPage').then((m) => ({ default: m.BookDetailPage })));
const ReaderPage = lazy(() => import('../features/reader/ReaderPage').then((m) => ({ default: m.ReaderPage })));
const AdminHomePage = lazy(() => import('../features/admin/AdminHomePage').then((m) => ({ default: m.AdminHomePage })));
const AdminDashboard = lazy(() => import('../features/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const BookFormPage = lazy(() => import('../features/admin/BookFormPage').then((m) => ({ default: m.BookFormPage })));
const ReadersPage = lazy(() => import('../features/admin/ReadersPage').then((m) => ({ default: m.ReadersPage })));
const ReaderCreatePage = lazy(() => import('../features/admin/ReaderCreatePage').then((m) => ({ default: m.ReaderCreatePage })));
const ReaderEditPage = lazy(() => import('../features/admin/ReaderEditPage').then((m) => ({ default: m.ReaderEditPage })));
const ProfilePage = lazy(() => import('../features/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const MyBooksPage = lazy(() => import('../features/books/MyBooksPage').then((m) => ({ default: m.MyBooksPage })));
const SettingsPage = lazy(() => import('../features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const PromoCodePage = lazy(() => import('../features/promo/PromoCodePage').then((m) => ({ default: m.PromoCodePage })));
const ReaderQuotesPage = lazy(() => import('../features/quotes/ReaderQuotesPage').then((m) => ({ default: m.ReaderQuotesPage })));
const AdminPromoCodesPage = lazy(() => import('../features/admin/AdminPromoCodesPage').then((m) => ({ default: m.AdminPromoCodesPage })));
const AdminPromoBatchDetailPage = lazy(() => import('../features/admin/AdminPromoBatchDetailPage').then((m) => ({ default: m.AdminPromoBatchDetailPage })));
const AdminQuotesPage = lazy(() => import('../features/admin/AdminQuotesPage').then((m) => ({ default: m.AdminQuotesPage })));
const AdminMessagesPage = lazy(() => import('../features/admin/AdminMessagesPage').then((m) => ({ default: m.AdminMessagesPage })));
const ReaderMessagesPage = lazy(() => import('../features/messages/ReaderMessagesPage').then((m) => ({ default: m.ReaderMessagesPage })));
const AdminManagersPage = lazy(() => import('../features/admin/AdminManagersPage').then((m) => ({ default: m.AdminManagersPage })));
const AuthPage = lazy(() => import('../features/auth/AuthPage').then((m) => ({ default: m.AuthPage })));
const AudioPlayerPage = lazy(() => import('../features/player/AudioPlayerPage').then((m) => ({ default: m.AudioPlayerPage })));
const NewsPage = lazy(() => import('../features/news/NewsPage').then((m) => ({ default: m.NewsPage })));
const NewsDetailPage = lazy(() => import('../features/news/NewsDetailPage').then((m) => ({ default: m.NewsDetailPage })));
const AdminNewsPage = lazy(() => import('../features/admin/AdminNewsPage').then((m) => ({ default: m.AdminNewsPage })));
const AdminNewsFormPage = lazy(() => import('../features/admin/AdminNewsFormPage').then((m) => ({ default: m.AdminNewsFormPage })));
const AdminStatsPage = lazy(() => import('../features/admin/AdminStatsPage').then((m) => ({ default: m.AdminStatsPage })));
const AuthorStatsPage = lazy(() => import('../features/author/AuthorStatsPage').then((m) => ({ default: m.AuthorStatsPage })));

const PageLoader = () => (
  <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col gap-6">
    <Skeleton className="h-48 w-full rounded-2xl" />
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  </div>
);

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <Suspense fallback={<PageLoader />}>
        <AuthPage initialMode="login" />
      </Suspense>
    ),
  },
  {
    path: '/signup',
    element: (
      <Suspense fallback={<PageLoader />}>
        <AuthPage initialMode="signup" />
      </Suspense>
    ),
  },
  {
    path: '/register',
    element: (
      <Suspense fallback={<PageLoader />}>
        <AuthPage initialMode="signup" />
      </Suspense>
    ),
  },
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<PageLoader />}>
            <LandingPage />
          </Suspense>
        ),
      },
      {
        path: 'catalog',
        element: <Navigate to="/#catalog" replace />,
      },
      {
        path: 'book/:id',
        element: (
          <Suspense fallback={<PageLoader />}>
            <BookDetailPage />
          </Suspense>
        ),
      },
      {
        path: 'listen/:id',
        element: (
          <Suspense fallback={<PageLoader />}>
            <AudioPlayerPage />
          </Suspense>
        ),
      },
      {
        path: 'profile',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProfilePage />
          </Suspense>
        ),
      },
      {
        path: 'my-books',
        element: (
          <Suspense fallback={<PageLoader />}>
            <MyBooksPage />
          </Suspense>
        ),
      },
      {
        path: 'quotes',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ReaderQuotesPage />
          </Suspense>
        ),
      },
      {
        path: 'messages',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ReaderMessagesPage />
          </Suspense>
        ),
      },
      {
        path: 'settings',
        element: (
          <Suspense fallback={<PageLoader />}>
            <SettingsPage />
          </Suspense>
        ),
      },
      {
        path: 'news',
        element: (
          <Suspense fallback={<PageLoader />}>
            <NewsPage />
          </Suspense>
        ),
      },
      {
        path: 'news/:id',
        element: (
          <Suspense fallback={<PageLoader />}>
            <NewsDetailPage />
          </Suspense>
        ),
      },
      {
        path: 'promocode',
        element: (
          <Suspense fallback={<PageLoader />}>
            <PromoCodePage />
          </Suspense>
        ),
      },
      {
        path: 'admin/home',
        element: (
          <Suspense fallback={<PageLoader />}>
            <AdminHomePage />
          </Suspense>
        ),
      },
      {
        path: 'admin',
        element: (
          <Suspense fallback={<PageLoader />}>
            <AdminDashboard />
          </Suspense>
        ),
      },
      {
        path: 'admin/news',
        element: (
          <Suspense fallback={<PageLoader />}>
            <AdminNewsPage />
          </Suspense>
        ),
      },
      {
        path: 'admin/news/new',
        element: (
          <Suspense fallback={<PageLoader />}>
            <AdminNewsFormPage />
          </Suspense>
        ),
      },
      {
        path: 'admin/news/:id/edit',
        element: (
          <Suspense fallback={<PageLoader />}>
            <AdminNewsFormPage />
          </Suspense>
        ),
      },
      {
        path: 'admin/promocodes',
        element: (
          <Suspense fallback={<PageLoader />}>
            <AdminPromoCodesPage />
          </Suspense>
        ),
      },
      {
        path: 'admin/promocodes/:batchId',
        element: (
          <Suspense fallback={<PageLoader />}>
            <AdminPromoBatchDetailPage />
          </Suspense>
        ),
      },
      {
        path: 'admin/quotes',
        element: (
          <Suspense fallback={<PageLoader />}>
            <AdminQuotesPage />
          </Suspense>
        ),
      },
      {
        path: 'admin/messages',
        element: (
          <Suspense fallback={<PageLoader />}>
            <AdminMessagesPage />
          </Suspense>
        ),
      },
      {
        path: 'admin/managers',
        element: (
          <Suspense fallback={<PageLoader />}>
            <AdminManagersPage />
          </Suspense>
        ),
      },
      {
        path: 'admin/stats',
        element: (
          <Suspense fallback={<PageLoader />}>
            <AdminStatsPage />
          </Suspense>
        ),
      },
      {
        path: 'author/stats',
        element: (
          <Suspense fallback={<PageLoader />}>
            <AuthorStatsPage />
          </Suspense>
        ),
      },
      {
        path: 'author/stats/:authorId',
        element: (
          <Suspense fallback={<PageLoader />}>
            <AuthorStatsPage />
          </Suspense>
        ),
      },
      {
        path: 'admin/authors/:authorId',
        element: (
          <Suspense fallback={<PageLoader />}>
            <AuthorStatsPage />
          </Suspense>
        ),
      },
      {
        path: 'admin/readers',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ReadersPage />
          </Suspense>
        ),
      },
      {
        path: 'admin/readers/new',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ReaderCreatePage />
          </Suspense>
        ),
      },
      {
        path: 'admin/readers/:id/edit',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ReaderEditPage />
          </Suspense>
        ),
      },
      {
        path: 'admin/readers/:id',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ReaderEditPage />
          </Suspense>
        ),
      },
      {
        path: 'admin/books/new',
        element: (
          <Suspense fallback={<PageLoader />}>
            <BookFormPage />
          </Suspense>
        ),
      },
      {
        path: 'admin/books/:id/edit',
        element: (
          <Suspense fallback={<PageLoader />}>
            <BookFormPage />
          </Suspense>
        ),
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
  {
    path: '/read/:id',
    element: (
      <Suspense fallback={<PageLoader />}>
        <ReaderPage />
      </Suspense>
    ),
  },
]);
