import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useBookStore } from '../../store/useBookStore';
import { useAuthStore } from '../../store/useAuthStore';
import { BookCard } from '../../components/ui/BookCard';
import { AdminDashboard } from '../admin/AdminDashboard';

const CATEGORIES = [
  'Бәрі',
  'Классика',
  'Тұлғалық даму',
  'Тарих',
  'Ертегілер',
  'Бизнес',
  'Психология',
];

export const LandingPage: React.FC = () => {
  const { books } = useBookStore();
  const { role, users } = useAuthStore();
  const [selectedCat, setSelectedCat] = useState('Бәрі');
  const [search, setSearch] = useState('');

  // If logged in as admin, show only the management panel
  if (role === 'admin') {
    return <AdminDashboard />;
  }

  // Dynamic statistics matching the database exactly
  const booksCount = books.length;
  const authorsCount = useMemo(() => {
    return new Set(books.map((b) => b.author?.trim()).filter(Boolean)).size;
  }, [books]);
  const readersCount = useMemo(() => {
    const clients = users.filter((u) => u.role === 'client');
    return clients.length > 0 ? clients.length : users.length;
  }, [users]);

  // Readers only see active, non-archived books
  const activeBooks = useMemo(() => {
    return books.filter((b) => !b.isArchived);
  }, [books]);

  // Filtered books for catalog grid
  const filteredBooks = useMemo(() => {
    return activeBooks.filter((book) => {
      if (selectedCat !== 'Бәрі' && book.category !== selectedCat) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          book.title.toLowerCase().includes(q) ||
          book.author.toLowerCase().includes(q) ||
          book.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [activeBooks, selectedCat, search]);

  return (
    <div>
      {/* HERO (Exact original markup & styling) */}
      <section className="hero" id="hero">
        <div className="hero-text">
          <span className="hero-tag">Қазақша контент платформасы</span>
          <h1>
            Оқы. Тыңда.<br />
            <span>Дамы.</span>
          </h1>
          <p className="hero-desc">
            Мыңдаған қазақша аудиокітаптар мен электронды кітаптар — бір қолыңның астында. Кез келген уақытта, кез келген жерде.
          </p>
          <div className="hero-buttons">
            <a href="#catalog" className="btn-primary">
              Кітаптарды көру
            </a>
          </div>
          <div className="hero-stats">
            <div>
              <div className="stat-num">{booksCount}</div>
              <div className="stat-label">Кітап</div>
            </div>
            <div>
              <div className="stat-num">{authorsCount}</div>
              <div className="stat-label">Авторлар</div>
            </div>
            <div>
              <div className="stat-num">{readersCount}</div>
              <div className="stat-label">Оқырман</div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES (Exact original markup & styling) */}
      <section className="features-section tanda-section" id="features">
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <span className="section-tag">Неге Tanda?</span>
            <h2 className="section-title">Бәрі бір жерде</h2>
            <p className="section-sub" style={{ margin: '0 auto' }}>
              Аудиокітаптар, электронды кітаптар, подкасттар — барлығы қазақ тілінде, сапалы дыбыс пен оқу тәжірибесімен.
            </p>
          </div>

          <div className="features-grid">
            <div className="feature-card accent">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 18v-6a9 9 0 0 1 18 0v6"></path>
                  <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path>
                </svg>
              </div>
              <h3>Аудиокітаптар</h3>
              <p>Кәсіби дикторлар орындаған мыңдаған аудиокітап. Жолда, спортта, демалыста — қашан болса да тыңда.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                </svg>
              </div>
              <h3>Электронды кітаптар</h3>
              <p>Ыңғайлы оқу режимі: шрифт өлшемі, сепия немесе түнгі фон түсі — бәрін өзіңізге ыңғайлап баптайсыз.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
              <h3>Жылдамдық пен Таймер</h3>
              <p>0.75x-тен 2x-ке дейін жылдамдықты таңдаңыз. Ұйықтар алдында автоматты өшетін ұйқы таймерін қосыңыз.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CATALOG (Exact original markup & styling) */}
      <section className="catalog-section tanda-section" id="catalog">
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div className="catalog-header">
            <div>
              <span className="section-tag">Кітап қоры</span>
              <h2 className="section-title">Танымал кітаптар</h2>
              <p className="section-sub">Қазақ әдебиетінің інжу-маржандары мен әлемдік үздік аудармалар</p>
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                id="catalogSearch"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-input"
                placeholder="Кітап немесе автор іздеу..."
              />
              <div className="catalog-tabs">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCat(cat)}
                    className={`tab ${selectedCat === cat ? 'active' : ''}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="books-grid" id="booksGrid">
            {filteredBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>

          {filteredBooks.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-mid)' }}>
              Кітаптар табылмады.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
