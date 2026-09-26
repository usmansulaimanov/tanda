import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Skeleton } from '../shared/ui';

// Helper to auto-recover when dynamic chunks are 404/stale due to new deployments
function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error: any) {
      const msg = error?.message || '';
      const isChunkError =
        msg.includes('Failed to fetch dynamically imported module') ||
        msg.includes('Importing a module script failed') ||
        msg.includes('error loading dynamically imported module') ||
        msg.includes('Loading chunk');

      const lastReload = typeof window !== 'undefined' ? sessionStorage.getItem('chunk_reload_ts') : null;
      const now = Date.now();
      const canReload = !lastReload || now - parseInt(lastReload, 10) > 10000;

      if (isChunkError && canReload && typeof window !== 'undefined') {
        sessionStorage.setItem('chunk_reload_ts', String(now));
        window.location.reload();
        return new Promise<{ default: T }>(() => {});
      }
      throw error;
    }
  });
}

// Lazy-loaded page components for optimal bundle splitting
const LandingPage = lazyWithRetry(() => import('../features/landing/LandingPage').then((m) => ({ default: m.LandingPage })));
const CatalogPage = lazyWithRetry(() => import('../features/catalog/CatalogPage').then((m) => ({ default: m.CatalogPage })));
const BookDetailPage = lazyWithRetry(() => import('../features/book/BookDetailPage').then((m) => ({ default: m.BookDetailPage })));
const ReaderPage = lazyWithRetry(() => import('../features/reader/ReaderPage').then((m) => ({ default: m.ReaderPage })));
const AdminHomePage = lazyWithRetry(() => import('../features/admin/AdminHomePage').then((m) => ({ default: m.AdminHomePage })));
const AdminDashboard = lazyWithRetry(() => import('../features/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const BookFormPage = lazyWithRetry(() => import('../features/admin/BookFormPage').then((m) => ({ default: m.BookFormPage })));
const ReadersPage = lazyWithRetry(() => import('../features/admin/ReadersPage').then((m) => ({ default: m.ReadersPage })));
const ReaderCreatePage = lazyWithRetry(() => import('../features/admin/ReaderCreatePage').then((m) => ({ default: m.ReaderCreatePage })));
const ReaderEditPage = lazyWithRetry(() => import('../features/admin/ReaderEditPage').then((m) => ({ default: m.ReaderEditPage })));
const ProfilePage = lazyWithRetry(() => import('../features/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const MyBooksPage = lazyWithRetry(() => import('../features/books/MyBooksPage').then((m) => ({ default: m.MyBooksPage })));
const SettingsPage = lazyWithRetry(() => import('../features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const PromoCodePage = lazyWithRetry(() => import('../features/promo/PromoCodePage').then((m) => ({ default: m.PromoCodePage })));
const ReaderQuotesPage = lazyWithRetry(() => import('../features/quotes/ReaderQuotesPage').then((m) => ({ default: m.ReaderQuotesPage })));
const AdminPromoCodesPage = lazyWithRetry(() => import('../features/admin/AdminPromoCodesPage').then((m) => ({ default: m.AdminPromoCodesPage })));
const AdminPromoBatchDetailPage = lazyWithRetry(() => import('../features/admin/AdminPromoBatchDetailPage').then((m) => ({ default: m.AdminPromoBatchDetailPage })));
const AdminQuotesPage = lazyWithRetry(() => import('../features/admin/AdminQuotesPage').then((m) => ({ default: m.AdminQuotesPage })));
const AdminMessagesPage = lazyWithRetry(() => import('../features/admin/AdminMessagesPage').then((m) => ({ default: m.AdminMessagesPage })));
const ReaderMessagesPage = lazyWithRetry(() => import('../features/messages/ReaderMessagesPage').then((m) => ({ default: m.ReaderMessagesPage })));
const AdminManagersPage = lazyWithRetry(() => import('../features/admin/AdminManagersPage').then((m) => ({ default: m.AdminManagersPage })));
const AuthPage = lazyWithRetry(() => import('../features/auth/AuthPage').then((m) => ({ default: m.AuthPage })));
const AudioPlayerPage = lazyWithRetry(() => import('../features/player/AudioPlayerPage').then((m) => ({ default: m.AudioPlayerPage })));
const NewsPage = lazyWithRetry(() => import('../features/news/NewsPage').then((m) => ({ default: m.NewsPage })));
const NewsDetailPage = lazyWithRetry(() => import('../features/news/NewsDetailPage').then((m) => ({ default: m.NewsDetailPage })));
const AdminNewsPage = lazyWithRetry(() => import('../features/admin/AdminNewsPage').then((m) => ({ default: m.AdminNewsPage })));
const AdminNewsFormPage = lazyWithRetry(() => import('../features/admin/AdminNewsFormPage').then((m) => ({ default: m.AdminNewsFormPage })));
const AdminStatsPage = lazyWithRetry(() => import('../features/admin/AdminStatsPage').then((m) => ({ default: m.AdminStatsPage })));
const AdminUsernamesPage = lazyWithRetry(() => import('../features/admin/AdminUsernamesPage').then((m) => ({ default: m.AdminUsernamesPage })));
const AuthorHomePage = lazyWithRetry(() => import('../features/author/AuthorHomePage').then((m) => ({ default: m.AuthorHomePage })));
const AuthorBooksPage = lazyWithRetry(() => import('../features/author/AuthorBooksPage').then((m) => ({ default: m.AuthorBooksPage })));
const AuthorStatsPage = lazyWithRetry(() => import('../features/author/AuthorStatsPage').then((m) => ({ default: m.AuthorStatsPage })));
const BookStatsPage = lazyWithRetry(() => import('../features/books/BookStatsPage').then((m) => ({ default: m.BookStatsPage })));
const BookAudiencePage = lazyWithRetry(() => import('../features/books/BookAudiencePage').then((m) => ({ default: m.BookAudiencePage })));
const UserBookStatsPage = lazyWithRetry(() => import('../features/books/UserBookStatsPage').then((m) => ({ default: m.UserBookStatsPage })));
const AdminReaderStatsPage = lazyWithRetry(() => import('../features/admin/AdminReaderStatsPage').then((m) => ({ default: m.AdminReaderStatsPage })));
const LeaderboardPage = lazyWithRetry(() => import('../features/leaderboard/LeaderboardPage').then((m) => ({ default: m.LeaderboardPage })));
const AdminLeaderboardPage = lazyWithRetry(() => import('../features/admin/AdminLeaderboardPage').then((m) => ({ default: m.AdminLeaderboardPage })));


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

import { useAuthStore } from '../store/useAuthStore';

const ReaderLandingRoute: React.FC = () => {
  const { user, role, isAuthenticated, isAuthInitialized } = useAuthStore();

  if (!isAuthInitialized) {
    return <PageLoader />;
  }

  const isAuthor = Boolean(isAuthenticated && user && (role === 'author' || user.role === 'author' || user.isAuthor));
  const isStaff = Boolean(isAuthenticated && user && !isAuthor && (role === 'admin' || user.role === 'admin' || user.isSuperAdmin || Boolean(user.duty)));

  if (isAuthor) {
    return <Navigate to="/author/home" replace />;
  }

  if (isStaff) {
    return <Navigate to="/admin/home" replace />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <LandingPage />
    </Suspense>
  );
};

const AdminRouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role, isAuthenticated, isAuthInitialized } = useAuthStore();

  if (!isAuthInitialized) {
    return <PageLoader />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const isAuthor = Boolean(role === 'author' || user.role === 'author' || user.isAuthor);
  const isAdminOrStaff = Boolean(role === 'admin' || user.role === 'admin' || user.isSuperAdmin || Boolean(user.duty));

  if (isAuthor) {
    return <Navigate to="/author/home" replace />;
  }

  if (!isAdminOrStaff) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const AuthorRouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role, isAuthenticated, isAuthInitialized } = useAuthStore();

  if (!isAuthInitialized) {
    return <PageLoader />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const isAuthor = Boolean(role === 'author' || user.role === 'author' || user.isAuthor);
  const isStaff = Boolean(role === 'admin' || user.role === 'admin' || user.isSuperAdmin || Boolean(user.duty));

  if (!isAuthor) {
    if (isStaff) {
      return <Navigate to="/admin/home" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const ReaderOnlyRouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role, isAuthenticated, isAuthInitialized } = useAuthStore();

  if (!isAuthInitialized) {
    return <PageLoader />;
  }

  const isAuthor = Boolean(isAuthenticated && user && (role === 'author' || user.role === 'author' || user.isAuthor));
  const isStaff = Boolean(isAuthenticated && user && !isAuthor && (role === 'admin' || user.role === 'admin' || user.isSuperAdmin || Boolean(user.duty)));

  if (isAuthor) {
    return <Navigate to="/author/home" replace />;
  }

  if (isStaff) {
    return <Navigate to="/admin/home" replace />;
  }

  return <>{children}</>;
};

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
        element: <ReaderLandingRoute />,
      },
      {
        path: 'catalog',
        element: <Navigate to="/#catalog" replace />,
      },
      {
        path: 'book/:id',
        element: (
          <ReaderOnlyRouteGuard>
            <Suspense fallback={<PageLoader />}>
              <BookDetailPage />
            </Suspense>
          </ReaderOnlyRouteGuard>
        ),
      },
      {
        path: 'listen/:id',
        element: (
          <ReaderOnlyRouteGuard>
            <Suspense fallback={<PageLoader />}>
              <AudioPlayerPage />
            </Suspense>
          </ReaderOnlyRouteGuard>
        ),
      },
      {
        path: 'profile',
        element: (
          <ReaderOnlyRouteGuard>
            <Suspense fallback={<PageLoader />}>
              <ProfilePage />
            </Suspense>
          </ReaderOnlyRouteGuard>
        ),
      },
      {
        path: 'my-books',
        element: (
          <ReaderOnlyRouteGuard>
            <Suspense fallback={<PageLoader />}>
              <MyBooksPage />
            </Suspense>
          </ReaderOnlyRouteGuard>
        ),
      },
      {
        path: 'quotes',
        element: (
          <ReaderOnlyRouteGuard>
            <Suspense fallback={<PageLoader />}>
              <ReaderQuotesPage />
            </Suspense>
          </ReaderOnlyRouteGuard>
        ),
      },
      {
        path: 'messages',
        element: (
          <ReaderOnlyRouteGuard>
            <Suspense fallback={<PageLoader />}>
              <ReaderMessagesPage />
            </Suspense>
          </ReaderOnlyRouteGuard>
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
        path: 'rating',
        element: (
          <Suspense fallback={<PageLoader />}>
            <LeaderboardPage />
          </Suspense>
        ),
      },
      {
        path: 'leaderboard',
        element: <Navigate to="/rating" replace />,
      },
      {
        path: 'promocode',
        element: (
          <ReaderOnlyRouteGuard>
            <Suspense fallback={<PageLoader />}>
              <PromoCodePage />
            </Suspense>
          </ReaderOnlyRouteGuard>
        ),
      },
      {
        path: 'admin/home',
        element: (
          <AdminRouteGuard>
            <Suspense fallback={<PageLoader />}>
              <AdminHomePage />
            </Suspense>
          </AdminRouteGuard>
        ),
      },
      {
        path: 'admin/rating',
        element: (
          <AdminRouteGuard>
            <Suspense fallback={<PageLoader />}>
              <AdminLeaderboardPage />
            </Suspense>
          </AdminRouteGuard>
        ),
      },
      {
        path: 'admin/leaderboard',
        element: <Navigate to="/admin/rating" replace />,
      },
      {
        path: 'admin',
        element: (
          <AdminRouteGuard>
            <Suspense fallback={<PageLoader />}>
              <AdminDashboard />
            </Suspense>
          </AdminRouteGuard>
        ),
      },
      {
        path: 'admin/news',
        element: (
          <AdminRouteGuard>
            <Suspense fallback={<PageLoader />}>
              <AdminNewsPage />
            </Suspense>
          </AdminRouteGuard>
        ),
      },
      {
        path: 'admin/news/new',
        element: (
          <AdminRouteGuard>
            <Suspense fallback={<PageLoader />}>
              <AdminNewsFormPage />
            </Suspense>
          </AdminRouteGuard>
        ),
      },
      {
        path: 'admin/news/:id/edit',
        element: (
          <AdminRouteGuard>
            <Suspense fallback={<PageLoader />}>
              <AdminNewsFormPage />
            </Suspense>
          </AdminRouteGuard>
        ),
      },
      {
        path: 'admin/promocodes',
        element: (
          <AdminRouteGuard>
            <Suspense fallback={<PageLoader />}>
              <AdminPromoCodesPage />
            </Suspense>
          </AdminRouteGuard>
        ),
      },
      {
        path: 'admin/promocodes/:batchId',
        element: (
          <AdminRouteGuard>
            <Suspense fallback={<PageLoader />}>
              <AdminPromoBatchDetailPage />
            </Suspense>
          </AdminRouteGuard>
        ),
      },
      {
        path: 'admin/quotes',
        element: (
          <AdminRouteGuard>
            <Suspense fallback={<PageLoader />}>
              <AdminQuotesPage />
            </Suspense>
          </AdminRouteGuard>
        ),
      },
      {
        path: 'admin/messages',
        element: (
          <AdminRouteGuard>
            <Suspense fallback={<PageLoader />}>
              <AdminMessagesPage />
            </Suspense>
          </AdminRouteGuard>
        ),
      },
      {
        path: 'admin/managers',
        element: (
          <AdminRouteGuard>
            <Suspense fallback={<PageLoader />}>
              <AdminManagersPage />
            </Suspense>
          </AdminRouteGuard>
        ),
      },
      {
        path: 'admin/stats',
        element: (
          <AdminRouteGuard>
            <Suspense fallback={<PageLoader />}>
              <AdminStatsPage />
            </Suspense>
          </AdminRouteGuard>
        ),
      },
      {
        path: 'admin/usernames',
        element: (
          <AdminRouteGuard>
            <Suspense fallback={<PageLoader />}>
              <AdminUsernamesPage />
            </Suspense>
          </AdminRouteGuard>
        ),
      },
      {
        path: 'author/home',
        element: (
          <AuthorRouteGuard>
            <Suspense fallback={<PageLoader />}>
              <AuthorHomePage />
            </Suspense>
          </AuthorRouteGuard>
        ),
      },
      {
        path: 'author/books',
        element: (
          <AuthorRouteGuard>
            <Suspense fallback={<PageLoader />}>
              <AuthorBooksPage />
            </Suspense>
          </AuthorRouteGuard>
        ),
      },
      {
        path: 'author',
        element: <Navigate to="/author/home" replace />,
      },
      {
        path: 'author/stats',
        element: (
          <AuthorRouteGuard>
            <Suspense fallback={<PageLoader />}>
              <AuthorStatsPage />
            </Suspense>
          </AuthorRouteGuard>
        ),
      },
      {
        path: 'author/stats/:authorId',
        element: (
          <AuthorRouteGuard>
            <Suspense fallback={<PageLoader />}>
              <AuthorStatsPage />
            </Suspense>
          </AuthorRouteGuard>
        ),
      },
      {
        path: 'author/books/:bookId/stats',
        element: (
          <AuthorRouteGuard>
            <Suspense fallback={<PageLoader />}>
              <BookStatsPage />
            </Suspense>
          </AuthorRouteGuard>
        ),
      },
      {
        path: 'admin/books/:bookId/stats',
        element: (
          <AdminRouteGuard>
            <Suspense fallback={<PageLoader />}>
              <BookStatsPage />
            </Suspense>
          </AdminRouteGuard>
        ),
      },
      {
        path: 'admin/books/:bookId/audience',
        element: (
          <AdminRouteGuard>
            <Suspense fallback={<PageLoader />}>
              <BookAudiencePage />
            </Suspense>
          </AdminRouteGuard>
        ),
      },
      {
        path: 'admin/books/:bookId/readers/:userId/stats',
        element: (
          <AdminRouteGuard>
            <Suspense fallback={<PageLoader />}>
              <UserBookStatsPage />
            </Suspense>
          </AdminRouteGuard>
        ),
      },
      {
        path: 'admin/readers/:id/stats',
        element: (
          <AdminRouteGuard>
            <Suspense fallback={<PageLoader />}>
              <AdminReaderStatsPage />
            </Suspense>
          </AdminRouteGuard>
        ),
      },
      {
        path: 'admin/stats/readers/:id',
        element: (
          <AdminRouteGuard>
            <Suspense fallback={<PageLoader />}>
              <AdminReaderStatsPage />
            </Suspense>
          </AdminRouteGuard>
        ),
      },
      {
        path: 'admin/authors/:authorId',
        element: (
          <AdminRouteGuard>
            <Suspense fallback={<PageLoader />}>
              <AuthorStatsPage />
            </Suspense>
          </AdminRouteGuard>
        ),
      },

      {
        path: 'admin/readers',
        element: (
          <AdminRouteGuard>
            <Suspense fallback={<PageLoader />}>
              <ReadersPage />
            </Suspense>
          </AdminRouteGuard>
        ),
      },
      {
        path: 'admin/readers/new',
        element: (
          <AdminRouteGuard>
            <Suspense fallback={<PageLoader />}>
              <ReaderCreatePage />
            </Suspense>
          </AdminRouteGuard>
        ),
      },
      {
        path: 'admin/readers/:id/edit',
        element: (
          <AdminRouteGuard>
            <Suspense fallback={<PageLoader />}>
              <ReaderEditPage />
            </Suspense>
          </AdminRouteGuard>
        ),
      },
      {
        path: 'admin/readers/:id',
        element: (
          <AdminRouteGuard>
            <Suspense fallback={<PageLoader />}>
              <ReaderEditPage />
            </Suspense>
          </AdminRouteGuard>
        ),
      },
      {
        path: 'admin/books/new',
        element: (
          <AdminRouteGuard>
            <Suspense fallback={<PageLoader />}>
              <BookFormPage />
            </Suspense>
          </AdminRouteGuard>
        ),
      },
      {
        path: 'admin/books/:id/edit',
        element: (
          <AdminRouteGuard>
            <Suspense fallback={<PageLoader />}>
              <BookFormPage />
            </Suspense>
          </AdminRouteGuard>
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
      <ReaderOnlyRouteGuard>
        <Suspense fallback={<PageLoader />}>
          <ReaderPage />
        </Suspense>
      </ReaderOnlyRouteGuard>
    ),
  },
]);
