import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, X, BookOpen, Clock, Newspaper, ArrowRight, Trash2 } from 'lucide-react';
import { useMessageStore, AdminMessage } from '../../store/useMessageStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useBookStore } from '../../store/useBookStore';
import { useToastStore } from '../../store/useToastStore';
import { PushNotificationPrompt } from './components/PushNotificationPrompt';
import { Modal } from '../../components/ui/Modal';

const formatMessageDate = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year}, ${hours}:${minutes}`;
};

export const ReaderMessagesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { books } = useBookStore();
  const {
    messages,
    getMessagesForUser,
    markAsRead,
    markAllAsRead,
    deleteMessageForUser,
    fetchMyMessages,
  } = useMessageStore();
  const { showToast } = useToastStore();

  useEffect(() => {
    fetchMyMessages();
  }, [fetchMyMessages]);

  const [selectedMessage, setSelectedMessage] = useState<AdminMessage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const userMessages = useMemo(() => {
    return getMessagesForUser(user?.id);
  }, [messages, user?.id, getMessagesForUser]);

  // Mark all unread messages as read automatically or via button
  const unreadCount = useMemo(() => {
    if (!user) return 0;
    return userMessages.filter((m) => !(m.readByUserIds || []).includes(user.id)).length;
  }, [userMessages, user]);

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return userMessages;
    const q = searchQuery.toLowerCase().trim();
    return userMessages.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.content.toLowerCase().includes(q) ||
        (m.bookTitle && m.bookTitle.toLowerCase().includes(q))
    );
  }, [userMessages, searchQuery]);

  const handleMarkAllRead = () => {
    if (!user) return;
    markAllAsRead(user.id);
    showToast('Барлық хабарламалар оқылды деп белгіленді', 'success');
  };

  const handleDeleteForMe = (messageId: string) => {
    if (!user) return;
    deleteMessageForUser(messageId, user.id);
    showToast('Хабарлама өшірілді', 'info');
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 my-4 sm:my-8 mb-20">
      {/* Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748B', marginBottom: '16px' }}>
        <Link to="/" style={{ color: '#64748B', textDecoration: 'none', fontWeight: 600 }}>
          Басты бет
        </Link>
        <span>/</span>
        <span style={{ color: 'var(--text-dark)', fontWeight: 700 }}>Хабарламалар</span>
      </div>

      {/* Header Banner */}
      <div
        className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-white mb-6 shadow-lg"
        style={{
          background: 'linear-gradient(135deg, #0A192F 0%, #002D50 100%)',
        }}
      >
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '640px' }}>
          <h1 className="text-2xl sm:text-3xl font-black m-0 mb-2 leading-tight">
            Келген хабарламалар
          </h1>
          <p className="text-xs sm:text-sm text-slate-200 m-0 leading-relaxed">
            Платформа әкімшілігінен келген жеке хаттар, маңызды ескертулер мен жаңалықтар.
          </p>
        </div>
      </div>

      {/* Push Notification Banner */}
      <PushNotificationPrompt />

      {/* Toolbar (Search & Mark All Read) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div style={{ position: 'relative', minWidth: '260px', flex: 1, maxWidth: '420px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Хабарламаларды іздеу..."
            style={{
              width: '100%',
              padding: '10px 14px 10px 38px',
              borderRadius: '12px',
              border: '1.5px solid #CBD5E1',
              fontSize: '13px',
              fontWeight: 600,
              outline: 'none',
              background: '#FFFFFF',
              boxSizing: 'border-box',
            }}
          />
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#94A3B8"
            strokeWidth="2.5"
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: '10px',
              border: '1.5px solid #BFDBFE',
              background: '#EFF6FF',
              color: 'var(--blue)',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Барлығын оқылды деп белгілеу: {unreadCount}
          </button>
        )}
      </div>

      {/* Messages List */}
      {filteredMessages.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredMessages.map((msg) => {
            const isRead = user ? (msg.readByUserIds || []).includes(user.id) : true;
            const matchedBook = msg.bookId ? books.find((b) => b.id === msg.bookId) : null;

            const priorityLabels = {
              normal: { text: 'Хабарлама' },
              news: { text: 'Жаңалық' },
              important: { text: 'Маңызды' },
            };
            const pri = priorityLabels[msg.priority || 'normal'];

            return (
              <div
                key={msg.id}
                onClick={() => {
                  setSelectedMessage(msg);
                  if (user && !isRead) {
                    markAsRead(msg.id, user.id);
                  }
                }}
                className="hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group"
                style={{
                  background: '#FFFFFF',
                  borderRadius: '20px',
                  padding: '24px 28px',
                  border: isRead ? '1.5px solid #E2E8F0' : '2px solid #3B82F6',
                  boxShadow: isRead ? '0 4px 16px rgba(0, 0, 0, 0.03)' : '0 6px 24px rgba(59, 130, 246, 0.12)',
                  position: 'relative',
                }}
              >
                {/* Header of message */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--blue) 0%, #002D50 100%)',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        fontSize: '14px',
                      }}
                    >
                      T
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-dark)' }}>
                        {msg.senderName && !msg.senderName.includes('кімші') ? msg.senderName : 'Tanda'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>
                        {formatMessageDate(msg.createdAt)}
                      </div>
                    </div>
                  </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#0F172A',
                          background: 'transparent',
                          padding: 0,
                          border: 'none',
                        }}
                      >
                        {pri.text}
                      </span>

                      {msg.expiresAt && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: '#FEF3C7',
                            color: '#92400E',
                            border: '1px solid #FDE68A',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Clock size={12} color="#92400E" />
                          <span>
                            {(() => {
                              const diffMs = new Date(msg.expiresAt!).getTime() - Date.now();
                              if (diffMs <= 0) return 'Мерзімі бітті';
                              const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
                              if (diffHours < 24) return `${diffHours} сағатта өшеді`;
                              const diffDays = Math.ceil(diffHours / 24);
                              return `${diffDays} күнде өшеді`;
                            })()}
                          </span>
                        </span>
                      )}

                      {!isRead && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: '#DBEAFE',
                            color: '#1E40AF',
                          }}
                        >
                          Жаңа
                        </span>
                      )}

                      {msg.canReaderDelete && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteForMe(msg.id);
                          }}
                          title="Өшіру"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#94A3B8',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <X size={15} />
                        </button>
                      )}
                    </div>
                  </div>

                {/* Message Title */}
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-dark)', margin: '0 0 10px 0' }}>
                  {msg.title}
                </h3>

                {/* Message Content */}
                <div
                  style={{
                    fontSize: '14px',
                    color: 'var(--text-dark)',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {msg.content}
                </div>

                {/* Attached Book Link (if any) */}
                {msg.bookId && (
                  <div
                    style={{
                      marginTop: '16px',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      <div
                        style={{
                          width: '32px',
                          height: '42px',
                          borderRadius: '4px',
                          background: matchedBook?.coverImage ? `url(${matchedBook.coverImage}) center/cover` : 'var(--blue)',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#FFF',
                          fontSize: '10px',
                          fontWeight: 800,
                        }}
                      >
                        {!matchedBook?.coverImage && <BookOpen size={16} color="#FFF" />}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: 800,
                            color: 'var(--text-dark)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {matchedBook?.title || msg.bookTitle}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>
                          {matchedBook?.author || 'Tanda кітабы'}
                        </div>
                      </div>
                    </div>

                    {matchedBook && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/book/${matchedBook.id}`);
                        }}
                        style={{
                          padding: '7px 14px',
                          borderRadius: '8px',
                          background: 'var(--blue)',
                          color: '#FFFFFF',
                          border: 'none',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          flexShrink: 0,
                          boxShadow: '0 2px 8px rgba(0, 84, 148, 0.2)',
                        }}
                      >
                        Кітапқа өту
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                      </button>
                    )}
                  </div>
                )}

                {/* Attached News Link (if any) */}
                {msg.newsId && (
                  <div
                    style={{
                      marginTop: '16px',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      background: 'rgba(234, 179, 8, 0.08)',
                      border: '1px solid rgba(234, 179, 8, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: '#FEF08A',
                          color: '#854D0E',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Newspaper size={18} color="#854D0E" />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: 800,
                            color: 'var(--text-dark)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {msg.newsTitle || msg.title}
                        </div>
                        <div style={{ fontSize: '11px', color: '#854D0E', fontWeight: 600 }}>
                          Жарияланған жаңалық
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/news/${msg.newsId}`);
                      }}
                      style={{
                        padding: '7px 14px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #0A192F 0%, #002D50 100%)',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        flexShrink: 0,
                        boxShadow: '0 2px 8px rgba(0, 45, 80, 0.25)',
                      }}
                    >
                      Жаңалықты оқу
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty state */
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            padding: '60px 24px',
            textAlign: 'center',
            border: '1.5px solid #E2E8F0',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#F1F5F9',
              color: '#94A3B8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
            }}
          >
            <Mail size={32} color="#94A3B8" />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '8px' }}>
            Әзірге хабарламалар жоқ
          </h3>
          <p style={{ fontSize: '14px', color: '#64748B', maxWidth: '420px', margin: '0 auto' }}>
            {searchQuery
              ? 'Іздеу сұранысы бойынша хабарлама табылмады.'
              : 'Әкімшіліктен жаңа хаттар мен хабарламалар келген кезде, олар осы жерде көрсетіледі.'}
          </p>
        </div>
      )}

      {/* Detailed Message View Modal */}
      {selectedMessage && (
        <Modal
          isOpen={Boolean(selectedMessage)}
          onClose={() => setSelectedMessage(null)}
          title="Хабарламаны қарау"
          maxWidth="lg"
        >
          <div className="space-y-4 text-left">
            {/* Sender & Metadata bar */}
            <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#005494] to-[#002D50] text-white flex items-center justify-center font-black text-sm shadow-sm">
                  T
                </div>
                <div>
                  <div className="text-sm font-extrabold text-slate-900">
                    {selectedMessage.senderName && !selectedMessage.senderName.includes('кімші')
                      ? selectedMessage.senderName
                      : 'Tanda'}
                  </div>
                  <div className="text-xs text-slate-500">
                    {formatMessageDate(selectedMessage.createdAt)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    selectedMessage.priority === 'important'
                      ? 'bg-amber-100 text-amber-800'
                      : selectedMessage.priority === 'news'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {selectedMessage.priority === 'important'
                    ? 'Маңызды'
                    : selectedMessage.priority === 'news'
                    ? 'Жаңалық'
                    : 'Хабарлама'}
                </span>

                {selectedMessage.expiresAt && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-700" />
                    <span>
                      {(() => {
                        const diffMs = new Date(selectedMessage.expiresAt!).getTime() - Date.now();
                        if (diffMs <= 0) return 'Мерзімі бітті';
                        const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
                        if (diffHours < 24) return `${diffHours} сағатта өшеді`;
                        const diffDays = Math.ceil(diffHours / 24);
                        return `${diffDays} күнде өшеді`;
                      })()}
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* Title */}
            <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-snug">
              {selectedMessage.title}
            </h2>

            {/* Content Body */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-100 text-sm sm:text-base text-slate-800 leading-relaxed whitespace-pre-wrap break-words max-h-[50vh] overflow-y-auto">
              {selectedMessage.content}
            </div>

            {/* Attached Book Link (if any) */}
            {selectedMessage.bookId && (
              <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-12 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs flex-shrink-0 shadow-sm overflow-hidden">
                    {(() => {
                      const matchedBook = books.find((b) => b.id === selectedMessage.bookId);
                      return matchedBook?.coverImage ? (
                        <img src={matchedBook.coverImage} alt="Cover" className="w-full h-full object-cover" />
                      ) : (
                        <BookOpen className="w-4 h-4" />
                      );
                    })()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-slate-900 truncate">
                      {books.find((b) => b.id === selectedMessage.bookId)?.title || selectedMessage.bookTitle || 'Кітап'}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {books.find((b) => b.id === selectedMessage.bookId)?.author || 'Tanda кітабы'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const bookId = selectedMessage.bookId;
                    setSelectedMessage(null);
                    navigate(`/book/${bookId}`);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5"
                >
                  Кітапты ашу
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Attached News Link (if any) */}
            {selectedMessage.newsId && (
              <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/70 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center flex-shrink-0">
                    <Newspaper className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-slate-900 truncate">
                      {selectedMessage.newsTitle || selectedMessage.title}
                    </div>
                    <div className="text-[11px] text-amber-800 font-medium">Жарияланған жаңалық</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const newsId = selectedMessage.newsId;
                    setSelectedMessage(null);
                    navigate(`/news/${newsId}`);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5"
                >
                  Жаңалықты оқу
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
              {selectedMessage.canReaderDelete ? (
                <button
                  type="button"
                  onClick={() => {
                    const idToDelete = selectedMessage.id;
                    setSelectedMessage(null);
                    handleDeleteForMe(idToDelete);
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Өшіру
                </button>
              ) : (
                <div />
              )}

              <button
                type="button"
                onClick={() => setSelectedMessage(null)}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition"
              >
                Жабу
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
