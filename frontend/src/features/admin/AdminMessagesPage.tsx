import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Globe, User as UserIcon, Users, Lock, Unlock, Shield, Mail, X, Sparkles, Globe2, UserCheck, UserX, Clock, Eye, Check } from 'lucide-react';
import { useMessageStore, AdminMessage, MessageTargetType, MessagePriority } from '../../store/useMessageStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import { hasAdminPermission } from '../../utils/permissions';
import { User, SystemSettings } from '../../types';
import { systemApi } from '../../shared/api/system.api';

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

export const AdminMessagesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, role, isAuthInitialized, getAllClients, fetchClients } = useAuthStore();
  const { messages, sendMessage, deleteMessage, fetchAdminMessages } = useMessageStore();
  const { showToast } = useToastStore();

  const canManage = hasAdminPermission(user, 'messages_manage') || hasAdminPermission(user, 'quotes_manage');

  // Hero Message Modal state
  const [showHeroModal, setShowHeroModal] = useState(false);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [heroText, setHeroText] = useState('');
  const [heroEnabled, setHeroEnabled] = useState(false);
  const [heroTarget, setHeroTarget] = useState<'all' | 'registered' | 'unregistered'>('all');
  const [heroExpiresInDays, setHeroExpiresInDays] = useState<number | null>(null);
  const [isSavingHero, setIsSavingHero] = useState(false);

  useEffect(() => {
    fetchAdminMessages();
    fetchClients();
    systemApi.getSettings()
      .then((res) => {
        if (res) {
          setSystemSettings(res);
          setHeroText(res.heroMessageText || '');
          setHeroEnabled(Boolean(res.heroMessageEnabled));
          setHeroTarget(res.heroMessageTarget || 'all');
          if (res.heroMessageExpiresAt) {
            const diffMs = new Date(res.heroMessageExpiresAt).getTime() - Date.now();
            if (diffMs > 0) {
              setHeroExpiresInDays(Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
            }
          }
        }
      })
      .catch(() => {});
  }, [fetchAdminMessages, fetchClients]);

  useEffect(() => {
    if (!isAuthInitialized) return;
    if (role !== 'admin' || !canManage) {
      showToast('Бұл бөлімге кіруге рұқсатыңыз жоқ', 'error');
      navigate('/admin', { replace: true });
    }
  }, [isAuthInitialized, role, canManage, navigate, showToast]);

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
  const [canReaderDelete, setCanReaderDelete] = useState(false);
  const [expiresInHours, setExpiresInHours] = useState<number | null>(null);

  // Delete modal state
  const [messageToDelete, setMessageToDelete] = useState<AdminMessage | null>(null);

  // View modal state
  const [selectedMessageForView, setSelectedMessageForView] = useState<AdminMessage | null>(null);

  // Filter in list
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTarget, setFilterTarget] = useState<'all' | 'broadcast' | 'single' | 'multiple'>('all');

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

    sendMessage({
      title: title.trim(),
      content: content.trim(),
      targetType,
      targetUserIds: targetType === 'all' ? undefined : targetUserIds,
      targetUserNames: targetType === 'all' ? undefined : targetUserNames,
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
    setCanReaderDelete(false);
    setExpiresInHours(null);
  };

  // Filtered messages list
  const filteredMessages = useMemo(() => {
    return messages.filter((m) => {
      if (filterTarget === 'broadcast' && m.targetType !== 'all') return false;
      if (filterTarget === 'single' && m.targetType !== 'single') return false;
      if (filterTarget === 'multiple' && m.targetType !== 'multiple') return false;

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

  const handleSaveHeroMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (heroEnabled && !heroText.trim()) {
      showToast('Хабарлама мәтінін жазыңыз немесе өшіріп қойыңыз', 'error');
      return;
    }
    setIsSavingHero(true);
    try {
      let expiresAt: string | null = null;
      if (heroExpiresInDays && heroExpiresInDays > 0) {
        expiresAt = new Date(Date.now() + heroExpiresInDays * 24 * 60 * 60 * 1000).toISOString();
      }
      const updated = await systemApi.updateSettingsAdmin({
        heroMessageEnabled: heroEnabled,
        heroMessageText: heroText.trim(),
        heroMessageTarget: heroTarget,
        heroMessageExpiresAt: expiresAt,
      });
      setSystemSettings(updated);
      showToast('Басты бет хабарламасы сәтті сақталды!', 'success');
      setShowHeroModal(false);
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Сақтау кезінде қате орын алды', 'error');
    } finally {
      setIsSavingHero(false);
    }
  };

  return (
    <section className="admin-page-section" style={{ padding: '32px 24px 80px', backgroundColor: '#F8FAFC', minHeight: 'calc(100vh - 80px)' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
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
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                if (systemSettings) {
                  setHeroText(systemSettings.heroMessageText || '');
                  setHeroEnabled(Boolean(systemSettings.heroMessageEnabled));
                  setHeroTarget(systemSettings.heroMessageTarget || 'all');
                  if (systemSettings.heroMessageExpiresAt) {
                    const diffMs = new Date(systemSettings.heroMessageExpiresAt).getTime() - Date.now();
                    setHeroExpiresInDays(diffMs > 0 ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) : null);
                  } else {
                    setHeroExpiresInDays(null);
                  }
                }
                setShowHeroModal(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                fontWeight: 800,
                color: '#FFFFFF',
                background: heroEnabled ? '#D97706' : '#EA580C',
                padding: '10px 18px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(234, 88, 12, 0.25)',
                transition: 'all 0.2s',
              }}
            >
              <Sparkles style={{ width: '16px', height: '16px' }} />
              Басты бет хабарламасы
              {heroEnabled && (
                <span style={{ fontSize: '10px', padding: '2px 6px', background: 'rgba(255,255,255,0.25)', borderRadius: '12px', fontWeight: 800 }}>
                  ҚОСУЛЫ
                </span>
              )}
            </button>

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
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginBottom: '28px',
          }}
        >
          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '20px 24px', border: '1.5px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#64748B', marginBottom: '6px' }}>Барлық хаттар</div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-dark)' }}>{messages.length} хабарлама</div>
          </div>

          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '20px 24px', border: '1.5px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#64748B', marginBottom: '6px' }}>Барлығына жіберілген</div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-dark)' }}>
              {messages.filter((m) => m.targetType === 'all').length} хабарлама
            </div>
          </div>

          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '20px 24px', border: '1.5px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#64748B', marginBottom: '6px' }}>Жеке хаттар</div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-dark)' }}>
              {messages.filter((m) => m.targetType === 'single').length} хат
            </div>
          </div>

          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '20px 24px', border: '1.5px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#64748B', marginBottom: '6px' }}>Топтық хаттар</div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-dark)' }}>
              {messages.filter((m) => m.targetType === 'multiple').length} хат
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
                Жіберілген хаттар тарихы
              </h2>
            </div>

            {/* Filters & Search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
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
                  Барлығы: {messages.length}
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
                  Жалпы: {messages.filter((m) => m.targetType === 'all').length}
                </button>

                <button
                  type="button"
                  onClick={() => setFilterTarget('single')}
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: filterTarget === 'single' ? '#FFFFFF' : '#64748B',
                    background: filterTarget === 'single' ? 'var(--blue)' : '#F1F5F9',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Жеке: {messages.filter((m) => m.targetType === 'single').length}
                </button>

                <button
                  type="button"
                  onClick={() => setFilterTarget('multiple')}
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: filterTarget === 'multiple' ? '#FFFFFF' : '#64748B',
                    background: filterTarget === 'multiple' ? 'var(--blue)' : '#F1F5F9',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Топтық: {messages.filter((m) => m.targetType === 'multiple').length}
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
                    <th style={{ width: '180px' }}>Алушылар</th>
                    <th style={{ width: '120px' }}>Маңыздылығы</th>
                    <th style={{ width: '160px' }}>Өшу / Өшіру құқығы</th>
                    <th style={{ width: '140px' }}>Уақыты</th>
                    <th style={{ width: '90px', textAlign: 'center' }}>Оқығандар</th>
                    <th style={{ width: '80px', textAlign: 'right' }}>Әрекет</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMessages.map((msg, idx) => {
                    const priorityLabels: Record<MessagePriority, string> = {
                      normal: 'Қалыпты',
                      news: 'Жаңалық',
                      important: 'Маңызды',
                    };
                    const priorityText = priorityLabels[msg.priority || 'normal'];

                    return (
                      <tr
                        key={msg.id}
                        onClick={() => setSelectedMessageForView(msg)}
                        style={{ cursor: 'pointer' }}
                        title="Толық мәліметті көру үшін басыңыз"
                      >
                        <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-dark)', fontSize: '12px' }}>
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
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)' }}>
                              Барлық оқырмандарға
                            </span>
                          ) : (
                            <div>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)' }}>
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
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)' }}>
                            {priorityText}
                          </span>
                        </td>

                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)' }}>
                              {msg.canReaderDelete ? 'Өшіруге болады' : 'Өшірілмейді'}
                            </span>
                            <span style={{ fontSize: '11px', color: '#64748B' }}>
                              {msg.expiresAt
                                ? (new Date(msg.expiresAt).getTime() <= Date.now()
                                    ? 'Мерзімі өткен'
                                    : (msg.expiresInHours ? `${msg.expiresInHours} сағат` : 'Мерзімді'))
                                : 'Шексіз'}
                            </span>
                          </div>
                        </td>

                        <td style={{ fontSize: '12px', color: '#64748B' }}>
                          {formatMessageDate(msg.createdAt)}
                        </td>

                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-dark)' }}>
                            {msg.readByUserIds?.length || 0}
                          </span>
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMessageToDelete(msg);
                            }}
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
              <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'center' }}>
                <Mail size={36} color="#94A3B8" strokeWidth={1.5} />
              </div>
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
                style={{ background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSendMessage}>
              {/* Target Type selector */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                  Хат кімге жіберіледі?
                </label>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '4px',
                    background: '#F1F5F9',
                    padding: '4px',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setTargetType('all')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '7px',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: targetType === 'all' ? '#FFFFFF' : 'transparent',
                      color: targetType === 'all' ? 'var(--blue)' : '#64748B',
                      boxShadow: targetType === 'all' ? '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)' : 'none',
                      fontSize: '12.5px',
                      fontWeight: targetType === 'all' ? 700 : 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Globe size={15} strokeWidth={targetType === 'all' ? 2.5 : 2} color={targetType === 'all' ? 'var(--blue)' : '#94A3B8'} />
                    <span>Барлығына</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetType('single')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '7px',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: targetType === 'single' ? '#FFFFFF' : 'transparent',
                      color: targetType === 'single' ? 'var(--blue)' : '#64748B',
                      boxShadow: targetType === 'single' ? '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)' : 'none',
                      fontSize: '12.5px',
                      fontWeight: targetType === 'single' ? 700 : 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <UserIcon size={15} strokeWidth={targetType === 'single' ? 2.5 : 2} color={targetType === 'single' ? 'var(--blue)' : '#94A3B8'} />
                    <span>Бір оқырманға</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetType('multiple')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '7px',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: targetType === 'multiple' ? '#FFFFFF' : 'transparent',
                      color: targetType === 'multiple' ? 'var(--blue)' : '#64748B',
                      boxShadow: targetType === 'multiple' ? '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)' : 'none',
                      fontSize: '12.5px',
                      fontWeight: targetType === 'multiple' ? 700 : 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Users size={15} strokeWidth={targetType === 'multiple' ? 2.5 : 2} color={targetType === 'multiple' ? 'var(--blue)' : '#94A3B8'} />
                    <span>Бірнеше оқырманға</span>
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
                  placeholder="Хат тақырыбын жазыңыз..."
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

              {/* Priority */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Маңыздылығы
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as MessagePriority)}
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
                  <option value="normal">Қалыпты хабарлама</option>
                  <option value="news">Жаңалық / Хабарландыру</option>
                  <option value="important">Маңызды ескерту</option>
                </select>
              </div>

              {/* Reader Delete Permission & Auto-delete Expiration Settings */}
              <div
                style={{
                  background: '#F8FAFC',
                  borderRadius: '14px',
                  padding: '16px 18px',
                  border: '1px solid #E2E8F0',
                  marginBottom: '24px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '14px' }}>
                  <Shield size={16} strokeWidth={2.2} color="var(--blue)" />
                  <span>Қауіпсіздік және өшу баптаулары</span>
                </div>

                {/* Reader Deletion Permission */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                    Оқырман бұл хабарламаны өшіре ала ма?
                  </label>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '4px',
                      background: '#FFFFFF',
                      padding: '3px',
                      borderRadius: '10px',
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setCanReaderDelete(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '8px 12px',
                        borderRadius: '7px',
                        border: 'none',
                        background: !canReaderDelete ? 'var(--blue)' : 'transparent',
                        color: !canReaderDelete ? '#FFFFFF' : '#64748B',
                        fontSize: '12px',
                        fontWeight: !canReaderDelete ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Lock size={13} strokeWidth={!canReaderDelete ? 2.5 : 2} color={!canReaderDelete ? '#FFFFFF' : '#94A3B8'} />
                      <span>Өшіре алмайды</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCanReaderDelete(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '8px 12px',
                        borderRadius: '7px',
                        border: 'none',
                        background: canReaderDelete ? '#F97316' : 'transparent',
                        color: canReaderDelete ? '#FFFFFF' : '#64748B',
                        fontSize: '12px',
                        fontWeight: canReaderDelete ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Unlock size={13} strokeWidth={canReaderDelete ? 2.5 : 2} color={canReaderDelete ? '#FFFFFF' : '#94A3B8'} />
                      <span>Өшіре алады</span>
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
                      fontSize: '12.5px',
                      fontWeight: 600,
                      outline: 'none',
                      background: '#FFFFFF',
                      color: 'var(--text-dark)',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="">Шексіз (автоматты түрде өшпейді)</option>
                    <option value="1">1 сағаттан кейін</option>
                    <option value="3">3 сағаттан кейін</option>
                    <option value="6">6 сағаттан кейін</option>
                    <option value="12">12 сағаттан кейін</option>
                    <option value="24">24 сағаттан кейін (1 күн)</option>
                    <option value="48">2 күннен кейін</option>
                    <option value="72">3 күннен кейін</option>
                    <option value="168">7 күннен кейін (1 апта)</option>
                    <option value="720">30 күннен кейін (1 ай)</option>
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

      {/* MESSAGE DETAIL VIEW MODAL */}
      {selectedMessageForView && (
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
          onClick={() => setSelectedMessageForView(null)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '620px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px 30px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '22px', backgroundColor: 'var(--blue)', borderRadius: '4px', display: 'inline-block' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-dark)' }}>
                  Хат туралы толық мәлімет
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMessageForView(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748B',
                  padding: '4px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Badges */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: '#F1F5F9',
                  color: 'var(--text-dark)',
                  border: '1px solid #E2E8F0',
                }}
              >
                {selectedMessageForView.priority === 'important'
                  ? 'Маңызды ескерту'
                  : selectedMessageForView.priority === 'news'
                  ? 'Жаңалық'
                  : 'Қалыпты'}
              </span>

              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: '#F1F5F9',
                  color: 'var(--text-dark)',
                  border: '1px solid #E2E8F0',
                }}
              >
                {selectedMessageForView.targetType === 'all'
                  ? 'Барлық оқырмандарға'
                  : selectedMessageForView.targetType === 'single'
                  ? 'Жеке хат'
                  : 'Топтық хат'}
              </span>

              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: '#F1F5F9',
                  color: 'var(--text-dark)',
                  border: '1px solid #E2E8F0',
                }}
              >
                {selectedMessageForView.canReaderDelete ? 'Оқырман өшіре алады' : 'Өшірілмейді'}
              </span>

              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: '#F1F5F9',
                  color: 'var(--text-dark)',
                  border: '1px solid #E2E8F0',
                }}
              >
                {selectedMessageForView.expiresInHours
                  ? `${selectedMessageForView.expiresInHours} сағатта өшеді`
                  : 'Мерзімі шексіз'}
              </span>
            </div>

            {/* Title & Content Box */}
            <div
              style={{
                background: '#F8FAFC',
                borderRadius: '12px',
                padding: '18px 20px',
                border: '1px solid #E2E8F0',
                marginBottom: '20px',
              }}
            >
              <h4 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-dark)', margin: '0 0 10px 0' }}>
                {selectedMessageForView.title}
              </h4>
              <div
                style={{
                  fontSize: '14px',
                  color: '#334155',
                  lineHeight: 1.65,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {selectedMessageForView.content}
              </div>
            </div>

            {/* Details Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                marginBottom: '24px',
                fontSize: '13px',
              }}
            >
              <div style={{ background: '#FFFFFF', padding: '12px 14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '2px' }}>
                  Жіберілген уақыты:
                </span>
                <strong style={{ color: 'var(--text-dark)' }}>
                  {formatMessageDate(selectedMessageForView.createdAt)}
                </strong>
              </div>

              <div style={{ background: '#FFFFFF', padding: '12px 14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '2px' }}>
                  Оқығандар:
                </span>
                <strong style={{ color: 'var(--text-dark)' }}>
                  {selectedMessageForView.readByUserIds?.length || 0} оқырман
                </strong>
              </div>

              <div style={{ gridColumn: 'span 2', background: '#FFFFFF', padding: '12px 14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>
                  Алушы оқырмандар:
                </span>
                {selectedMessageForView.targetType === 'all' ? (
                  <span style={{ fontWeight: 700, color: '#047857' }}>
                    Барлық оқырмандарға жіберілген
                  </span>
                ) : (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                    {selectedMessageForView.targetUserNames?.map((name, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          background: '#EFF6FF',
                          color: 'var(--blue)',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: '1px solid #BFDBFE',
                        }}
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  const msg = selectedMessageForView;
                  setSelectedMessageForView(null);
                  setMessageToDelete(msg);
                }}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: '1px solid #FECACA',
                  background: '#FEF2F2',
                  color: '#B91C1C',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Хатты өшіру
              </button>

              <button
                type="button"
                onClick={() => setSelectedMessageForView(null)}
                style={{
                  padding: '9px 22px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--blue)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Жабу
              </button>
            </div>
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
                  background: '#EF4444',
                  color: '#FFF',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Өшіру
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HERO MESSAGE MODAL */}
      {showHeroModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(13,27,42,0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setShowHeroModal(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '24px',
              maxWidth: '620px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '32px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#EA580C', fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                  <Sparkles style={{ width: '15px', height: '15px' }} />
                  Сайтқа кірушілерге арналған
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A', margin: 0 }}>
                  Басты бет хабарламасы
                </h3>
                <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0', lineHeight: 1.5 }}>
                  Бұл хабарлама сайтқа кірген кезде Басты беттің ең басында үлкен мәтін болып көрінеді.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowHeroModal(false)}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748B',
                }}
              >
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </div>

            <form onSubmit={handleSaveHeroMessage} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Active Toggle Switch */}
              <div
                style={{
                  padding: '16px 20px',
                  borderRadius: '16px',
                  background: heroEnabled ? '#FFFBEB' : '#F8FAFC',
                  border: `1.5px solid ${heroEnabled ? '#FDE68A' : '#E2E8F0'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onClick={() => setHeroEnabled(!heroEnabled)}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: heroEnabled ? '#92400E' : '#334155' }}>
                    {heroEnabled ? 'Хабарлама белсенді (Басты бетте көрінеді)' : 'Хабарлама өшірулі'}
                  </div>
                  <div style={{ fontSize: '12px', color: heroEnabled ? '#B45309' : '#64748B', marginTop: '2px' }}>
                    {heroEnabled ? 'Таңдалған аудитория сайтқа кіргенде мәтінді көреді' : 'Қосу үшін осы батырманы басыңыз'}
                  </div>
                </div>

                <div
                  style={{
                    width: '48px',
                    height: '26px',
                    borderRadius: '13px',
                    background: heroEnabled ? '#EA580C' : '#CBD5E1',
                    position: 'relative',
                    transition: 'background 0.2s',
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: '#FFFFFF',
                      position: 'absolute',
                      top: '3px',
                      left: heroEnabled ? '25px' : '3px',
                      transition: 'left 0.2s',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    }}
                  />
                </div>
              </div>

              {/* Message Text Input */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>
                  Хабарлама мәтіні:
                </label>
                <input
                  type="text"
                  value={heroText}
                  onChange={(e) => setHeroText(e.target.value)}
                  placeholder="Мысалы: Сәлем немесе Қош келдіңіз!"
                  maxLength={120}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '15px',
                    fontWeight: 700,
                    color: '#0F172A',
                    outline: 'none',
                    background: '#FFFFFF',
                    boxSizing: 'border-box',
                  }}
                />

                {/* Quick Templates */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, alignSelf: 'center' }}>
                    Дайын үлгілер:
                  </span>
                  {['Сәлем', 'Қош келдіңіздер!', 'Tanda-ға қош келдіңіз!', 'Оқы. Тыңда. Дамы.'].map((tmpl) => (
                    <button
                      key={tmpl}
                      type="button"
                      onClick={() => setHeroText(tmpl)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '8px',
                        background: '#F1F5F9',
                        border: '1px solid #E2E8F0',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#475569',
                        cursor: 'pointer',
                      }}
                    >
                      {tmpl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Audience Target Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>
                  Кімдерге көрсету (Аудитория):
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                  {/* All */}
                  <div
                    onClick={() => setHeroTarget('all')}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: `1.5px solid ${heroTarget === 'all' ? '#EA580C' : '#E2E8F0'}`,
                      background: heroTarget === 'all' ? '#FFF7ED' : '#FFFFFF',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '13px', color: heroTarget === 'all' ? '#C2410C' : '#334155' }}>
                      <Globe2 style={{ width: '15px', height: '15px' }} />
                      Барлығына
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748B' }}>
                      Тіркелген & қонақтар
                    </span>
                  </div>

                  {/* Registered Only */}
                  <div
                    onClick={() => setHeroTarget('registered')}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: `1.5px solid ${heroTarget === 'registered' ? '#EA580C' : '#E2E8F0'}`,
                      background: heroTarget === 'registered' ? '#FFF7ED' : '#FFFFFF',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '13px', color: heroTarget === 'registered' ? '#C2410C' : '#334155' }}>
                      <UserCheck style={{ width: '15px', height: '15px' }} />
                      Тек тіркелгендерге
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748B' }}>
                      Логин жасағандар
                    </span>
                  </div>

                  {/* Unregistered Only */}
                  <div
                    onClick={() => setHeroTarget('unregistered')}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: `1.5px solid ${heroTarget === 'unregistered' ? '#EA580C' : '#E2E8F0'}`,
                      background: heroTarget === 'unregistered' ? '#FFF7ED' : '#FFFFFF',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '13px', color: heroTarget === 'unregistered' ? '#C2410C' : '#334155' }}>
                      <UserX style={{ width: '15px', height: '15px' }} />
                      Тек тіркелмегендерге
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748B' }}>
                      Жаңа қонақтарға
                    </span>
                  </div>
                </div>
              </div>

              {/* Expiration Duration */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>
                  Көрсетілу мерзімі:
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    { label: 'Шексіз', days: null },
                    { label: '1 күн', days: 1 },
                    { label: '3 күн', days: 3 },
                    { label: '7 күн', days: 7 },
                    { label: '30 күн', days: 30 },
                  ].map((item) => {
                    const isSelected = heroExpiresInDays === item.days;
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => setHeroExpiresInDays(item.days)}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '10px',
                          border: `1.5px solid ${isSelected ? '#EA580C' : '#CBD5E1'}`,
                          background: isSelected ? '#FFF7ED' : '#FFFFFF',
                          color: isSelected ? '#C2410C' : '#475569',
                          fontWeight: 700,
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live Preview */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800, color: '#64748B', marginBottom: '8px' }}>
                  <Eye style={{ width: '14px', height: '14px' }} />
                  Басты бетте қалай көрінеді:
                </div>
                <div
                  style={{
                    background: 'linear-gradient(135deg, #071526 0%, #0d2646 100%)',
                    borderRadius: '16px',
                    padding: '24px 20px',
                    border: '1px solid #1E293B',
                    color: '#FFFFFF',
                  }}
                >
                  <div
                    style={{
                      fontSize: '32px',
                      fontWeight: 900,
                      color: '#FFFFFF',
                      letterSpacing: '-0.02em',
                      marginBottom: '10px',
                      minHeight: '40px',
                      lineHeight: 1.2,
                    }}
                  >
                    {heroText.trim() ? heroText : <span style={{ color: '#475569', fontSize: '20px' }}>Хабарлама мәтіні...</span>}
                  </div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '20px', fontWeight: 900, color: '#FFFFFF', marginBottom: '8px' }}>
                    tandamen<span style={{ color: '#EA580C' }}>.kz</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700 }}>
                    Қазақша кітаптар қоры &bull; Оқы. Тыңда. Дамы.
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', borderTop: '1px solid #F1F5F9', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowHeroModal(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '12px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#475569',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Болдырмау
                </button>
                <button
                  type="submit"
                  disabled={isSavingHero}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '12px',
                    border: 'none',
                    background: '#EA580C',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: isSavingHero ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(234, 88, 12, 0.3)',
                    opacity: isSavingHero ? 0.7 : 1,
                  }}
                >
                  {isSavingHero ? 'Сақталуда...' : 'Сақтау'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

