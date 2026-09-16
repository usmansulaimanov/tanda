import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Skeleton } from '../shared/ui';

// Lazy-loaded page components for optimal bundle splitting
const LandingPage = lazy(() => import('../features/landing/LandingPage').then((m) => ({ default: m.LandingPage })));
const CatalogPage = lazy(() => import('../features/catalog/CatalogPage').then((m) => ({ default: m.CatalogPage })));
const BookDetailPage = lazy(() => import('../features/book/BookDetailPage').then((m) => ({ default: m.BookDetailPage })));
const ReaderPage = lazy(() => import('../features/reader/ReaderPage').then((m) => ({ default: m.ReaderPage })));
const AdminDashboard = lazy(() => import('../features/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const BookFormPage = lazy(() => import('../features/admin/BookFormPage').then((m) => ({ default: m.BookFormPage })));
const ReadersPage = lazy(() => import('../features/admin/ReadersPage').then((m) => ({ default: m.ReadersPage })));
const ReaderEditPage = lazy(() => import('../features/admin/ReaderEditPage').then((m) => ({ default: m.ReaderEditPage })));
const ProfilePage = lazy(() => import('../features/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const SettingsPage = lazy(() => import('../features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const AuthPage = lazy(() => import('../features/auth/AuthPage').then((m) => ({ default: m.AuthPage })));

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
        path: 'profile',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProfilePage />
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
        path: 'admin',
        element: (
          <Suspense fallback={<PageLoader />}>
            <AdminDashboard />
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
