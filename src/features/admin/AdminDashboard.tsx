import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useBookStore } from '../../store/useBookStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import { Book } from '../../types';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { books, toggleArchive, deleteBook } = useBookStore();
  const { users, deleteUser } = useAuthStore();
  const { showToast } = useToastStore();

  const [adminTab, setAdminTab] = useState<'books' | 'users'>('books');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'archived'>('all');
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);

  const activeCount = useMemo(() => books.filter((b) => !b.isArchived).length, [books]);
  const archivedCount = useMemo(() => books.filter((b) => b.isArchived).length, [books]);

  const filteredBooks = useMemo(() => {
    return books.filter((b) => {
      if (filterStatus === 'active' && b.isArchived) return false;
      if (filterStatus === 'archived' && !b.isArchived) return false;
      return true;
    });
  }, [books, filterStatus]);

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
    <section
      className="admin-page-section"
      id="admin-section"
      style={{ minHeight: '80vh', padding: '60px 24px', background: '#F8FAFC', borderTop: '2px solid #E2E8F0', borderBottom: '2px solid #E2E8F0' }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Admin Card */}
        <div
          style={{
            background: '#FFF',
            border: '1px solid #CBD5E1',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.04)',
          }}
        >
          {/* Top Summary Metrics */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              marginBottom: '24px',
            }}
          >
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-mid)', textTransform: 'uppercase' }}>Кітаптар қоры</div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--blue)' }}>{books.length}</div>
            </div>
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-mid)', textTransform: 'uppercase' }}>Тіркелген қолданушылар</div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--orange)' }}>{users.length}</div>
            </div>
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-mid)', textTransform: 'uppercase' }}>Жазылым бағасы</div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#10B981' }}>1 990 ₸ / ай</div>
            </div>
          </div>

          {/* Admin Tabs */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E2E8F0', marginBottom: '24px' }}>
            <button
              type="button"
              onClick={() => setAdminTab('books')}
              style={{
                padding: '10px 20px',
                border: 'none',
                background: 'none',
                fontWeight: 700,
                fontSize: '14px',
                color: adminTab === 'books' ? 'var(--blue)' : 'var(--text-mid)',
                borderBottom: adminTab === 'books' ? '2.5px solid var(--blue)' : '2.5px solid transparent',
                cursor: 'pointer',
              }}
            >
              Кітаптар қоры ({books.length})
            </button>
            <button
              type="button"
              onClick={() => setAdminTab('users')}
              style={{
                padding: '10px 20px',
                border: 'none',
                background: 'none',
                fontWeight: 700,
                fontSize: '14px',
                color: adminTab === 'users' ? 'var(--blue)' : 'var(--text-mid)',
                borderBottom: adminTab === 'users' ? '2.5px solid var(--blue)' : '2.5px solid transparent',
                cursor: 'pointer',
              }}
            >
              Тіркелген эл.почталар ({users.length})
            </button>
          </div>

          {adminTab === 'books' ? (
            <>
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
                    Кітаптар
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
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
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
                {filteredBooks.map((book, index) => (
                  <tr key={book.id}>
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
                          background: book.coverImage
                            ? `url(${book.coverImage}) center/cover`
                            : (book.gradient || '#0057A8'),
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
                        }}
                      >
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

                    {/* Action buttons (Styled exactly as in previous version) */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        {/* Edit */}
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

                        {/* Archive / Unarchive */}
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

                        {/* Delete */}
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
                      </div>
                    </td>
                  </tr>
                ))}
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
        </>
      ) : (
        /* Users Tab */
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-dark)', margin: 0 }}>
                Тіркелген қолданушылар
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-mid)', marginTop: '4px' }}>
                Барлық тіркелген қолданушылар мен оқырмандар тізімі (Барлығы: <span style={{ fontWeight: 700, color: 'var(--blue)' }}>{users.length}</span>)
              </p>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0' }}>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: 800, color: 'var(--text-mid)', textTransform: 'uppercase' }}>
                    Эл.почта
                  </th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: 800, color: 'var(--text-mid)', textTransform: 'uppercase' }}>
                    Аты-жөні
                  </th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: 800, color: 'var(--text-mid)', textTransform: 'uppercase' }}>
                    Тіркелген күні
                  </th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: 800, color: 'var(--text-mid)', textTransform: 'uppercase' }}>
                    Рөлі
                  </th>
                  <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: '12px', fontWeight: 800, color: 'var(--text-mid)', textTransform: 'uppercase' }}>
                    Әрекеттер
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--text-dark)' }}>
                      {u.email}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-mid)' }}>
                      {u.name}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-mid)', fontSize: '13px' }}>
                      {u.date || '-'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '50px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: u.role === 'admin' ? '#FEF3C7' : '#F1F5F9',
                          color: u.role === 'admin' ? '#B45309' : '#475569',
                        }}
                      >
                        {u.role === 'admin' ? 'Админ' : 'Оқырман'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      {u.role !== 'admin' && (
                        <button
                          type="button"
                          onClick={() => {
                            deleteUser(u.id);
                            showToast(`${u.email} жүйеден өшірілді`, 'info');
                          }}
                          style={{
                            padding: '5px 12px',
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
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
    </section>
  );
};
