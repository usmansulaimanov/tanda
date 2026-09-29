import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Compass, BookMarked, User, BarChart3, Users, BookOpen, Settings } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useMessageStore } from '../../store/useMessageStore';
import { hasAdminPermission } from '../../utils/permissions';

export const MobileBottomNav: React.FC = () => {
  const location = useLocation();
  const { user, role, isAuthenticated } = useAuthStore();
  const { getUnreadCountForUser, messages } = useMessageStore();

  const isListenPage = location.pathname.startsWith('/listen');
  const isReadPage = location.pathname.startsWith('/read');

  // Hide bottom nav on full-screen reader or player pages
  if (isListenPage || isReadPage) {
    return null;
  }

  const unreadMessagesCount = React.useMemo(() => {
    if (!user) return 0;
    return getUnreadCountForUser(user.id);
  }, [user, messages, getUnreadCountForUser]);

  const isAdmin = Boolean(
    isAuthenticated && user && (role === 'admin' || user.role === 'admin' || user.isSuperAdmin)
  );

  const isAuthor = Boolean(
    isAuthenticated && user && !isAdmin && (role === 'author' || user.role === 'author' || user.isAuthor)
  );

  return (
    <nav
      aria-label="Мобильді навигация"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)',
      }}
    >
      <div className="grid grid-cols-4 h-14 items-center px-1 max-w-md mx-auto">
        {isAdmin ? (
          // Admin navigation items
          <>
            <NavLink
              to="/admin/home"
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 transition-all py-1 ${
                  isActive || location.pathname === '/admin'
                    ? 'text-[#005494] font-bold'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`
              }
            >
              <Home className="w-5 h-5" />
              <span className="text-[10px] leading-none">Басты бет</span>
            </NavLink>

            <NavLink
              to="/admin/readers"
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 transition-all py-1 ${
                  isActive
                    ? 'text-[#005494] font-bold'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`
              }
            >
              <Users className="w-5 h-5" />
              <span className="text-[10px] leading-none">Оқырмандар</span>
            </NavLink>

            {hasAdminPermission(user, 'analytics_view') ? (
              <NavLink
                to="/admin/stats"
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-1 transition-all py-1 ${
                    isActive
                      ? 'text-[#005494] font-bold'
                      : 'text-slate-500 hover:text-slate-800 font-medium'
                  }`
                }
              >
                <BarChart3 className="w-5 h-5" />
                <span className="text-[10px] leading-none">Статистика</span>
              </NavLink>
            ) : (
              <NavLink
                to="/admin/books"
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-1 transition-all py-1 ${
                    isActive
                      ? 'text-[#005494] font-bold'
                      : 'text-slate-500 hover:text-slate-800 font-medium'
                  }`
                }
              >
                <BookOpen className="w-5 h-5" />
                <span className="text-[10px] leading-none">Кітаптар</span>
              </NavLink>
            )}

            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 transition-all py-1 relative ${
                  isActive
                    ? 'text-[#005494] font-bold'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`
              }
            >
              <Settings className="w-5 h-5" />
              <span className="text-[10px] leading-none">Баптау</span>
            </NavLink>
          </>
        ) : isAuthor ? (
          // Author navigation items
          <>
            <NavLink
              to="/author/home"
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 transition-all py-1 ${
                  isActive || location.pathname === '/author'
                    ? 'text-[#005494] font-bold'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`
              }
            >
              <Home className="w-5 h-5" />
              <span className="text-[10px] leading-none">Басты бет</span>
            </NavLink>

            <NavLink
              to="/author/books"
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 transition-all py-1 ${
                  isActive
                    ? 'text-[#005494] font-bold'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`
              }
            >
              <BookOpen className="w-5 h-5" />
              <span className="text-[10px] leading-none">Кітаптарым</span>
            </NavLink>

            <NavLink
              to="/author/stats"
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 transition-all py-1 ${
                  isActive
                    ? 'text-[#005494] font-bold'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`
              }
            >
              <BarChart3 className="w-5 h-5" />
              <span className="text-[10px] leading-none">Статистика</span>
            </NavLink>

            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 transition-all py-1 ${
                  isActive
                    ? 'text-[#005494] font-bold'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`
              }
            >
              <Settings className="w-5 h-5" />
              <span className="text-[10px] leading-none">Баптау</span>
            </NavLink>
          </>
        ) : (
          // Reader / Client / Guest navigation items
          <>
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 transition-all py-1 ${
                  isActive
                    ? 'text-[#005494] font-bold'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`
              }
            >
              <Home className="w-5 h-5" />
              <span className="text-[10px] leading-none">Басты бет</span>
            </NavLink>

            <NavLink
              to="/catalog"
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 transition-all py-1 ${
                  isActive || location.pathname.startsWith('/book/')
                    ? 'text-[#005494] font-bold'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`
              }
            >
              <Compass className="w-5 h-5" />
              <span className="text-[10px] leading-none">Каталог</span>
            </NavLink>

            <NavLink
              to={isAuthenticated ? '/my-books' : '/login?redirect=/my-books'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 transition-all py-1 ${
                  isActive || location.pathname.startsWith('/my-books')
                    ? 'text-[#005494] font-bold'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`
              }
            >
              <BookMarked className="w-5 h-5" />
              <span className="text-[10px] leading-none">Менің сөрем</span>
            </NavLink>

            <NavLink
              to={isAuthenticated ? '/profile' : '/login'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 transition-all py-1 relative ${
                  isActive ||
                  location.pathname.startsWith('/profile') ||
                  location.pathname.startsWith('/settings') ||
                  location.pathname.startsWith('/login') ||
                  location.pathname.startsWith('/signup')
                    ? 'text-[#005494] font-bold'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`
              }
            >
              <div className="relative">
                <User className="w-5 h-5" />
                {unreadMessagesCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] bg-rose-600 text-white text-[9px] font-black rounded-full flex items-center justify-center px-0.5 border border-white">
                    {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] leading-none">
                {isAuthenticated ? 'Профиль' : 'Кіру'}
              </span>
            </NavLink>
          </>
        )}
      </div>
    </nav>
  );
};
