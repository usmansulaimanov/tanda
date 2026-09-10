import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Book } from '../../types';
import { useAudioPlayerStore } from '../../store/useAudioPlayerStore';

interface BookCardProps {
  book: Book;
}

export const BookCard: React.FC<BookCardProps> = ({ book }) => {
  const navigate = useNavigate();
  const { playBook } = useAudioPlayerStore();

  const handleListenClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    playBook(book);
  };

  return (
    <div
      className="book-card"
      onClick={() => navigate(`/book/${book.id}`)}
      style={{ cursor: 'pointer' }}
    >
      <div
        className="book-cover"
        style={{
          background: book.coverImage
            ? `url(${book.coverImage}) center/cover`
            : (book.gradient || 'linear-gradient(135deg, #0057A8, #003d7a)'),
        }}
      >
        <span className={`cover-badge ${book.isFree ? 'badge-free' : 'badge-premium'}`}>
          {book.isFree ? 'Тегін' : 'Премиум'}
        </span>
        <div className="cover-title">{book.title}</div>
        <div className="cover-author-text">{book.author}</div>
      </div>

      <div className="book-meta">
        <div className="book-title">{book.title}</div>
        <div className="book-author">{book.author}</div>
        <span className="book-category">{book.category}</span>
      </div>

      <div className="book-actions" onClick={(e) => e.stopPropagation()}>
        <Link to={`/read/${book.id}`} className="btn-book-action btn-read">
          Оқу
        </Link>
        {book.hasAudio ? (
          <button
            type="button"
            onClick={handleListenClick}
            className="btn-book-action btn-listen"
          >
            Тыңдау
          </button>
        ) : (
          <button
            type="button"
            onClick={() => navigate(`/book/${book.id}`)}
            className="btn-book-action"
            style={{ background: '#F1F5F9', color: 'var(--text-mid)' }}
          >
            Қарау
          </button>
        )}
      </div>
    </div>
  );
};
