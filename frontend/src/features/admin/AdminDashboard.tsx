import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useBookStore } from '../../store/useBookStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import { Book } from '../../types';
import { hasAdminPermission } from '../../utils/permissions';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { books, toggleArchive, deleteBook, deleteBooks, fetchBooks } = useBookStore();
  const { showToast } = useToastStore();

  const canCreateBooks = hasAdminPermission(user, 'books_create');
  const canEditBooks = hasAdminPermission(user, 'books_edit');
  const canDeleteBooks = hasAdminPermission(user, 'books_delete');

  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'archived'>('all');
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  React.useEffect(() => {
    fetchBooks({ includeArchived: true });
  }, [fetchBooks]);

  const activeCount = useMemo(() => books.filter((b) => !b.isArchived).length, [books]);
  const archivedCount = useMemo(() => books.filter((b) => b.isArchived).length, [books]);

  const filteredBooks = useMemo(() => {
    return books.filter((b) => {
      if (filterStatus === 'active' && b.isArchived) return false;
      if (filterStatus === 'archived' && !b.isArchived) return false;
      return true;
    });
  }, [books, filterStatus]);

  const isAllSelected = filteredBooks.length > 0 && selectedBookIds.length === filteredBooks.length;
  const isSomeSelected = selectedBookIds.length > 0 && selectedBookIds.length < filteredBooks.length;

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedBookIds([]);
    } else {
      setSelectedBookIds(filteredBooks.map((b) => b.id));
    }
  };

  const handleSelectBook = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedBookIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkArchive = () => {
    selectedBookIds.forEach((id) => {
      toggleArchive(id);
    });
    showToast(`Таңдалған ${selectedBookIds.length} кітаптың статусы жаңартылды`, 'success');
    setSelectedBookIds([]);
  };

  const confirmBulkDelete = () => {
    if (selectedBookIds.length > 0) {
      const count = selectedBookIds.length;
      deleteBooks(selectedBookIds);
      showToast(`Таңдалған ${count} кітап сәтті өшірілді`, 'info');
      setSelectedBookIds([]);
      setIsBulkDeleteModalOpen(false);
    }
  };

  const handleToggleArchive = (book: Book) => {
    toggleArchive(book.id);
    if (!book.isArchived) {
      showToast(`"${book.title}" архивке салынды (оқырмандарға көрінбейді)`, 'info');
    } else {
      showToast(`"${book.title}" архивтен шығарылды (оқырмандарға көрінеді)`, 'success');
    }
  };

  const confirmDelete = () => {
    if (bookToDelete) {
      deleteBook(bookToDelete.id);
      showToast(`"${bookToDelete.title}" кітабы біржола өшірілді`, 'info');
      setBookToDelete(null);
    }
  };

  return (
    <section className="admin-page-section" id="admin-section">
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <div className="admin-card">
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-dark)', margin: 0 }}>
                Басқару панелі
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-mid)', marginTop: '4px' }}>
                Барлығы: <span style={{ fontWeight: 700, color: 'var(--blue)' }}>{books.length}</span> кітап |
                Архивтелген (жасырын): <span style={{ fontWeight: 700, color: '#64748B' }}>{archivedCount}</span> кітап
              </p>
            </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setFilterStatus('all')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: filterStatus === 'all' ? '#FFFFFF' : '#64748B',
                        background: filterStatus === 'all' ? 'var(--blue)' : '#F1F5F9',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        border: `1.5px solid ${filterStatus === 'all' ? 'var(--blue)' : '#CBD5E1'}`,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      Барлығы
                    </button>

                <button
                  type="button"
                  onClick={() => setFilterStatus('active')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#047857',
                    background: filterStatus === 'active' ? '#D1FAE5' : '#ECFDF5',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: '1.5px solid #A7F3D0',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }}></span>
                  Белсенді ({activeCount})
                </button>

                <button
                  type="button"
                  onClick={() => setFilterStatus('archived')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#64748B',
                    background: filterStatus === 'archived' ? '#E2E8F0' : '#F1F5F9',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: '1.5px solid #CBD5E1',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#94A3B8' }}></span>
                  Архивте (Жасырын) ({archivedCount})
                </button>
              </div>

              {/* Add Book Button (navigates to /admin/books/new) */}
              {canCreateBooks && (
                <Link
                  to="/admin/books/new"
                  className="btn-primary"
                  style={{
                    textDecoration: 'none',
                    padding: '10px 24px',
                    fontSize: '14px',
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(240,128,0,0.25)',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Қосу
                </Link>
              )}
            </div>
          </div>

          {/* Bulk Selection Action Bar */}
          {selectedBookIds.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                padding: '12px 18px',
                background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
                border: '1.5px solid #93C5FD',
                borderRadius: '12px',
                marginBottom: '18px',
                boxShadow: '0 4px 12px rgba(0, 84, 148, 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    background: 'var(--blue)',
                    color: '#FFFFFF',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 800,
                  }}
                >
                  {selectedBookIds.length}
                </span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#1E3A8A' }}>
                  {selectedBookIds.length} кітап таңдалды
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedBookIds([])}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#2563EB',
                    fontSize: '13px',
                    fontWeight: 600,
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    padding: '0 4px',
                  }}
                >
                  Таңдауды алып тастау
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {canDeleteBooks && (
                  <button
                    type="button"
                    onClick={handleBulkArchive}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      background: '#FFFFFF',
                      color: '#475569',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                    }}
                  >
                    Архивтеу / Шығару
                  </button>
                )}

                {canDeleteBooks && (
                  <button
                    type="button"
                    onClick={() => setIsBulkDeleteModalOpen(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 18px',
                      background: '#DC2626',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    Таңдалғандарды өшіру ({selectedBookIds.length})
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isSomeSelected;
                      }}
                      onChange={handleSelectAll}
                      style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--blue)' }}
                      title={isAllSelected ? 'Барлығын таңдаудан алу' : 'Барлығын таңдау'}
                    />
                  </th>
                  <th style={{ width: '45px', textAlign: 'center' }}>№</th>
                  <th style={{ width: '60px' }}>Мұқаба</th>
                  <th>Атауы мен авторы</th>
                  <th>Жанры</th>
                  <th>Бет / Файлдар</th>
                  <th>Қолжетімділік</th>
                  <th>Көрінуі</th>
                  <th style={{ textAlign: 'right' }}>Әрекеттер</th>
                </tr>
              </thead>
              <tbody>
                {filteredBooks.map((book, index) => {
                  const isSelected = selectedBookIds.includes(book.id);
                  return (
                    <tr
                      key={book.id}
                      style={{
                        backgroundColor: isSelected ? 'rgba(0, 84, 148, 0.06)' : undefined,
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      {/* Checkbox selection cell */}
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          onClick={(e) => handleSelectBook(book.id, e)}
                          style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--blue)' }}
                        />
                      </td>

                      {/* Sequential № */}
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#64748B', fontSize: '12px' }}>
                        {index + 1}
                      </td>

                    {/* Thumbnail */}
                    <td>
                      <div
                        style={{
                          width: '44px',
                          height: '58px',
                          borderRadius: '6px',
                          background: book.gradient || '#0057A8',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#FFF',
                          fontSize: '8px',
                          fontWeight: 800,
                          textAlign: 'center',
                          padding: '2px',
                          overflow: 'hidden',
                          position: 'relative',
                        }}
                      >
                        {book.coverImage && (
                          <img
                            src={book.coverImage}
                            alt={book.title}
                            referrerPolicy="no-referrer"
                            style={{
                              position: 'absolute',
                              inset: 0,
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                        {!book.coverImage && book.title.slice(0, 10)}
                      </div>
                    </td>

                    {/* Title and Author */}
                    <td>
                      <div style={{ fontWeight: 800, color: 'var(--text-dark)', fontSize: '14px' }}>
                        {book.title}
                      </div>
                      <div style={{ color: 'var(--text-mid)', fontSize: '12px', marginTop: '2px' }}>
                        {book.author}
                      </div>
                    </td>

                    {/* Genre */}
                    <td>
                      <span className="book-category">{book.category}</span>
                    </td>

                    {/* Pages & Audio */}
                    <td>
                      <div style={{ fontSize: '12px', color: 'var(--text-dark)' }}>
                        {book.pages ? `${book.pages} бет` : (book.audioDuration || '—')}
                        {book.hasAudio && (
                          <span style={{ color: 'var(--orange)', fontWeight: 700, marginLeft: '6px' }}>
                            [Аудио]
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Pricing */}
                    <td>
                      <span
                        className={`cover-badge ${book.isFree ? 'badge-free' : 'badge-premium'}`}
                        style={{ position: 'static', display: 'inline-block', fontSize: '11px', padding: '3px 8px' }}
                      >
                        {book.isFree ? 'Тегін' : 'Премиум'}
                      </span>
                    </td>

                    {/* Visibility / Status */}
                    <td>
                      {book.isArchived ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: '#64748B',
                            background: '#F1F5F9',
                            padding: '4px 10px',
                            borderRadius: '50px',
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                        >
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94A3B8' }}></span>
                          Архивте
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: '#047857',
                            background: '#ECFDF5',
                            padding: '4px 10px',
                            borderRadius: '50px',
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                        >
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }}></span>
                          Белсенді
                        </span>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        {/* Edit */}
                        {canEditBooks && (
                          <Link
                            to={`/admin/books/${book.id}/edit`}
                            style={{
                              padding: '6px 12px',
                              fontSize: '12px',
                              fontWeight: 700,
                              background: '#EFF6FF',
                              color: '#1D4ED8',
                              borderRadius: '6px',
                              border: '1px solid #BFDBFE',
                              textDecoration: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            Өңдеу
                          </Link>
                        )}

                        {/* Archive / Unarchive */}
                        {canDeleteBooks && (
                          <button
                            type="button"
                            onClick={() => handleToggleArchive(book)}
                            style={{
                              padding: '6px 12px',
                              fontSize: '12px',
                              fontWeight: 700,
                              background: book.isArchived ? '#ECFDF5' : '#FFFBEB',
                              color: book.isArchived ? '#047857' : '#B45309',
                              borderRadius: '6px',
                              border: `1px solid ${book.isArchived ? '#A7F3D0' : '#FDE68A'}`,
                              cursor: 'pointer',
                            }}
                          >
                            {book.isArchived ? 'Шығару' : 'Архивтеу'}
                          </button>
                        )}

                        {/* Delete */}
                        {canDeleteBooks && (
                          <button
                            type="button"
                            onClick={() => setBookToDelete(book)}
                            style={{
                              padding: '6px 12px',
                              fontSize: '12px',
                              fontWeight: 700,
                              background: '#FEF2F2',
                              color: '#B91C1C',
                              borderRadius: '6px',
                              border: '1px solid #FECACA',
                              cursor: 'pointer',
                            }}
                          >
                            Өшіру
                          </button>
                        )}

                        {!canEditBooks && !canDeleteBooks && (
                          <span style={{ fontSize: '11px', color: '#94A3B8', fontStyle: 'italic', padding: '4px 8px' }}>
                            Тек көру
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>

          {filteredBooks.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-mid)' }}>
              Кітаптар жоқ немесе сүзгіге сәйкес келмейді.
            </div>
          )}

          {/* Pagination summary */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '20px',
              paddingTop: '16px',
              borderTop: '1px solid #E2E8F0',
            }}
          >
            <div style={{ fontSize: '13px', color: 'var(--text-mid)', fontWeight: 600 }}>
              1-{filteredBooks.length} кітап көрсетілуде (Барлығы: {books.length})
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {bookToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(13,27,42,0.7)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '460px',
              width: '100%',
              padding: '32px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '12px' }}>
              Кітапты өшіру
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-mid)', lineHeight: 1.6, marginBottom: '24px' }}>
              Сіз шынымен <strong style={{ color: 'var(--text-dark)' }}>{bookToDelete.title}</strong> кітабын өшіргіңіз келе ме?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setBookToDelete(null)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '50px',
                  border: '1px solid #CBD5E1',
                  background: '#FFF',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Болдырмау
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                style={{
                  padding: '10px 24px',
                  borderRadius: '50px',
                  border: 'none',
                  background: '#DC2626',
                  color: '#FFF',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Иә, өшіру
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {isBulkDeleteModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(13,27,42,0.7)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '460px',
              width: '100%',
              padding: '32px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: '#FEE2E2',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '12px' }}>
              Кітаптарды топтап өшіру
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-mid)', lineHeight: 1.6, marginBottom: '24px' }}>
              Сіз шынымен таңдалған <strong style={{ color: '#DC2626' }}>{selectedBookIds.length} кітапты</strong> біржола өшіргіңіз келе ме? Бұл әрекетті қайтару мүмкін емес.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '50px',
                  border: '1px solid #CBD5E1',
                  background: '#FFF',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Болдырмау
              </button>
              <button
                type="button"
                onClick={confirmBulkDelete}
                style={{
                  padding: '10px 24px',
                  borderRadius: '50px',
                  border: 'none',
                  background: '#DC2626',
                  color: '#FFF',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
                }}
              >
                Иә, барлығын өшіру ({selectedBookIds.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
