import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMessageStore, AdminMessage, MessageTargetType, MessagePriority } from '../../store/useMessageStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useBookStore } from '../../store/useBookStore';
import { useToastStore } from '../../store/useToastStore';
import { hasAdminPermission } from '../../utils/permissions';
import { User } from '../../types';

export const AdminMessagesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, role, getAllClients } = useAuthStore();
  const { books } = useBookStore();
  const { messages, sendMessage, deleteMessage } = useMessageStore();
  const { showToast } = useToastStore();

  const canManage = hasAdminPermission(user, 'quotes_manage') || user?.isSuperAdmin || role === 'admin';

  useEffect(() => {
    if (role !== 'admin') {
      showToast('Бұл бөлімге кіруге рұқсатыңыз жоқ', 'error');
      navigate('/admin', { replace: true });
    }
  }, [role, navigate, showToast]);

  const allClients = useMemo(() => {
    return getAllClients().filter((c) => c.role !== 'admin');
  }, [getAllClients]);

  // Modal form state
  const [showSendModal, setShowSendModal] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetType, setTargetType] = useState<MessageTargetType>('all');
  const [selectedSingleUserId, setSelectedSingleUserId] = useState('');
  const [selectedMultipleUserIds, setSelectedMultipleUserIds] = useState<string[]>([]);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [priority, setPriority] = useState<MessagePriority>('normal');
  const [selectedBookId, setSelectedBookId] = useState('');
  const [canReaderDelete, setCanReaderDelete] = useState(false);
  const [expiresInHours, setExpiresInHours] = useState<number | null>(null);

  // Delete modal state
  const [messageToDelete, setMessageToDelete] = useState<AdminMessage | null>(null);

  // Filter in list
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTarget, setFilterTarget] = useState<'all' | 'broadcast' | 'direct'>('all');

  // Filtered readers for multi/single selection
  const filteredClientsForSelection = useMemo(() => {
    if (!recipientSearch.trim()) return allClients;
    const q = recipientSearch.toLowerCase().trim();
    return allClients.filter(
      (c) =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.username && c.username.toLowerCase().includes(q)) ||
        (c.idNumber && c.idNumber.toLowerCase().includes(q))
    );
  }, [allClients, recipientSearch]);

  const handleToggleMultiSelect = (userId: string) => {
    setSelectedMultipleUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAllFiltered = () => {
    const allFilteredIds = filteredClientsForSelection.map((c) => c.id);
    const allSelected = allFilteredIds.every((id) => selectedMultipleUserIds.includes(id));
    if (allSelected) {
      setSelectedMultipleUserIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setSelectedMultipleUserIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      showToast('Хат тақырыбын жазыңыз', 'error');
      return;
    }
    if (!content.trim()) {
      showToast('Хат мәтінін жазыңыз', 'error');
      return;
    }

    let targetUserIds: string[] = [];
    let targetUserNames: string[] = [];

    if (targetType === 'single') {
      if (!selectedSingleUserId) {
        showToast('Оқырманды таңдаңыз', 'error');
        return;
      }
      const targetUser = allClients.find((c) => c.id === selectedSingleUserId);
      targetUserIds = [selectedSingleUserId];
      targetUserNames = [targetUser?.name || targetUser?.email || 'Оқырман'];
    } else if (targetType === 'multiple') {
      if (selectedMultipleUserIds.length === 0) {
        showToast('Кем дегенде бір оқырманды таңдаңыз', 'error');
        return;
      }
      targetUserIds = selectedMultipleUserIds;
      targetUserNames = selectedMultipleUserIds.map((id) => {
        const u = allClients.find((c) => c.id === id);
        return u?.name || u?.email || 'Оқырман';
      });
    }

    const linkedBook = books.find((b) => b.id === selectedBookId);

    sendMessage({
      title: title.trim(),
      content: content.trim(),
      targetType,
      targetUserIds: targetType === 'all' ? undefined : targetUserIds,
      targetUserNames: targetType === 'all' ? undefined : targetUserNames,
      bookId: selectedBookId || undefined,
      bookTitle: linkedBook?.title || undefined,
      priority,
      senderName: 'Tanda',
      canReaderDelete,
      expiresInHours,
    });

    showToast(
      targetType === 'all'
        ? 'Хат барлық оқырмандарға сәтті жіберілді!'
        : `Хат ${targetUserIds.length} оқырманға сәтті жіберілді!`,
      'success'
    );

    // Reset form
    setShowSendModal(false);
    setTitle('');
    setContent('');
    setTargetType('all');
    setSelectedSingleUserId('');
    setSelectedMultipleUserIds([]);
    setRecipientSearch('');
    setPriority('normal');
    setSelectedBookId('');
    setCanReaderDelete(false);
    setExpiresInHours(null);
  };

  // Filtered messages list
  const filteredMessages = useMemo(() => {
    return messages.filter((m) => {
      if (filterTarget === 'broadcast' && m.targetType !== 'all') return false;
      if (filterTarget === 'direct' && m.targetType === 'all') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          m.title.toLowerCase().includes(q) ||
          m.content.toLowerCase().includes(q) ||
          (m.targetUserNames && m.targetUserNames.some((n) => n.toLowerCase().includes(q)))
        );
      }
      return true;
    });
  }, [messages, filterTarget, searchQuery]);

  return (
    <section className="admin-page" style={{ paddingBottom: '60px' }}>
      <div className="admin-container">
        {/* Header Breadcrumbs */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748B', marginBottom: '8px' }}>
              <Link to="/admin" style={{ color: '#64748B', textDecoration: 'none', fontWeight: 600 }}>
                Басқару панелі
              </Link>
              <span>/</span>
              <span style={{ color: 'var(--text-dark)', fontWeight: 700 }}>
                Хабарламалар
              </span>
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-dark)', margin: 0 }}>
              Хабарламалар мен хаттар
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-mid)', marginTop: '4px', margin: 0 }}>
              Оқырмандарға жеке, топтық немесе жалпы хабарламалар мен жаңалықтар жіберу
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setShowSendModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                fontWeight: 800,
                color: '#FFFFFF',
                background: 'var(--blue)',
                padding: '10px 20px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0, 84, 148, 0.25)',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Жаңа хат жазу
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
                padding: '9px 16px',
                borderRadius: '10px',
                background: '#FFFFFF',
                border: '1.5px solid #CBD5E1',
              }}
            >
              Басқару панеліне қайту
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
            marginBottom: '28px',
          }}
        >
          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '20px 24px', border: '1.5px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#64748B', marginBottom: '6px' }}>Барлық хаттар</div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-dark)' }}>{messages.length} хабарлама</div>
          </div>

          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '20px 24px', border: '1.5px solid #BBF7D0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#15803D', marginBottom: '6px' }}>Барлығына жіберілген</div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: '#16A34A' }}>
              {messages.filter((m) => m.targetType === 'all').length} хабарлама
            </div>
          </div>

          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '20px 24px', border: '1.5px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--orange)', marginBottom: '6px' }}>Жеке / Топтық хаттар</div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--orange)' }}>
              {messages.filter((m) => m.targetType !== 'all').length} хат
            </div>
          </div>
        </div>

        {/* Messages List Card */}
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
                Жіберілген хаттар тарихы ({filteredMessages.length})
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-mid)', marginTop: '4px' }}>
                Оқырмандарға жіберілген барлық хабарламалар тізімі
              </p>
            </div>

            {/* Filters & Search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setFilterTarget('all')}
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: filterTarget === 'all' ? '#FFFFFF' : '#64748B',
                    background: filterTarget === 'all' ? 'var(--blue)' : '#F1F5F9',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Барлығы ({messages.length})
                </button>

                <button
                  type="button"
                  onClick={() => setFilterTarget('broadcast')}
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: filterTarget === 'broadcast' ? '#FFFFFF' : '#64748B',
                    background: filterTarget === 'broadcast' ? 'var(--blue)' : '#F1F5F9',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Жалпы
                </button>

                <button
                  type="button"
                  onClick={() => setFilterTarget('direct')}
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: filterTarget === 'direct' ? '#FFFFFF' : '#64748B',
                    background: filterTarget === 'direct' ? 'var(--blue)' : '#F1F5F9',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Жеке / Топтық
                </button>
              </div>

              {/* Search */}
              <div style={{ position: 'relative', width: '220px' }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Хаттарды іздеу..."
                  style={{
                    width: '100%',
                    padding: '7px 10px 7px 32px',
                    borderRadius: '6px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '12px',
                    fontWeight: 600,
                    outline: 'none',
                    background: '#F8FAFC',
                    boxSizing: 'border-box',
                  }}
                />
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#94A3B8"
                  strokeWidth="2.5"
                  style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </div>
            </div>
          </div>

          {/* Table */}
          {filteredMessages.length > 0 ? (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>№</th>
                    <th>Тақырыбы мен мәтіні</th>
                    <th style={{ width: '200px' }}>Алушылар</th>
                    <th style={{ width: '120px' }}>Маңыздылығы</th>
                    <th style={{ width: '160px' }}>Бекітілген кітап</th>
                    <th style={{ width: '160px' }}>Өшу / Өшіру құқығы</th>
                    <th style={{ width: '140px' }}>Уақыты</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>Оқығандар</th>
                    <th style={{ width: '80px', textAlign: 'right' }}>Әрекет</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMessages.map((msg, idx) => {
                    const priorityLabels: Record<MessagePriority, { text: string; bg: string; color: string; border: string }> = {
                      normal: { text: 'Қалыпты', bg: '#F1F5F9', color: '#475569', border: '#CBD5E1' },
                      news: { text: 'Жаңалық', bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
                      important: { text: 'Маңызды', bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' },
                    };
                    const pri = priorityLabels[msg.priority || 'normal'];

                    return (
                      <tr key={msg.id}>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: '#64748B', fontSize: '12px' }}>
                          {idx + 1}
                        </td>

                        <td>
                          <strong style={{ fontSize: '14px', color: 'var(--text-dark)', display: 'block', marginBottom: '4px' }}>
                            {msg.title}
                          </strong>
                          <p style={{ fontSize: '12px', color: '#64748B', margin: 0, lineHeight: 1.5, maxHeight: '42px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {msg.content}
                          </p>
                        </td>

                        <td>
                          {msg.targetType === 'all' ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '12px',
                                fontWeight: 700,
                                color: '#047857',
                                background: '#ECFDF5',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                border: '1px solid #A7F3D0',
                              }}
                            >
                              Барлық оқырмандарға
                            </span>
                          ) : (
                            <div>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dark)' }}>
                                {msg.targetUserNames && msg.targetUserNames.length === 1
                                  ? msg.targetUserNames[0]
                                  : `${msg.targetUserNames?.length || 0} оқырман`}
                              </span>
                              {msg.targetUserNames && msg.targetUserNames.length > 1 && (
                                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                                  {msg.targetUserNames.slice(0, 2).join(', ')}
                                  {msg.targetUserNames.length > 2 ? '...' : ''}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        <td>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: pri.bg,
                              color: pri.color,
                              border: `1px solid ${pri.border}`,
                              display: 'inline-block',
                            }}
                          >
                            {pri.text}
                          </span>
                        </td>

                        <td>
                          {msg.bookTitle ? (
                            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--blue)' }}>
                              📖 {msg.bookTitle}
                            </span>
                          ) : (
                            <span style={{ fontSize: '12px', color: '#94A3B8' }}>—</span>
                          )}
                        </td>

                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                color: msg.canReaderDelete ? '#C2410C' : '#005494',
                                background: msg.canReaderDelete ? '#FFF7ED' : '#EFF6FF',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                border: msg.canReaderDelete ? '1px solid #FFEDD5' : '1px solid #DBEAFE',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                width: 'fit-content',
                              }}
                            >
                              {msg.canReaderDelete ? '🔓 Өшіруге болады' : '🔒 Өшірілмейді'}
                            </span>

                            {msg.expiresAt ? (
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  color: new Date(msg.expiresAt).getTime() <= Date.now() ? '#DC2626' : '#64748B',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                              >
                                {new Date(msg.expiresAt).getTime() <= Date.now() ? '⚠️ Мерзімі өткен' : `⏳ ${msg.expiresInHours ? `${msg.expiresInHours} сағ` : 'Мерзімді'}`}
                              </span>
                            ) : (
                              <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                                ♾️ Шексіз
                              </span>
                            )}
                          </div>
                        </td>

                        <td style={{ fontSize: '12px', color: '#64748B' }}>
                          {new Date(msg.createdAt).toLocaleDateString('kk-KZ', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>

                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-dark)' }}>
                            {msg.readByUserIds?.length || 0}
                          </span>
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => setMessageToDelete(msg)}
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
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: '#64748B' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>✉️</div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '4px' }}>
                Хабарламалар табылмады
              </h3>
              <p style={{ fontSize: '13px', margin: 0 }}>
                Жаңа хат жазу үшін жоғарыдағы «Жаңа хат жазу» батырмасын басыңыз.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* SEND MESSAGE MODAL */}
      {showSendModal && (
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
              maxWidth: '620px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '30px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '22px', backgroundColor: 'var(--blue)', borderRadius: '4px', display: 'inline-block' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-dark)' }}>
                  Оқырмандарға хат жазу
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSendModal(false)}
                style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendMessage}>
              {/* Target Type selector */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                  Хат кімге жіберіледі?
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setTargetType('all')}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: targetType === 'all' ? '2px solid var(--blue)' : '1.5px solid #CBD5E1',
                      background: targetType === 'all' ? '#EFF6FF' : '#FFFFFF',
                      color: targetType === 'all' ? 'var(--blue)' : 'var(--text-dark)',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    📢 Барлық оқырмандарға
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetType('single')}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: targetType === 'single' ? '2px solid var(--blue)' : '1.5px solid #CBD5E1',
                      background: targetType === 'single' ? '#EFF6FF' : '#FFFFFF',
                      color: targetType === 'single' ? 'var(--blue)' : 'var(--text-dark)',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    👤 Бір оқырманға
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetType('multiple')}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: targetType === 'multiple' ? '2px solid var(--blue)' : '1.5px solid #CBD5E1',
                      background: targetType === 'multiple' ? '#EFF6FF' : '#FFFFFF',
                      color: targetType === 'multiple' ? 'var(--blue)' : 'var(--text-dark)',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    👥 Бірнеше оқырманға
                  </button>
                </div>
              </div>

              {/* Single Reader Selector */}
              {targetType === 'single' && (
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Оқырманды таңдаңыз
                  </label>
                  <select
                    value={selectedSingleUserId}
                    onChange={(e) => setSelectedSingleUserId(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '13px',
                      fontWeight: 600,
                      outline: 'none',
                      background: '#F8FAFC',
                      color: 'var(--text-dark)',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="">Оқырманды таңдаңыз</option>
                    {allClients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name || 'Аты жоқ'} ({c.email}) {c.idNumber ? `[ID: ${c.idNumber}]` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Multiple Readers Multi-selector */}
              {targetType === 'multiple' && (
                <div style={{ marginBottom: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', margin: 0 }}>
                      Оқырмандарды таңдаңыз ({selectedMultipleUserIds.length} таңдалды)
                    </label>
                    <button
                      type="button"
                      onClick={handleSelectAllFiltered}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--blue)',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      Барлығын таңдау / Алып тастау
                    </button>
                  </div>

                  <input
                    type="text"
                    value={recipientSearch}
                    onChange={(e) => setRecipientSearch(e.target.value)}
                    placeholder="Оқырман аты немесе email бойынша іздеу..."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '12px',
                      outline: 'none',
                      background: '#F8FAFC',
                      boxSizing: 'border-box',
                      marginBottom: '8px',
                    }}
                  />

                  <div
                    style={{
                      maxHeight: '140px',
                      overflowY: 'auto',
                      border: '1.5px solid #CBD5E1',
                      borderRadius: '10px',
                      padding: '8px 12px',
                      background: '#FFFFFF',
                    }}
                  >
                    {filteredClientsForSelection.length > 0 ? (
                      filteredClientsForSelection.map((c) => {
                        const isSelected = selectedMultipleUserIds.includes(c.id);
                        return (
                          <label
                            key={c.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '6px 4px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #F1F5F9',
                              fontSize: '12px',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleMultiSelect(c.id)}
                            />
                            <div style={{ flex: 1 }}>
                              <strong style={{ color: 'var(--text-dark)' }}>{c.name || 'Аты жоқ'}</strong>{' '}
                              <span style={{ color: '#64748B' }}>({c.email})</span>
                              {c.idNumber && (
                                <span style={{ color: 'var(--blue)', marginLeft: '6px', fontWeight: 700 }}>
                                  ID: {c.idNumber}
                                </span>
                              )}
                            </div>
                          </label>
                        );
                      })
                    ) : (
                      <div style={{ padding: '10px', textAlign: 'center', color: '#94A3B8', fontSize: '12px' }}>
                        Оқырмандар табылмады
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Title */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Хат тақырыбы
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Мысалы: Жаңа кітаптар қосылды!"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '14px',
                    fontWeight: 600,
                    outline: 'none',
                    background: '#F8FAFC',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Content */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Хат мәтіні
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Оқырманға арналған хабарламаны осында жазыңыз..."
                  rows={4}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '13px',
                    outline: 'none',
                    background: '#F8FAFC',
                    boxSizing: 'border-box',
                    lineHeight: 1.5,
                  }}
                />
              </div>

              {/* Priority and Optional Book in one row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Маңыздылығы
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as MessagePriority)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '13px',
                      fontWeight: 600,
                      outline: 'none',
                      background: '#F8FAFC',
                      color: 'var(--text-dark)',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="normal">Қалыпты хабарлама</option>
                    <option value="news">Жаңалық / Хабарландыру</option>
                    <option value="important">Маңызды ескерту</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Кітапты бекіту (міндетті емес)
                  </label>
                  <select
                    value={selectedBookId}
                    onChange={(e) => setSelectedBookId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '13px',
                      fontWeight: 600,
                      outline: 'none',
                      background: '#F8FAFC',
                      color: 'var(--text-dark)',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="">Кітап бекітілмейді</option>
                    {books.filter((b) => !b.isArchived).map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title} — {b.author}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reader Delete Permission & Auto-delete Expiration Settings */}
              <div
                style={{
                  background: '#F8FAFC',
                  borderRadius: '14px',
                  padding: '16px',
                  border: '1.5px solid #E2E8F0',
                  marginBottom: '24px',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '12px' }}>
                  ⚙️ Қауіпсіздік және өшу баптаулары
                </div>

                {/* Reader Deletion Permission */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                    Оқырман бұл хабарламаны өшіре ала ма?
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setCanReaderDelete(false)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: !canReaderDelete ? '2px solid #005494' : '1.5px solid #CBD5E1',
                        background: !canReaderDelete ? '#EFF6FF' : '#FFFFFF',
                        color: !canReaderDelete ? '#005494' : '#64748B',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>🔒</span>
                      <span>Өшіре алмайды (Ұсынылады)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCanReaderDelete(true)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: canReaderDelete ? '2px solid #F08000' : '1.5px solid #CBD5E1',
                        background: canReaderDelete ? '#FFF7ED' : '#FFFFFF',
                        color: canReaderDelete ? '#C2410C' : '#64748B',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>🔓</span>
                      <span>Оқырман өшіре алады</span>
                    </button>
                  </div>
                </div>

                {/* Auto-delete expiration */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                    Автоматты түрде өшу уақыты (Мерзімі)
                  </label>
                  <select
                    value={expiresInHours === null ? '' : String(expiresInHours)}
                    onChange={(e) => {
                      const val = e.target.value;
                      setExpiresInHours(val === '' ? null : Number(val));
                    }}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '12px',
                      fontWeight: 600,
                      outline: 'none',
                      background: '#FFFFFF',
                      color: 'var(--text-dark)',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="">♾️ Шексіз (Автоматты түрде өшпейді)</option>
                    <option value="1">⏱️ 1 сағаттан кейін өшсін</option>
                    <option value="3">⏱️ 3 сағаттан кейін өшсін</option>
                    <option value="6">⏱️ 6 сағаттан кейін өшсін</option>
                    <option value="12">⏱️ 12 сағаттан кейін өшсін</option>
                    <option value="24">📅 24 сағаттан (1 күн) кейін өшсін</option>
                    <option value="48">📅 2 күннен кейін өшсін</option>
                    <option value="72">📅 3 күннен кейін өшсін</option>
                    <option value="168">📅 7 күннен (1 апта) кейін өшсін</option>
                    <option value="720">📅 30 күннен (1 ай) кейін өшсін</option>
                  </select>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowSendModal(false)}
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
                    padding: '9px 24px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    background: 'var(--blue)',
                    color: '#FFF',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                  Хатты жіберу
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {messageToDelete && (
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
              padding: '28px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '12px' }}>
              Хабарламаны өшіру
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-mid)', lineHeight: 1.6, marginBottom: '24px' }}>
              Сіз шынымен мына хабарламаны өшіргіңіз келе ме?
              <br />
              <strong style={{ color: 'var(--text-dark)', display: 'block', marginTop: '6px' }}>
                «{messageToDelete.title}»
              </strong>
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setMessageToDelete(null)}
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
                  deleteMessage(messageToDelete.id);
                  showToast('Хабарлама өшірілді', 'info');
                  setMessageToDelete(null);
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
