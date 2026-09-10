import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, Search, ShieldCheck, User, Menu, X, Headphones } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useBookStore } from '../../store/useBookStore';
import { Button } from '../ui/Button';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, setRole } = useAuthStore();
  const { searchQuery, setSearchQuery } = useBookStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (location.pathname !== '/catalog') {
      navigate('/catalog');
    }
  };

  const toggleRole = () => {
    const newRole = role === 'admin' ? 'client' : 'admin';
    setRole(newRole);
    if (newRole === 'admin') {
      navigate('/admin');
    } else {
      navigate('/');
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0057A8] to-[#003d7a] flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-[#0057A8] to-[#F08000] bg-clip-text text-transparent">
              Tanda
            </span>
          </Link>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Кітапты, авторды немесе жанрды іздеу..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-[#0057A8] rounded-xl text-sm transition-all outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </form>

          {/* Navigation links */}
          <nav className="hidden lg:flex items-center gap-1">
            <Link
              to="/"
              className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                isActive('/') ? 'text-[#0057A8] bg-blue-50/70 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Басты бет
            </Link>
            <Link
              to="/catalog"
              className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                isActive('/catalog') ? 'text-[#0057A8] bg-blue-50/70 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Каталог
            </Link>
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            {/* Role Switcher Pill */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/60 text-xs font-medium">
              <button
                onClick={() => {
                  setRole('client');
                  navigate('/');
                }}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  role === 'client'
                    ? 'bg-white text-slate-900 shadow-sm font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Оқырман
              </button>
              <button
                onClick={() => {
                  setRole('admin');
                  navigate('/admin');
                }}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  role === 'admin'
                    ? 'bg-[#0057A8] text-white shadow-sm font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Әкімші
              </button>
            </div>

            {role === 'admin' ? (
              <Link to="/admin">
                <Button size="sm" variant="primary" className="gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Админ панель
                </Button>
              </Link>
            ) : (
              <Link to="/catalog">
                <Button size="sm" variant="secondary" className="gap-1.5">
                  <Headphones className="w-4 h-4" />
                  Кітап оқу
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-slate-100 space-y-3">
            <form onSubmit={handleSearch} className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Кітап іздеу..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              />
            </form>
            <div className="flex flex-col gap-1">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Басты бет
              </Link>
              <Link
                to="/catalog"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Каталог
              </Link>
              <Link
                to="/admin"
                onClick={() => {
                  setRole('admin');
                  setMobileMenuOpen(false);
                }}
                className="px-3 py-2 rounded-lg text-sm font-medium text-[#0057A8] bg-blue-50"
              >
                Админ панель
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
