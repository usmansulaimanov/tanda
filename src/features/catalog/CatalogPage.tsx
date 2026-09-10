import React, { useState, useMemo } from 'react';
import { useBookStore } from '../../store/useBookStore';
import { BookCard } from '../../components/ui/BookCard';

const CATEGORIES = [
  'Бәрі',
  'Көркем әдебиет',
  'Детектив',
  'Романтика',
  'Фэнтези',
  'Фантастика',
  'Мистика және хоррор',
  'Психология',
  'Өзін-өзі дамыту',
  'Бизнес және қаржы',
  'Тарих',
  'Руханият және философия',
  'Білім және ғылым',
  'Балалар әдебиеті',
  'Жасөспірімдер әдебиеті',
  'Өмірбаян және мемуар',
];

export const CatalogPage: React.FC = () => {
  const { books, searchQuery, setSearchQuery } = useBookStore();
  const [selectedCat, setSelectedCat] = useState('Бәрі');

  const activeBooks = useMemo(() => {
    return books.filter((b) => !b.isArchived);
  }, [books]);

  const filteredBooks = useMemo(() => {
    return activeBooks.filter((book) => {
      if (selectedCat !== 'Бәрі' && book.category !== selectedCat) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          book.title.toLowerCase().includes(q) ||
          book.author.toLowerCase().includes(q) ||
          book.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [activeBooks, selectedCat, searchQuery]);

  return (
    <section className="catalog-section tanda-section" style={{ minHeight: '80vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div className="catalog-header">
          <div>
            <span className="section-tag">Каталог</span>
            <h2 className="section-title">Кітаптар қоры</h2>
            <p className="section-sub">Барлығы {filteredBooks.length} кітап табылды</p>
          </div>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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

        <div className="books-grid">
          {filteredBooks.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>

        {filteredBooks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-mid)' }}>
            Сәйкес келетін кітаптар табылмады.
          </div>
        )}
      </div>
    </section>
  );
};
