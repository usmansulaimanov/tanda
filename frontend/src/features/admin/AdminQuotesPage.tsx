import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuoteStore, QuoteItem } from '../../store/useQuoteStore';
import { useBookStore } from '../../store/useBookStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import { hasAdminPermission } from '../../utils/permissions';

export const AdminQuotesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, role } = useAuthStore();
  const { books } = useBookStore();
  const {
    quotes,
    settings,
    addQuote,
    addBulkQuotes,
    updateQuote,
    deleteQuote,
    toggleQuoteActive,
    updateSettings,
    triggerQuoteNotification,
  } = useQuoteStore();
  const { showToast } = useToastStore();

  const canManageQuotes = hasAdminPermission(user, 'quotes_manage');

  useEffect(() => {
    if (role !== 'admin' || !canManageQuotes) {
      showToast('Цитаталар бөліміне кіруге рұқсатыңыз жоқ', 'error');
      navigate('/admin', { replace: true });
    }
  }, [role, canManageQuotes, navigate, showToast]);

  // Form states
  const [newText, setNewText] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newBookId, setNewBookId] = useState('');
  const [newBookTitle, setNewBookTitle] = useState('');

  // Bulk add modal
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkText, setBulkText] = useState('');

  // Edit modal
  const [editingQuote, setEditingQuote] = useState<QuoteItem | null>(null);
  const [editText, setEditText] = useState('');
  const [editAuthor, setEditAuthor] = useState('');
  const [editBookId, setEditBookId] = useState('');
  const [editBookTitle, setEditBookTitle] = useState('');

  // Delete modal
  const [quoteToDelete, setQuoteToDelete] = useState<QuoteItem | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterBookId, setFilterBookId] = useState<string>('all');

  // Time slots local editor
  const [time1, setTime1] = useState(settings.scheduledTimes[0] || '09:00');
  const [time2, setTime2] = useState(settings.scheduledTimes[1] || '14:00');
  const [time3, setTime3] = useState(settings.scheduledTimes[2] || '20:00');

  useEffect(() => {
    setTime1(settings.scheduledTimes[0] || '09:00');
    setTime2(settings.scheduledTimes[1] || '14:00');
    setTime3(settings.scheduledTimes[2] || '20:00');
  }, [settings.scheduledTimes]);

  // Active books for selector
  const availableBooks = useMemo(() => {
    return books.filter((b) => !b.isArchived);
  }, [books]);

  // Filtered quotes
  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) => {
      if (filterStatus === 'active' && !q.isActive) return false;
      if (filterStatus === 'inactive' && q.isActive) return false;
      if (filterBookId !== 'all') {
        if (q.bookId) {
          if (q.bookId !== filterBookId) return false;
        } else if (q.bookTitle) {
          const selBook = books.find((b) => b.id === filterBookId);
          if (!selBook || selBook.title.toLowerCase().trim() !== q.bookTitle.toLowerCase().trim()) {
            return false;
          }
        } else {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        return (
          q.text.toLowerCase().includes(query) ||
          q.author.toLowerCase().includes(query) ||
          (q.bookTitle && q.bookTitle.toLowerCase().includes(query))
        );
      }
      return true;
    });
  }, [quotes, filterStatus, filterBookId, searchQuery, books]);

  const activeQuotesCount = useMemo(() => quotes.filter((q) => q.isActive).length, [quotes]);
  const totalSentCount = useMemo(() => quotes.reduce((acc, q) => acc + (q.sentCount || 0), 0), [quotes]);

  const handleSelectNewBook = (bookId: string) => {
    setNewBookId(bookId);
    if (!bookId) {
      setNewBookTitle('');
      setNewAuthor('');
      return;
    }
    const selected = books.find((b) => b.id === bookId);
    if (selected) {
      setNewBookTitle(selected.title);
      setNewAuthor(selected.author);
    }
  };

  const handleSelectEditBook = (bookId: string) => {
    setEditBookId(bookId);
    if (!bookId) {
      setEditBookTitle('');
      setEditAuthor('');
      return;
    }
    const selected = books.find((b) => b.id === bookId);
    if (selected) {
      setEditBookTitle(selected.title);
      setEditAuthor(selected.author);
    }
  };

  const handleCreateQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) {
      showToast('Цитата мәтінін енгізіңіз', 'error');
      return;
    }
    if (!newBookId) {
      showToast('Платформадағы кітапты таңдаңыз', 'error');
      return;
    }

    const selected = books.find((b) => b.id === newBookId);
    const bookTitle = selected?.title || newBookTitle.trim() || undefined;
    const author = selected?.author || newAuthor.trim() || 'Халық даналығы';

    addQuote({
      text: newText.trim(),
      author: author,
      bookId: newBookId || undefined,
      bookTitle: bookTitle,
      isActive: true,
    });

    setNewText('');
    setNewAuthor('');
    setNewBookId('');
    setNewBookTitle('');
    showToast('Жаңа цитата сәтті қосылды!', 'success');
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkText.trim()) {
      showToast('Мәтінді енгізіңіз', 'error');
      return;
    }

    const lines = bulkText.split('\n').map((l) => l.trim()).filter(Boolean);
    const parsedItems = lines.map((line) => {
      if (line.includes('—')) {
        const [text, author] = line.split('—');
        return { text: text.trim().replace(/^«|»$/g, ''), author: author?.trim() };
      } else if (line.includes(' - ')) {
        const [text, author] = line.split(' - ');
        return { text: text.trim().replace(/^«|»$/g, ''), author: author?.trim() };
      }
      return { text: line.replace(/^«|»$/g, '').trim() };
    });

    const added = addBulkQuotes(parsedItems);
    setShowBulkModal(false);
    setBulkText('');
    showToast(`${added} цитата бірден қосылды!`, 'success');
  };

  const openEditModal = (quote: QuoteItem) => {
    setEditingQuote(quote);
    setEditText(quote.text);
    setEditAuthor(quote.author);
    setEditBookId(quote.bookId || '');
    setEditBookTitle(quote.bookTitle || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuote || !editText.trim()) return;

    updateQuote(editingQuote.id, {
      text: editText.trim(),
      author: editAuthor.trim() || 'Халық даналығы',
      bookId: editBookId || undefined,
      bookTitle: editBookTitle.trim() || undefined,
    });

    setEditingQuote(null);
    showToast('Цитата сәтті өзгертілді', 'success');
  };

  const handleSaveScheduleTimes = () => {
    const updatedTimes = [time1, time2, time3].filter(Boolean);
    updateSettings({ scheduledTimes: updatedTimes });
    showToast(`Уақыт кестесі сақталды: ${updatedTimes.join(', ')}`, 'success');
  };

  const handleToggleMasterSwitch = () => {
    const nextVal = !settings.isEnabled;
    updateSettings({ isEnabled: nextVal });
    if (nextVal) {
      showToast('Цитаталар таратылымы ҚОСЫЛДЫ. Оқырмандарға күнделікті 3 рет жіберіледі.', 'success');
    } else {
      showToast('Цитаталар таратылымы ӨШІРІЛДІ. Уақытша оқырмандарға уведомление бармайды.', 'info');
    }
  };

  const handleTestNotification = (quoteId?: string) => {
    const sent = triggerQuoteNotification(quoteId);
    if (sent) {
      showToast(`Цитата жіберілді: «${sent.text.slice(0, 30)}...» (${sent.author})`, 'success');
    } else {
      showToast('Жіберетін белсенді цитата жоқ', 'error');
    }
  };

  return (
    <section className="admin-page-section" style={{ padding: '32px 16px 80px', backgroundColor: '#F8FAFC', minHeight: 'calc(100vh - 80px)' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        
        {/* Top Breadcrumb & Navigation */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748B' }}>
            <Link to="/admin" style={{ color: 'var(--blue)', fontWeight: 600, textDecoration: 'none' }}>
              Басқару панелі
            </Link>
            <span>/</span>
            <span style={{ color: 'var(--text-dark)', fontWeight: 700 }}>
              Цитаталар мен күнделікті хабарламалар
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => handleTestNotification()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 700,
                color: '#FFFFFF',
                background: 'linear-gradient(135deg, #F08000 0%, #D96B00 100%)',
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(240, 128, 0, 0.25)',
              }}
              title="Барлық оқырмандарға тексеру ретінде қазір цитата жіберу"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              Қазір цитата жіберу (Тексеру)
            </button>

            <Link
              to="/admin"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--blue)',
                textDecoration: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                background: '#FFFFFF',
                border: '1.5px solid #CBD5E1',
                transition: 'all 0.15s',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              Басқару панеліне қайту
            </Link>
          </div>
        </div>

        {/* Stats Summary Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '20px 24px', border: '1.5px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#64748B', marginBottom: '6px' }}>Барлық цитаталар қоры</div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-dark)' }}>{quotes.length} цитата</div>
          </div>

          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '20px 24px', border: '1.5px solid #A7F3D0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#047857', marginBottom: '6px' }}>Белсенді цитаталар</div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: '#059669' }}>{activeQuotesCount} дана</div>
          </div>

          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '20px 24px', border: '1.5px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--blue)', marginBottom: '6px' }}>Күнделікті жоспар</div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--blue)' }}>Күніне 3 рет</div>
          </div>

          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '20px 24px', border: '1.5px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--orange)', marginBottom: '6px' }}>Жіберілген рет (Жалпы)</div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--orange)' }}>{totalSentCount} рет</div>
          </div>
        </div>

        {/* Schedule & Notification Times Settings Card */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            padding: '28px 30px',
            border: '1.5px solid #E2E8F0',
            boxShadow: '0 10px 30px rgba(0, 45, 80, 0.05)',
            marginBottom: '32px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1.5px solid #F1F5F9', paddingBottom: '16px', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ width: '8px', height: '22px', backgroundColor: 'var(--orange)', borderRadius: '4px', display: 'inline-block' }} />
                <h2 style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-dark)', margin: 0 }}>
                  Күнделікті уақыт кестесін баптау (Күніне 3 уақыт)
                </h2>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-mid)', margin: '4px 0 0 16px' }}>
                Оқырмандарға күн сайын келетін 3 цитатаның нақты уақыттарын белгілеңіз:
              </p>
            </div>

            {/* Clean toggle button */}
            <button
              type="button"
              onClick={handleToggleMasterSwitch}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                background: settings.isEnabled ? '#ECFDF5' : '#FEF2F2',
                color: settings.isEnabled ? '#047857' : '#B91C1C',
                border: `1.5px solid ${settings.isEnabled ? '#A7F3D0' : '#FECACA'}`,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s',
              }}
              title={settings.isEnabled ? 'Таратылымды уақытша тоқтату үшін басыңыз' : 'Таратылымды қосу үшін басыңыз'}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: settings.isEnabled ? '#10B981' : '#EF4444',
                }}
              />
              {settings.isEnabled ? 'Таратылым қосулы' : 'Таратылым өшірулі'}
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              alignItems: 'flex-end',
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                1-цитата уақыты
              </label>
              <input
                type="time"
                value={time1}
                onChange={(e) => setTime1(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '14px',
                  fontWeight: 700,
                  outline: 'none',
                  background: '#F8FAFC',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                2-цитата уақыты
              </label>
              <input
                type="time"
                value={time2}
                onChange={(e) => setTime2(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '14px',
                  fontWeight: 700,
                  outline: 'none',
                  background: '#F8FAFC',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                3-цитата уақыты
              </label>
              <input
                type="time"
                value={time3}
                onChange={(e) => setTime3(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '14px',
                  fontWeight: 700,
                  outline: 'none',
                  background: '#F8FAFC',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <button
                type="button"
                onClick={handleSaveScheduleTimes}
                style={{
                  width: '100%',
                  padding: '11px 20px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 800,
                  color: '#FFFFFF',
                  background: 'var(--blue)',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0, 84, 148, 0.2)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Кестені сақтау
              </button>
            </div>
          </div>
        </div>

        {/* Add Quote Section (Single & Bulk) */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            padding: '28px 30px',
            border: '1.5px solid #E2E8F0',
            boxShadow: '0 10px 30px rgba(0, 45, 80, 0.05)',
            marginBottom: '32px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1.5px solid #F1F5F9', paddingBottom: '16px', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '22px', backgroundColor: 'var(--blue)', borderRadius: '4px', display: 'inline-block' }} />
                <h2 style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-dark)', margin: 0 }}>
                  Жаңа цитата енгізу
                </h2>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-mid)', margin: '4px 0 0 16px' }}>
                Платформадағы кітаптардың бірін таңдаңыз. Кітап атауы мен авторы автоматты түрде бекітіледі.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowBulkModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--blue)',
                background: '#EFF6FF',
                border: '1.5px solid #BFDBFE',
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              Топтап (Көп) цитата қосу
            </button>
          </div>

          <form onSubmit={handleCreateQuote}>
            {/* Quote Text */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Цитата мәтіні <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <textarea
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="Мысалы: Артық білім кітапта, ерінбей оқып көруге."
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '14px',
                  outline: 'none',
                  background: '#F8FAFC',
                  boxSizing: 'border-box',
                  lineHeight: 1.5,
                  resize: 'vertical',
                }}
                required
              />
            </div>

            {/* Select book from platform */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Кітапты таңдау <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <select
                value={newBookId}
                onChange={(e) => handleSelectNewBook(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '14px',
                  fontWeight: 600,
                  outline: 'none',
                  background: '#F8FAFC',
                  color: 'var(--text-dark)',
                  boxSizing: 'border-box',
                }}
              >
                <option value="">-- Тізімнен кітапты таңдаңыз --</option>
                {availableBooks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title} — {b.author}
                  </option>
                ))}
              </select>

              {newBookId && newBookTitle && (
                <div
                  style={{
                    marginTop: '10px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: '#F0FDF4',
                    border: '1.5px solid #BBF7D0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                    fontSize: '13px',
                    color: '#166534',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <span style={{ color: '#15803D', fontWeight: 600 }}>Кітап атауы: </span>
                    <strong>«{newBookTitle}»</strong>
                  </div>
                  <div>
                    <span style={{ color: '#15803D', fontWeight: 600 }}>Авторы: </span>
                    <strong>{newAuthor}</strong>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                className="btn-primary"
                style={{
                  padding: '10px 24px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 800,
                  background: 'var(--blue)',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Цитатаны қорға қосу
              </button>
            </div>
          </form>
        </div>

        {/* QUOTES LIST & MANAGEMENT TABLE */}
        <div className="admin-card" style={{ padding: '28px 30px' }}>
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
              <h2 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-dark)', margin: 0 }}>
                Цитаталар тізімі ({filteredQuotes.length !== quotes.length ? `${filteredQuotes.length} / ${quotes.length}` : quotes.length})
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-mid)', marginTop: '4px' }}>
                Белсенді цитаталар кесте бойынша кезекпен оқырмандарға жіберіледі
              </p>
            </div>

            {/* Filter and Search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* Status filter buttons */}
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setFilterStatus('all')}
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: filterStatus === 'all' ? '#FFFFFF' : '#64748B',
                    background: filterStatus === 'all' ? 'var(--blue)' : '#F1F5F9',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: `1.5px solid ${filterStatus === 'all' ? 'var(--blue)' : '#CBD5E1'}`,
                    cursor: 'pointer',
                  }}
                >
                  Барлығы ({quotes.length})
                </button>

                <button
                  type="button"
                  onClick={() => setFilterStatus('active')}
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: filterStatus === 'active' ? '#047857' : '#64748B',
                    background: filterStatus === 'active' ? '#D1FAE5' : '#F1F5F9',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: `1.5px solid ${filterStatus === 'active' ? '#A7F3D0' : '#CBD5E1'}`,
                    cursor: 'pointer',
                  }}
                >
                  Белсенді ({activeQuotesCount})
                </button>

                <button
                  type="button"
                  onClick={() => setFilterStatus('inactive')}
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: filterStatus === 'inactive' ? '#B91C1C' : '#64748B',
                    background: filterStatus === 'inactive' ? '#FEE2E2' : '#F1F5F9',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: `1.5px solid ${filterStatus === 'inactive' ? '#FECACA' : '#CBD5E1'}`,
                    cursor: 'pointer',
                  }}
                >
                  Өшірулі ({quotes.length - activeQuotesCount})
                </button>
              </div>

              {/* Book filter dropdown */}
              <div style={{ minWidth: '180px', maxWidth: '240px' }}>
                <select
                  value={filterBookId}
                  onChange={(e) => setFilterBookId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: '6px',
                    border: `1.5px solid ${filterBookId !== 'all' ? 'var(--blue)' : '#CBD5E1'}`,
                    fontSize: '12px',
                    fontWeight: 600,
                    outline: 'none',
                    background: filterBookId !== 'all' ? '#EFF6FF' : '#F8FAFC',
                    color: filterBookId !== 'all' ? 'var(--blue)' : 'var(--text-dark)',
                    cursor: 'pointer',
                    textOverflow: 'ellipsis',
                  }}
                  title="Кітап бойынша сүзу"
                >
                  <option value="all">Барлық кітаптар</option>
                  {availableBooks.map((b) => {
                    const count = quotes.filter(
                      (q) =>
                        q.bookId === b.id ||
                        (q.bookTitle && q.bookTitle.toLowerCase().trim() === b.title.toLowerCase().trim())
                    ).length;
                    return (
                      <option key={b.id} value={b.id}>
                        «{b.title}» {count > 0 ? `(${count})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Search input */}
              <div style={{ position: 'relative', width: '220px' }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Цитата немесе автор..."
                  style={{
                    width: '100%',
                    padding: '7px 12px 7px 32px',
                    borderRadius: '6px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '13px',
                    outline: 'none',
                    background: '#F8FAFC',
                    boxSizing: 'border-box',
                  }}
                />
                <svg
                  style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748B', pointerEvents: 'none' }}
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </div>
            </div>
          </div>

          {/* Quotes Table */}
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>№</th>
                  <th>Цитата мәтіні</th>
                  <th style={{ width: '220px' }}>Кітап және Авторы</th>
                  <th style={{ width: '110px', textAlign: 'center' }}>Жіберілді</th>
                  <th style={{ width: '120px' }}>Күйі</th>
                  <th style={{ width: '200px', textAlign: 'right' }}>Әрекеттер</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuotes.map((quote, idx) => {
                  const linkedBook = quote.bookId
                    ? books.find((b) => b.id === quote.bookId)
                    : books.find(
                        (b) =>
                          quote.bookTitle &&
                          b.title.toLowerCase().trim() === quote.bookTitle.toLowerCase().trim()
                      );

                  return (
                    <tr key={quote.id}>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#64748B', fontSize: '12px' }}>
                        {idx + 1}
                      </td>

                      <td>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)', lineHeight: 1.5 }}>
                          «{quote.text}»
                        </div>
                      </td>

                      <td>
                        <strong style={{ fontSize: '13px', color: 'var(--text-dark)', display: 'block' }}>
                          {quote.author}
                        </strong>
                        {linkedBook ? (
                          <Link
                            to={`/book/${linkedBook.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: '11px',
                              color: 'var(--blue)',
                              fontWeight: 700,
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              marginTop: '2px',
                            }}
                            title="Кітап карточкасын ашу"
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"></path>
                              <path d="M6 6h10"></path>
                              <path d="M6 10h10"></path>
                            </svg>
                            «{linkedBook.title}» ↗
                          </Link>
                        ) : quote.bookTitle ? (
                          <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                            «{quote.bookTitle}»
                          </span>
                        ) : null}
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: '#F1F5F9',
                            color: quote.sentCount > 0 ? 'var(--orange)' : '#64748B',
                          }}
                        >
                          {quote.sentCount || 0} рет
                        </span>
                      </td>

                      <td>
                        <button
                          type="button"
                          onClick={() => toggleQuoteActive(quote.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            borderRadius: '50px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            border: quote.isActive ? '1px solid #A7F3D0' : '1px solid #FECACA',
                            background: quote.isActive ? '#ECFDF5' : '#FEF2F2',
                            color: quote.isActive ? '#047857' : '#B91C1C',
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: quote.isActive ? '#10B981' : '#EF4444',
                            }}
                          />
                          {quote.isActive ? 'Белсенді' : 'Өшірулі'}
                        </button>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {/* Test send this specific quote */}
                          <button
                            type="button"
                            onClick={() => handleTestNotification(quote.id)}
                            title="Осы цитатаны қазір оқырмандарға жіберу"
                            style={{
                              padding: '5px 10px',
                              fontSize: '12px',
                              fontWeight: 700,
                              background: '#FFF7ED',
                              color: '#C2410C',
                              border: '1px solid #FFEDD5',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                            </svg>
                            Жіберу
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => openEditModal(quote)}
                            title="Өңдеу"
                            style={{
                              padding: '5px 10px',
                              fontSize: '12px',
                              fontWeight: 700,
                              background: '#EFF6FF',
                              color: '#1D4ED8',
                              border: '1px solid #BFDBFE',
                              borderRadius: '6px',
                              cursor: 'pointer',
                            }}
                          >
                            Өңдеу
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => setQuoteToDelete(quote)}
                            title="Өшіру"
                            style={{
                              padding: '5px 10px',
                              fontSize: '12px',
                              fontWeight: 700,
                              background: '#FEF2F2',
                              color: '#B91C1C',
                              border: '1px solid #FECACA',
                              borderRadius: '6px',
                              cursor: 'pointer',
                            }}
                          >
                            Өшіру
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredQuotes.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-mid)' }}>
              Цитаталар табылмады.
            </div>
          )}
        </div>
      </div>

      {/* BULK ADD MODAL */}
      {showBulkModal && (
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
              borderRadius: '20px',
              maxWidth: '600px',
              width: '100%',
              padding: '30px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-dark)' }}>
                Бірден көп цитата енгізу
              </h3>
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '16px', lineHeight: 1.5 }}>
              Әр жолға бір цитатадан жазыңыз. Авторын қосу үшін цитатадан кейін <strong>«— Автор аты»</strong> немесе <strong>« - Автор аты»</strong> деп белгілеңіз. Мысалы:
              <br />
              <code style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '4px' }}>
                Білім — таусылмас қазына — Халық даналығы
              </code>
            </p>

            <form onSubmit={handleBulkSubmit}>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="1-цитата — Автор&#10;2-цитата — Автор&#10;3-цитата — Автор"
                rows={8}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '13px',
                  outline: 'none',
                  background: '#F8FAFC',
                  boxSizing: 'border-box',
                  lineHeight: 1.5,
                  marginBottom: '20px',
                }}
                required
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: '#FFF',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Болдырмау
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{
                    padding: '9px 20px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    background: 'var(--blue)',
                    color: '#FFF',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Қосу
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingQuote && (
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
              borderRadius: '20px',
              maxWidth: '560px',
              width: '100%',
              padding: '30px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 16px 0', color: 'var(--text-dark)' }}>
              Цитатаны өңдеу
            </h3>

            <form onSubmit={handleSaveEdit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Цитата мәтіні
                </label>
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '13px',
                    outline: 'none',
                    background: '#F8FAFC',
                    boxSizing: 'border-box',
                    lineHeight: 1.5,
                  }}
                  required
                />
              </div>

              {/* Book select dropdown in edit modal */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Кітапты таңдау
                </label>
                <select
                  value={editBookId}
                  onChange={(e) => handleSelectEditBook(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '13px',
                    fontWeight: 600,
                    outline: 'none',
                    background: '#F8FAFC',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="">-- Тізімнен кітапты таңдаңыз --</option>
                  {availableBooks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} — {b.author}
                    </option>
                  ))}
                </select>

                {(editBookTitle || editAuthor) && (
                  <div
                    style={{
                      marginTop: '10px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: '#F0FDF4',
                      border: '1.5px solid #BBF7D0',
                      fontSize: '12px',
                      color: '#166534',
                      display: 'flex',
                      gap: '16px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <span style={{ color: '#15803D', fontWeight: 600 }}>Кітап: </span>
                      <strong>«{editBookTitle}»</strong>
                    </div>
                    <div>
                      <span style={{ color: '#15803D', fontWeight: 600 }}>Авторы: </span>
                      <strong>{editAuthor}</strong>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setEditingQuote(null)}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: '#FFF',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Болдырмау
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{
                    padding: '9px 20px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    background: 'var(--blue)',
                    color: '#FFF',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Сақтау
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {quoteToDelete && (
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
              padding: '30px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '12px' }}>
              Цитатаны өшіру
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-mid)', lineHeight: 1.6, marginBottom: '24px' }}>
              Сіз шынымен мына цитатаны қордан біржола өшіргіңіз келе ме?
              <br />
              <strong style={{ color: 'var(--text-dark)', display: 'block', marginTop: '6px' }}>
                «{quoteToDelete.text}»
              </strong>
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setQuoteToDelete(null)}
                style={{
                  padding: '9px 18px',
                  borderRadius: '50px',
                  border: '1px solid #CBD5E1',
                  background: '#FFF',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Болдырмау
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteQuote(quoteToDelete.id);
                  showToast('Цитата қордан өшірілді', 'info');
                  setQuoteToDelete(null);
                }}
                style={{
                  padding: '9px 20px',
                  borderRadius: '50px',
                  border: 'none',
                  background: '#DC2626',
                  color: '#FFF',
                  fontWeight: 700,
                  fontSize: '13px',
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
