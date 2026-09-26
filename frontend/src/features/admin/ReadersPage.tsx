import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import { User, DeletedUserArchive } from '../../types';
import { hasAdminPermission } from '../../utils/permissions';
import { readersApi } from '../../shared/api/readers.api';

export const ReadersPage: React.FC = () => {
  const navigate = useNavigate();
  const { clients, user, role, isAuthInitialized, toggleBlockUser, fetchClients, deleteUser } = useAuthStore();
  const { showToast } = useToastStore();

  const canViewReaders = hasAdminPermission(user, 'readers_view');
  const canManageReaders = hasAdminPermission(user, 'readers_manage');
  const canDeleteReaders = hasAdminPermission(user, 'readers_delete');

  useEffect(() => {
    if (!isAuthInitialized) return;
    if (role !== 'admin' || !canViewReaders) {
      showToast('Оқырмандар бөліміне кіруге рұқсатыңыз жоқ', 'error');
      navigate('/admin', { replace: true });
    }
  }, [isAuthInitialized, role, canViewReaders, navigate, showToast]);

  const [readers, setReaders] = useState<User[]>(() => clients || []);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToBlock, setUserToBlock] = useState<User | null>(null);
  const [previewAvatarUser, setPreviewAvatarUser] = useState<User | null>(null);

  // Tabs state: 'active' | 'archives'
  const [activeTab, setActiveTab] = useState<'active' | 'archives'>('active');
  const [archives, setArchives] = useState<DeletedUserArchive[]>([]);
  const [isLoadingArchives, setIsLoadingArchives] = useState(false);
  const [selectedArchive, setSelectedArchive] = useState<DeletedUserArchive | null>(null);

  // Pagination state
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const fetchReaders = async () => {
    setIsLoading(true);
    try {
      const list = await fetchClients();
      if (Array.isArray(list)) {
        setReaders(list);
      }
    } catch (err) {
      console.error('Error fetching readers:', err);
      showToast('Оқырмандар тізімін жүктеу мүмкін болмады', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchArchives = async () => {
    setIsLoadingArchives(true);
    try {
      const list = await readersApi.getDeletedUserArchives();
      if (Array.isArray(list)) {
        setArchives(list);
      }
    } catch (err) {
      console.error('Error fetching archives:', err);
      showToast('Жойылғандар мұрағатын жүктеу мүмкін болмады', 'error');
    } finally {
      setIsLoadingArchives(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'archives') {
      fetchArchives();
    }
  }, [activeTab]);

  // Sync with store when clients change
  useEffect(() => {
    if (clients && clients.length > 0) {
      setReaders(clients);
    }
  }, [clients]);

  // Fetch readers once auth is initialized
  useEffect(() => {
    if (isAuthInitialized && role === 'admin' && canViewReaders) {
      fetchReaders();
    }
  }, [isAuthInitialized, role, canViewReaders]);

  // Apply search query
  const filteredReaders = useMemo(() => {
    if (!searchQuery.trim()) return readers;
    const q = searchQuery.toLowerCase().trim();
    const cleanQ = q.replace(/[\s\-_:]+/g, '').replace(/^id/i, '');

    return readers.filter((r) => {
      const name = (r.name || '').toLowerCase();
      const email = (r.email || '').toLowerCase();
      const rawIdNum = (r.idNumber || '').toLowerCase();
      const cleanIdNum = rawIdNum.replace(/[\s\-_:]+/g, '').replace(/^id/i, '');
      const rawUserId = (r.id || '').toLowerCase();

      if (name.includes(q) || email.includes(q) || rawIdNum.includes(q) || rawUserId.includes(q)) {
        return true;
      }

      if (cleanQ.length > 0 && cleanIdNum.length > 0) {
        if (cleanIdNum.includes(cleanQ) || cleanQ.includes(cleanIdNum)) {
          return true;
        }
      }

      return false;
    });
  }, [readers, searchQuery]);

  // Apply search query to archives
  const filteredArchives = useMemo(() => {
    if (!searchQuery.trim()) return archives;
    const q = searchQuery.toLowerCase().trim();
    return archives.filter((a) => {
      const name = (a.originalName || '').toLowerCase();
      const email = (a.originalEmail || '').toLowerCase();
      const idNum = (a.idNumber || '').toLowerCase();
      const phone = (a.originalPhone || '').toLowerCase();
      const reason = (a.deleteReason || '').toLowerCase();
      return name.includes(q) || email.includes(q) || idNum.includes(q) || phone.includes(q) || reason.includes(q);
    });
  }, [archives, searchQuery]);

  const activeCount = activeTab === 'active' ? filteredReaders.length : filteredArchives.length;
  const totalPages = Math.max(1, Math.ceil(activeCount / pageSize));

  // Reset to page 1 on search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

  // Ensure current page is within total pages bounds
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Paginated slice
  const paginatedReaders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredReaders.slice(start, start + pageSize);
  }, [filteredReaders, currentPage, pageSize]);

  const paginatedArchives = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredArchives.slice(start, start + pageSize);
  }, [filteredArchives, currentPage, pageSize]);

  const confirmDelete = async () => {
    if (userToDelete) {
      try {
        const res = await deleteUser(userToDelete.id);
        if (res.success) {
          setReaders((prev) => prev.filter((u) => u.id !== userToDelete.id));
          showToast(`"${userToDelete.name || userToDelete.email}" оқырманы тізімнен өшірілді`, 'info');
        } else {
          showToast(res.error || 'Оқырманды өшіру сәтсіз аяқталды', 'error');
        }
      } catch {
        showToast('Оқырманды өшіру сәтсіз аяқталды', 'error');
      } finally {
        setUserToDelete(null);
      }
    }
  };

  const confirmBlock = async () => {
    if (userToBlock) {
      try {
        const res = await toggleBlockUser(userToBlock.id);
        if (res.success) {
          fetchReaders();
          showToast(`«${userToBlock.name || userToBlock.email}» оқырманы бұғатталды. Енді ол жүйеге кіре алмайды`, 'error');
        } else {
          showToast(res.error || 'Блоктау сәтсіз аяқталды', 'error');
        }
      } catch {
        showToast('Блоктау кезінде қате орын алды', 'error');
      } finally {
        setUserToBlock(null);
      }
    }
  };

  const handleUnblock = async (targetReader: User) => {
    try {
      const res = await toggleBlockUser(targetReader.id);
      if (res.success) {
        fetchReaders();
        showToast(`«${targetReader.name || targetReader.email}» оқырманы блоктан сәтті шығарылды!`, 'success');
      } else {
        showToast(res.error || 'Блоктан шығару сәтсіз аяқталды', 'error');
      }
    } catch {
      showToast('Блоктан шығару кезінде қате орын алды', 'error');
    }
  };

  const exportToExcel = () => {
    try {
      const clients = readers;

      if (clients.length === 0) {
        showToast('Жүктеу үшін базада оқырмандар табылмады', 'info');
        return;
      }

      // Format all data rows
      const rows = clients.map((reader, idx) => ({
        '№': idx + 1,
        'ID нөмірі': reader.idNumber || `0000 ${String(1000 + idx + 1).padStart(4, '0')}`,
        'Аты-жөні': reader.name || 'Оқырман',
        'Телефон нөмірі': reader.phone || 'Көрсетілмеген',
        'Электронды поштасы (Email)': reader.email || '',
        'Юзернейм': reader.username ? (reader.username.startsWith('@') ? reader.username : `@${reader.username}`) : 'Көрсетілмеген',
        'Мәртебесі': 'Оқырман',
        'Тіркелген күні': reader.createdAt ? new Date(reader.createdAt).toLocaleDateString('kk-KZ') : '2026-09-01',
        'Тіркелу түрі': reader.authProvider === 'GOOGLE' ? 'Google' : 'Тікелей (Email/Телефон)',
      }));

      // Create Worksheet & Auto Column Widths
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [
        { wch: 6 },  // №
        { wch: 14 }, // ID
        { wch: 28 }, // Аты-жөні
        { wch: 22 }, // Телефон
        { wch: 30 }, // Email
        { wch: 18 }, // Юзернейм
        { wch: 14 }, // Мәртебесі
        { wch: 18 }, // Тіркелген күні
        { wch: 24 }, // Тіркелу түрі
      ];

      // Create Workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Оқырмандар');

      // Export file
      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `Tanda_Oqyrmandar_${dateStr}.xlsx`;
      XLSX.writeFile(wb, filename);

      showToast(`«${filename}» Excel файлы сәтті жүктелді! (${clients.length} оқырман)`, 'success');
    } catch {
      showToast('Excel файлын экспорттау кезінде қате орын алды', 'error');
    }
  };

  return (
    <section className="admin-page-section" id="readers-section">
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        {/* Breadcrumb Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748B' }}>
            <Link to="/admin" style={{ color: 'var(--blue)', fontWeight: 600, textDecoration: 'none' }}>
              Басқару панелі
            </Link>
            <span>/</span>
            <span style={{ color: 'var(--text-dark)', fontWeight: 700 }}>
              Оқырмандар тізімі
            </span>
          </div>

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
              padding: '7px 14px',
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

        {/* Main Card */}
        <div className="admin-card">
          {/* Header Row */}
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
                Оқырмандар тізімі
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-mid)', marginTop: '4px' }}>
                Тіркелген оқырмандар саны: <span style={{ fontWeight: 700, color: 'var(--blue)' }}>{readers.length}</span>
              </p>
            </div>

            {/* Search Box & Add Reader Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Оқырман аты, ID, пошта..."
                  style={{
                    width: '100%',
                    padding: '9px 14px 9px 34px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '13px',
                    outline: 'none',
                    background: '#F8FAFC',
                    color: 'var(--text-dark)',
                    boxSizing: 'border-box',
                  }}
                />
                <svg
                  style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#64748B', pointerEvents: 'none' }}
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </div>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={fetchReaders}
                disabled={isLoading}
                title="Оқырмандар тізімін жаңарту"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 14px',
                  borderRadius: '8px',
                  background: '#FFFFFF',
                  color: 'var(--text-dark)',
                  fontSize: '13px',
                  fontWeight: 700,
                  border: '1.5px solid #CBD5E1',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.7 : 1,
                }}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }}
                >
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
                <span>{isLoading ? 'Жүктелуде...' : 'Жаңарту'}</span>
              </button>

              {/* Export Excel Button */}
              <button
                type="button"
                onClick={exportToExcel}
                title="Оқырмандар тізімін Excel форматында жүктеп алу"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 16px',
                  borderRadius: '8px',
                  background: '#107C41',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  border: 'none',
                  boxShadow: '0 2px 6px rgba(16, 124, 65, 0.25)',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                <span>Excel жүктеу</span>
              </button>

              {canManageReaders && (
                <Link
                  to="/admin/readers/new"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '9px 18px',
                    borderRadius: '8px',
                    background: 'var(--blue)',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    boxShadow: '0 2px 6px rgba(0, 87, 168, 0.25)',
                    transition: 'all 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  <span>Қосу</span>
                </Link>
              )}
            </div>
          </div>

          {/* Tabs: Active Readers vs Deleted Archives */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1.5px solid #E2E8F0', marginBottom: '20px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('active')}
              style={{
                padding: '10px 18px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'active' ? '2.5px solid var(--blue)' : '2.5px solid transparent',
                color: activeTab === 'active' ? 'var(--blue)' : '#64748B',
                fontSize: '14px',
                fontWeight: activeTab === 'active' ? 800 : 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>Белсенді оқырмандар</span>
              <span style={{ fontSize: '12px', background: activeTab === 'active' ? 'rgba(0, 84, 148, 0.1)' : '#F1F5F9', color: activeTab === 'active' ? 'var(--blue)' : '#64748B', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                {readers.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('archives')}
              style={{
                padding: '10px 18px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'archives' ? '2.5px solid #DC2626' : '2.5px solid transparent',
                color: activeTab === 'archives' ? '#DC2626' : '#64748B',
                fontSize: '14px',
                fontWeight: activeTab === 'archives' ? 800 : 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>Жойылғандар мұрағаты (Аудит)</span>
              <span style={{ fontSize: '12px', background: activeTab === 'archives' ? '#FEE2E2' : '#F1F5F9', color: activeTab === 'archives' ? '#DC2626' : '#64748B', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                {archives.length}
              </span>
            </button>
          </div>

          {/* Table Container */}
          {activeTab === 'active' ? (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ width: '45px', textAlign: 'center' }}>№</th>
                    <th style={{ width: '140px', whiteSpace: 'nowrap' }}>ID нөмірі</th>
                    <th>Аты-жөні</th>
                    <th>Электрондық поштасы</th>
                    <th style={{ width: '130px', whiteSpace: 'nowrap' }}>Тіркелген күні</th>
                    <th style={{ width: '120px', whiteSpace: 'nowrap' }}>Мәртебесі</th>
                    <th style={{ width: '240px', textAlign: 'right', whiteSpace: 'nowrap' }}>Әрекеттер</th>
                  </tr>
                </thead>
              <tbody>
                {paginatedReaders.map((reader, index) => {
                  const itemIndex = (currentPage - 1) * pageSize + index + 1;
                  const initial = reader.name ? reader.name.trim().charAt(0).toUpperCase() : 'О';
                  const dateStr = reader.createdAt ? new Date(reader.createdAt).toLocaleDateString('kk-KZ') : '2026-09-01';
                  const isBlocked = reader.isActive === false;
                  return (
                    <tr key={reader.id}>
                      {/* Sequential Number */}
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#64748B', fontSize: '12px' }}>
                        {itemIndex}
                      </td>

                      {/* ID Number */}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 800,
                            fontFamily: 'monospace',
                            background: isBlocked ? 'rgba(220, 38, 38, 0.08)' : 'rgba(0, 84, 148, 0.1)',
                            color: isBlocked ? '#DC2626' : 'var(--blue)',
                            padding: '3px 10px',
                            borderRadius: '4px',
                            letterSpacing: '0.04em',
                            display: 'inline-block',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          ID: {reader.idNumber || `0000 ${String(1000 + itemIndex).padStart(4, '0')}`}
                        </span>
                      </td>

                      {/* Name & Avatar */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            onClick={() => setPreviewAvatarUser(reader)}
                            title="Суретті ашып көру"
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              overflow: 'hidden',
                              background: '#F1F5F9',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '13px',
                              flexShrink: 0,
                              border: '1.5px solid #CBD5E1',
                              cursor: 'pointer',
                              transition: 'transform 0.15s ease',
                              opacity: isBlocked ? 0.75 : 1,
                            }}
                          >
                            <img
                              src={reader.avatarUrl || '/default-reader-avatar.jpg'}
                              alt={reader.name || 'Оқырман'}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: isBlocked ? '#64748B' : 'var(--text-dark)', fontSize: '14px', textDecoration: isBlocked ? 'line-through' : 'none' }}>
                              {reader.name || 'Оқырман'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td>
                        <div style={{ color: 'var(--text-mid)', fontSize: '13px' }}>
                          {reader.email}
                        </div>
                      </td>

                      {/* Registration Date */}
                      <td>
                        <div style={{ color: '#475569', fontSize: '13px', fontWeight: 600 }}>
                          {dateStr}
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        {isBlocked ? (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '20px',
                              background: '#FEE2E2',
                              color: '#991B1B',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#EF4444' }}></span>
                            Блокталған
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '20px',
                              background: '#D1FAE5',
                              color: '#047857',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }}></span>
                            Оқырман
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {canManageReaders && (
                            <Link
                              to={`/admin/readers/${reader.id}/edit`}
                              style={{
                                padding: '6px 11px',
                                fontSize: '12px',
                                fontWeight: 700,
                                background: '#F1F5F9',
                                color: '#0F172A',
                                borderRadius: '6px',
                                border: '1px solid #CBD5E1',
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.15s',
                                cursor: 'pointer',
                              }}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                              Өңдеу
                            </Link>
                          )}

                          {canManageReaders && (
                            isBlocked ? (
                              <button
                                type="button"
                                onClick={() => handleUnblock(reader)}
                                title="Оқырманды блоктан шығару"
                                style={{
                                  padding: '6px 10px',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  background: '#F0FDF4',
                                  color: '#15803D',
                                  borderRadius: '6px',
                                  border: '1px solid #BBF7D0',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                                </svg>
                                Блоктан шығару
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setUserToBlock(reader)}
                                title="Оқырманды блоктау"
                                style={{
                                  padding: '6px 10px',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  background: '#F1F5F9',
                                  color: '#0F172A',
                                  borderRadius: '6px',
                                  border: '1px solid #CBD5E1',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="10"></circle>
                                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                                </svg>
                                Блоктау
                              </button>
                            )
                          )}

                          {canDeleteReaders && (
                            <button
                              type="button"
                              onClick={() => setUserToDelete(reader)}
                              style={{
                                padding: '6px 11px',
                                fontSize: '12px',
                                fontWeight: 700,
                                background: '#FEF2F2',
                                color: '#B91C1C',
                                borderRadius: '6px',
                                border: '1px solid #FECACA',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                              }}
                            >
                              Өшіру
                            </button>
                          )}

                          {!canManageReaders && !canDeleteReaders && (
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
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ width: '45px', textAlign: 'center' }}>№</th>
                    <th style={{ width: '140px', whiteSpace: 'nowrap' }}>ID нөмірі</th>
                    <th>Бұрынғы аты-жөні</th>
                    <th>Электрондық поштасы</th>
                    <th style={{ width: '140px', whiteSpace: 'nowrap' }}>Өшірілген күні</th>
                    <th style={{ width: '150px', whiteSpace: 'nowrap' }}>Тыңдаған уақыты</th>
                    <th style={{ width: '120px', whiteSpace: 'nowrap' }}>Мәртебесі</th>
                    <th style={{ width: '140px', textAlign: 'right', whiteSpace: 'nowrap' }}>Толық мәлімет</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedArchives.map((archive, index) => {
                    const itemIndex = (currentPage - 1) * pageSize + index + 1;
                    const dateStr = archive.deletedAt ? new Date(archive.deletedAt).toLocaleDateString('kk-KZ', { hour: '2-digit', minute: '2-digit' }) : '—';
                    const mins = archive.totalListenMinutes || Math.floor((archive.totalListenSeconds || 0) / 60);
                    const hours = Math.floor(mins / 60);
                    const remMins = mins % 60;
                    const formattedListen = hours > 0 ? `${hours} сағ ${remMins} мин` : `${mins} мин`;

                    return (
                      <tr key={archive.id}>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: '#64748B', fontSize: '12px' }}>
                          {itemIndex}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: 800,
                              fontFamily: 'monospace',
                              background: 'rgba(220, 38, 38, 0.08)',
                              color: '#DC2626',
                              padding: '3px 10px',
                              borderRadius: '4px',
                              letterSpacing: '0.04em',
                            }}
                          >
                            ID: {archive.idNumber || '—'}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '14px' }}>
                            {archive.originalName || 'Аноним'}
                          </div>
                          {archive.originalPhone && (
                            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                              {archive.originalPhone}
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ color: 'var(--text-mid)', fontSize: '13px', fontFamily: 'monospace' }}>
                            {archive.originalEmail}
                          </div>
                        </td>
                        <td>
                          <div style={{ color: '#DC2626', fontSize: '12.5px', fontWeight: 700 }}>
                            {dateStr}
                          </div>
                        </td>
                        <td>
                          <div style={{ color: 'var(--blue)', fontSize: '13px', fontWeight: 800 }}>
                            {formattedListen}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>
                            {archive.booksListenedCount || 0} кітап тыңдаған
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '20px',
                              background: '#FEE2E2',
                              color: '#991B1B',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#EF4444' }}></span>
                            Өшірілген
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedArchive(archive)}
                            style={{
                              padding: '6px 12px',
                              fontSize: '12px',
                              fontWeight: 700,
                              background: '#F1F5F9',
                              color: 'var(--blue)',
                              borderRadius: '6px',
                              border: '1px solid #CBD5E1',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"></circle>
                              <line x1="12" y1="16" x2="12" y2="12"></line>
                              <line x1="12" y1="8" x2="12.01" y2="8"></line>
                            </svg>
                            Ақпарат
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {(isLoading || isLoadingArchives) && (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-mid)' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  border: '3px solid #CBD5E1',
                  borderTopColor: 'var(--blue)',
                  borderRadius: '50%',
                  margin: '0 auto 12px auto',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              <div style={{ fontSize: '14px', fontWeight: 600 }}>Деректер жүктелуде...</div>
            </div>
          )}

          {!isLoading && !isLoadingArchives && (activeTab === 'active' ? filteredReaders.length === 0 : filteredArchives.length === 0) && (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-mid)' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '6px' }}>
                {activeTab === 'active'
                  ? (searchQuery.trim() ? 'Іздеу бойынша оқырман табылмады' : 'Оқырмандар табылмады немесе тізім бос')
                  : (searchQuery.trim() ? 'Іздеу бойынша мұрағаттан табылмады' : 'Әзірге өшірілген оқырмандар мұрағаты бос')}
              </div>
              <p style={{ fontSize: '13px', margin: '0 0 16px 0', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
                {searchQuery.trim()
                  ? `«${searchQuery}» сұранысы бойынша ешқандай жазба табылмады. Іздеу сөзін өзгертіп көріңіз.`
                  : activeTab === 'active'
                    ? 'Жүйеде әлі тіркелген оқырмандар жоқ немесе желідегі деректерді жаңарту қажет.'
                    : 'Пайдаланушылар өз аккаунтын өшірген кезде олардың барлық аудит мәліметтері осы жерде сақталады.'}
              </p>
              <button
                type="button"
                onClick={activeTab === 'active' ? fetchReaders : fetchArchives}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 18px',
                  borderRadius: '8px',
                  background: 'var(--blue)',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0, 87, 168, 0.25)',
                }}
              >
                Қайта жүктеу
              </button>
            </div>
          )}

          {/* Pagination controls */}
          {filteredReaders.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                marginTop: '20px',
                paddingTop: '16px',
                borderTop: '1.5px solid #F1F5F9',
              }}
            >
              {/* Page size selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
                  Беттегі оқырман саны:
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'var(--text-dark)',
                    background: '#FFFFFF',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                  <option value={40}>40</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span style={{ fontSize: '13px', color: '#94A3B8', marginLeft: '6px' }}>
                  ({Math.min((currentPage - 1) * pageSize + 1, filteredReaders.length)}-
                  {Math.min(currentPage * pageSize, filteredReaders.length)} / Барлығы {filteredReaders.length})
                </span>
              </div>

              {/* Page navigation */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    background: currentPage === 1 ? '#F8FAFC' : '#FFFFFF',
                    color: currentPage === 1 ? '#94A3B8' : 'var(--text-dark)',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                  Алдыңғы
                </button>

                {/* Number buttons */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                  if (
                    totalPages > 7 &&
                    pageNum !== 1 &&
                    pageNum !== totalPages &&
                    Math.abs(pageNum - currentPage) > 1
                  ) {
                    if (pageNum === 2 && currentPage > 3) {
                      return (
                        <span key="dots-start" style={{ padding: '0 4px', color: '#94A3B8', fontSize: '12px' }}>
                          ...
                        </span>
                      );
                    }
                    if (pageNum === totalPages - 1 && currentPage < totalPages - 2) {
                      return (
                        <span key="dots-end" style={{ padding: '0 4px', color: '#94A3B8', fontSize: '12px' }}>
                          ...
                        </span>
                      );
                    }
                    return null;
                  }

                  const isActive = currentPage === pageNum;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      style={{
                        minWidth: '34px',
                        height: '34px',
                        padding: '0 8px',
                        borderRadius: '8px',
                        border: isActive ? '1.5px solid var(--blue)' : '1.5px solid #CBD5E1',
                        background: isActive ? 'var(--blue)' : '#FFFFFF',
                        color: isActive ? '#FFFFFF' : 'var(--text-dark)',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    background: currentPage === totalPages ? '#F8FAFC' : '#FFFFFF',
                    color: currentPage === totalPages ? '#94A3B8' : 'var(--text-dark)',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  Кейінгі
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(13,27,42,0.7)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '440px',
              width: '100%',
              padding: '30px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            }}
          >
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '12px' }}>
              Оқырманды өшіру
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-mid)', lineHeight: 1.6, marginBottom: '24px' }}>
              Сіз шынымен <strong style={{ color: 'var(--text-dark)' }}>{userToDelete.name || userToDelete.email}</strong> (ID: {userToDelete.idNumber}) оқырманын тіркеуден өшіргіңіз келе ме?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
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
                onClick={confirmDelete}
                style={{
                  padding: '9px 22px',
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

      {/* Block User Confirmation Modal */}
      {userToBlock && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(13,27,42,0.7)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300,
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
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: '#FEF2F2',
                  color: '#DC2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                </svg>
              </div>
              <h3 style={{ fontSize: '19px', fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>
                Оқырманды блоктау
              </h3>
            </div>

            <p style={{ fontSize: '14px', color: 'var(--text-mid)', lineHeight: 1.6, marginBottom: '16px' }}>
              Сіз шынымен <strong style={{ color: 'var(--text-dark)' }}>{userToBlock.name || userToBlock.email}</strong> (ID: {userToBlock.idNumber || userToBlock.id}) оқырманын бұғаттағыңыз келе ме?
            </p>

            <div
              style={{
                background: '#FFFBEB',
                border: '1px solid #FDE68A',
                borderRadius: '10px',
                padding: '12px 14px',
                fontSize: '12px',
                color: '#92400E',
                lineHeight: 1.5,
                marginBottom: '24px',
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: '4px' }}>Блокталған кезде:</div>
              <ul style={{ margin: 0, paddingLeft: '18px' }}>
                <li>Оқырман жүйеге кіре алмайды;</li>
                <li>Егер аккаунтқа кіріп тұрса, жүйеден бірден шығарылады;</li>
                <li>Бұл оқырманның телефон нөмірі мен поштасына қайта аккаунт ашылмайды.</li>
              </ul>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setUserToBlock(null)}
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
                onClick={confirmBlock}
                style={{
                  padding: '9px 22px',
                  borderRadius: '50px',
                  border: 'none',
                  background: '#DC2626',
                  color: '#FFF',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Иә, блоктау
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Avatar Preview Modal */}
      {previewAvatarUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(13, 27, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1400,
            padding: '24px',
          }}
          onClick={() => setPreviewAvatarUser(null)}
        >
          <div
            style={{
              position: 'relative',
              background: '#FFFFFF',
              borderRadius: '24px',
              maxWidth: '460px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 22px',
                borderBottom: '1px solid #F1F5F9',
                boxSizing: 'border-box',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-dark)' }}>
                  {previewAvatarUser.name || 'Оқырман'}
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-mid)' }}>
                  Оқырманның профиль суреті
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewAvatarUser(null)}
                title="Жабу"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: 'none',
                  background: '#F1F5F9',
                  color: '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Modal Image Body */}
            <div
              style={{
                width: '100%',
                padding: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#F8FAFC',
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  width: '320px',
                  maxWidth: '100%',
                  aspectRatio: '1 / 1',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  boxShadow: '0 12px 32px rgba(0, 84, 148, 0.15)',
                  border: '3px solid #FFFFFF',
                  background: '#E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={previewAvatarUser.avatarUrl || '/default-reader-avatar.jpg'}
                  alt={previewAvatarUser.name || 'Оқырман суреті'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            </div>

            {/* Modal Footer / Info */}
            <div
              style={{
                width: '100%',
                padding: '14px 22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTop: '1px solid #F1F5F9',
                boxSizing: 'border-box',
                background: '#FFFFFF',
              }}
            >
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  fontFamily: 'monospace',
                  background: 'rgba(0, 84, 148, 0.08)',
                  color: 'var(--blue)',
                  padding: '3px 10px',
                  borderRadius: '4px',
                }}
              >
                ID: {previewAvatarUser.idNumber || previewAvatarUser.id}
              </span>

              {previewAvatarUser.avatarUrl && (
                <a
                  href={previewAvatarUser.avatarUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--blue)',
                    textDecoration: 'none',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    background: '#F0F9FF',
                    border: '1px solid #BAE6FD',
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                  Түпнұсқасын ашу
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Selected Archive Details Modal */}
      {selectedArchive && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setSelectedArchive(null)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '24px',
              maxWidth: '520px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25)',
              color: '#0F172A',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: '#FEE2E2', color: '#DC2626' }}>
                  Өшірілген аккаунт аудиті
                </span>
                <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A', margin: '8px 0 0 0' }}>
                  {selectedArchive.originalName || 'Аноним оқырман'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedArchive(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '4px' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13.5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ color: '#64748B' }}>ID нөмірі:</span>
                <span style={{ fontWeight: 800, fontFamily: 'monospace' }}>ID: {selectedArchive.idNumber || '—'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ color: '#64748B' }}>Бұрынғы поштасы:</span>
                <span style={{ fontWeight: 700 }}>{selectedArchive.originalEmail}</span>
              </div>

              {selectedArchive.originalPhone && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                  <span style={{ color: '#64748B' }}>Телефон:</span>
                  <span style={{ fontWeight: 700 }}>{selectedArchive.originalPhone}</span>
                </div>
              )}

              {selectedArchive.originalUsername && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                  <span style={{ color: '#64748B' }}>Юзернейм:</span>
                  <span style={{ fontWeight: 700 }}>@{selectedArchive.originalUsername.replace(/^@/, '')}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ color: '#64748B' }}>Тіркелген күні:</span>
                <span style={{ fontWeight: 600 }}>{selectedArchive.registeredAt ? new Date(selectedArchive.registeredAt).toLocaleDateString('kk-KZ') : '—'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ color: '#64748B' }}>Өшірілген уақыты:</span>
                <span style={{ fontWeight: 700, color: '#DC2626' }}>{selectedArchive.deletedAt ? new Date(selectedArchive.deletedAt).toLocaleString('kk-KZ') : '—'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ color: '#64748B' }}>Жалпы тыңдалған уақыт:</span>
                <span style={{ fontWeight: 800, color: 'var(--blue)' }}>
                  {Math.floor((selectedArchive.totalListenSeconds || 0) / 60)} минут ({((selectedArchive.totalListenSeconds || 0) / 3600).toFixed(1)} сағат)
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ color: '#64748B' }}>Тыңдаған кітаптар саны:</span>
                <span style={{ fontWeight: 800 }}>{selectedArchive.booksListenedCount || 0} кітап</span>
              </div>

              {selectedArchive.ipAddress && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                  <span style={{ color: '#64748B' }}>Өшірілген IP мекенжайы:</span>
                  <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{selectedArchive.ipAddress}</span>
                </div>
              )}

              {selectedArchive.deleteReason && (
                <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '10px', marginTop: '4px' }}>
                  <span style={{ display: 'block', color: '#64748B', fontSize: '12px', marginBottom: '4px', fontWeight: 700 }}>Көрсеткен себебі:</span>
                  <span style={{ color: '#0F172A', fontStyle: 'italic' }}>«{selectedArchive.deleteReason}»</span>
                </div>
              )}
            </div>

            <div style={{ marginTop: '24px' }}>
              <button
                type="button"
                onClick={() => setSelectedArchive(null)}
                style={{
                  width: '100%',
                  padding: '11px',
                  borderRadius: '12px',
                  border: '1.5px solid #CBD5E1',
                  background: '#F1F5F9',
                  color: '#0F172A',
                  fontSize: '13.5px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Жабу
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
