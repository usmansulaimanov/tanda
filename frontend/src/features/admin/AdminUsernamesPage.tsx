import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import { hasAdminPermission } from '../../utils/permissions';

export const AdminUsernamesPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    user,
    role,
    isAuthInitialized,
    reservedUsernames,
    fetchReservedUsernames,
    addReservedUsername,
    addReservedUsernames,
    removeReservedUsername,
    removeReservedUsernames,
    removeAllReservedUsernames,
  } = useAuthStore();
  const { showToast } = useToastStore();

  const isSuperAdmin = Boolean(user?.isSuperAdmin || (role === 'admin' && !user?.duty));
  const canManageUsernames = isSuperAdmin || hasAdminPermission(user, 'usernames_manage');

  // Form states
  const [newUsernameInput, setNewUsernameInput] = useState('');
  const [newUsernameError, setNewUsernameError] = useState('');
  const [isAddingSingle, setIsAddingSingle] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Batch modal states
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchInput, setBatchInput] = useState('');
  const [batchError, setBatchError] = useState('');
  const [isAddingBatch, setIsAddingBatch] = useState(false);

  // Selection states for multi-deletion
  const [selectedUsernames, setSelectedUsernames] = useState<Set<string>>(new Set());
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [deletingUsername, setDeletingUsername] = useState<string | null>(null);

  // Fetch reserved usernames on mount
  useEffect(() => {
    fetchReservedUsernames();
  }, [fetchReservedUsernames]);

  // Auth & Permission guard
  useEffect(() => {
    if (!isAuthInitialized) return;
    if (!user || (role !== 'admin' && !isSuperAdmin)) {
      showToast('Бұл бетке кіру үшін әкімші рұқсаты қажет', 'error');
      navigate('/login?redirect=/admin/usernames', { replace: true });
      return;
    }
    if (!canManageUsernames) {
      showToast('Юзернеймдерді басқаруға рұқсатыңыз жоқ', 'error');
      navigate('/admin/home', { replace: true });
    }
  }, [isAuthInitialized, user, role, isSuperAdmin, canManageUsernames, navigate, showToast]);

  // Add single reserved username
  const handleAddSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newUsernameInput.trim().toLowerCase().replace(/^@/, '');
    if (!clean) {
      setNewUsernameError('Юзернеймді енгізіңіз');
      return;
    }
    if (clean.length < 3) {
      setNewUsernameError('Юзернейм кемінде 3 таңбадан тұруы керек');
      return;
    }
    if (!/^[a-zA-Z0-9_.]+$/.test(clean)) {
      setNewUsernameError('Тек латын әріптері, сандар, _ және . рұқсат етілген');
      return;
    }
    if (reservedUsernames.map((u) => u.toLowerCase()).includes(clean)) {
      setNewUsernameError('Бұл юзернейм тізімде бар');
      return;
    }

    setIsAddingSingle(true);
    setNewUsernameError('');

    try {
      const res = await addReservedUsername(clean);
      if (res.success) {
        setNewUsernameInput('');
        showToast(`@${clean} бұғатталған юзернеймдер тізіміне қосылды!`, 'success');
      } else {
        setNewUsernameError(res.error || 'Қосу сәтсіз аяқталды');
      }
    } catch {
      setNewUsernameError('Қосу кезінде қате орын алды');
    } finally {
      setIsAddingSingle(false);
    }
  };

  // Add batch reserved usernames
  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawLines = batchInput
      .split(/[\n,]+/)
      .map((s) => s.trim().toLowerCase().replace(/^@/, ''))
      .filter(Boolean);

    if (rawLines.length === 0) {
      setBatchError('Кем дегенде бір юзернейм жазыңыз');
      return;
    }

    setIsAddingBatch(true);
    setBatchError('');

    try {
      const res = await addReservedUsernames(rawLines);
      if (res.error) {
        setBatchError(res.error);
        return;
      }

      if (res.addedCount === 0 && res.skippedCount === 0 && res.invalidCount > 0) {
        setBatchError('Енгізілген юзернеймдердің форматы қате (кемінде 3 таңба, тек латын әріптері, сандар, _ немесе .)');
        return;
      }
      if (res.addedCount === 0 && res.skippedCount > 0) {
        setBatchError('Енгізілген барлық юзернеймдер бұрыннан бар (қайталанғандар өткізілді)');
        return;
      }
      if (res.addedCount === 0) {
        setBatchError('Қосылатын жаңа юзернейм табылмады');
        return;
      }

      let msg = `${res.addedCount} жаңа юзернейм сәтті қосылды!`;
      if (res.skippedCount > 0) {
        msg += ` (${res.skippedCount} қайталанған юзернейм өткізілді)`;
      }
      showToast(msg, 'success');
      setIsBatchModalOpen(false);
      setBatchInput('');
    } catch {
      setBatchError('Топтық қосу кезінде қате орын алды');
    } finally {
      setIsAddingBatch(false);
    }
  };

  // Remove single reserved username
  const handleRemove = async (u: string) => {
    if (!window.confirm(`@${u} юзернеймін бұғатталғандар тізімінен өшіргіңіз келетініне сенімдісіз бе?`)) {
      return;
    }
    setDeletingUsername(u);
    try {
      const res = await removeReservedUsername(u);
      if (res.success) {
        setSelectedUsernames((prev) => {
          const next = new Set(prev);
          next.delete(u);
          return next;
        });
        showToast(`@${u} тізімнен өшірілді`, 'info');
      } else {
        showToast(res.error || 'Өшіру сәтсіз аяқталды', 'error');
      }
    } catch {
      showToast('Өшіру кезінде қате орын алды', 'error');
    } finally {
      setDeletingUsername(null);
    }
  };

  // Filter and sort list
  const filteredList = useMemo(() => {
    const cleanSearch = searchQuery.trim().toLowerCase().replace(/^@/, '');
    return [...reservedUsernames]
      .filter((u) => !cleanSearch || u.toLowerCase().includes(cleanSearch))
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [reservedUsernames, searchQuery]);

  // Toggle single item selection
  const toggleSelect = (u: string) => {
    setSelectedUsernames((prev) => {
      const next = new Set(prev);
      if (next.has(u)) {
        next.delete(u);
      } else {
        next.add(u);
      }
      return next;
    });
  };

  // Toggle select all filtered items
  const isAllFilteredSelected = filteredList.length > 0 && filteredList.every((u) => selectedUsernames.has(u));
  const toggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      // Unselect all in current filter
      setSelectedUsernames((prev) => {
        const next = new Set(prev);
        filteredList.forEach((u) => next.delete(u));
        return next;
      });
    } else {
      // Select all in current filter
      setSelectedUsernames((prev) => {
        const next = new Set(prev);
        filteredList.forEach((u) => next.add(u));
        return next;
      });
    }
  };

  // Batch delete selected usernames
  const handleDeleteSelected = async () => {
    const count = selectedUsernames.size;
    if (count === 0) return;

    if (!window.confirm(`Таңдалған ${count} юзернеймді тізімнен өшіруге сенімдісіз бе?`)) {
      return;
    }

    setIsDeletingBatch(true);
    try {
      const listToDelete = Array.from(selectedUsernames);
      const res = await removeReservedUsernames(listToDelete);
      if (res.success) {
        setSelectedUsernames(new Set());
        showToast(`Таңдалған ${count} юзернейм сәтті өшірілді!`, 'success');
      } else {
        showToast(res.error || 'Таңдалғандарды өшіру сәтсіз аяқталды', 'error');
      }
    } catch {
      showToast('Өшіру кезінде қате орын алды', 'error');
    } finally {
      setIsDeletingBatch(false);
    }
  };

  // Delete ALL reserved usernames
  const handleDeleteAll = async () => {
    const totalCount = reservedUsernames.length;
    if (totalCount === 0) return;

    const confirmText = window.prompt(
      `НАЗАР АУДАРЫҢЫЗ! Барлық ${totalCount} юзернеймді базадан толық өшіру үшін «ӨШІРУ» сөзін жазыңыз:`
    );

    if (confirmText?.trim().toUpperCase() !== 'ӨШІРУ') {
      if (confirmText !== null) {
        showToast('Растау сөзі қате енгізілді. Операция тоқтатылды.', 'error');
      }
      return;
    }

    setIsDeletingAll(true);
    try {
      const res = await removeAllReservedUsernames();
      if (res.success) {
        setSelectedUsernames(new Set());
        showToast('Барлық бұғатталған юзернеймдер сәтті өшірілді!', 'success');
      } else {
        showToast(res.error || 'Барлығын өшіру сәтсіз аяқталды', 'error');
      }
    } catch {
      showToast('Барлығын өшіру кезінде қате орын алды', 'error');
    } finally {
      setIsDeletingAll(false);
    }
  };

  if (!isAuthInitialized || !user || !canManageUsernames) {
    return null;
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 70px)', background: '#F8FAFC', padding: '32px 20px 60px' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        {/* Breadcrumb & Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-mid)' }}>
            <Link to="/admin/home" style={{ color: 'var(--text-mid)', textDecoration: 'none', fontWeight: 600 }}>
              Жеке кабинет
            </Link>
            <span>/</span>
            <span style={{ color: 'var(--text-dark)', fontWeight: 700 }}>Юзернеймдер</span>
          </div>

          <button
            type="button"
            onClick={() => navigate('/admin/home')}
            style={{
              background: '#FFFFFF',
              border: '1.5px solid #E2E8F0',
              borderRadius: '50px',
              padding: '7px 18px',
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--text-mid)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              transition: 'all 0.15s ease',
            }}
          >
            ← Басты бетке
          </button>
        </div>

        {/* Page Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(0, 84, 148, 0.1)',
                color: 'var(--blue)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4"></circle>
                <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"></path>
              </svg>
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-dark)', margin: 0 }}>
              Юзернеймдерді басқару
            </h1>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--text-mid)', margin: 0, paddingLeft: '48px' }}>
            Жүйедегі бұғатталған және арнайы резервтелген юзернеймдер базасы
          </p>
        </div>

        {/* Main Card */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1.5px solid #E2E8F0',
            borderRadius: '20px',
            padding: '28px 24px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
          }}
        >
          {/* Info Banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '14px 18px',
              borderRadius: '12px',
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              marginBottom: '24px',
            }}
          >
            <div style={{ color: 'var(--blue)', marginTop: '2px', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
            </div>
            <div style={{ fontSize: '13.5px', color: '#1E40AF', lineHeight: 1.5 }}>
              <strong>Мақсаты:</strong> Осы тізімге жазылған юзернеймдерді оқырмандар тіркелу немесе профильді өзгерту кезінде ала алмайды. Жүйе оларға «Бұл юзернейм бос емес» деп көрсетеді. Бұл жүйелік және брендтік атауларды (мысалы: <code>admin</code>, <code>support</code>, <code>tanda</code>) қорғау үшін қажет.
            </div>
          </div>

          {/* Add Form Card */}
          <form
            onSubmit={handleAddSingle}
            style={{
              background: '#F8FAFC',
              border: '1.5px solid #E2E8F0',
              borderRadius: '16px',
              padding: '18px 20px',
              marginBottom: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
              <label style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text-dark)' }}>
                Жаңа юзернеймді бұғаттау тізіміне қосу
              </label>

              <button
                type="button"
                onClick={() => {
                  setBatchError('');
                  setBatchInput('');
                  setIsBatchModalOpen(true);
                }}
                style={{
                  background: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  borderRadius: '50px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--blue)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#DBEAFE';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#EFF6FF';
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6"></line>
                  <line x1="8" y1="12" x2="21" y2="12"></line>
                  <line x1="8" y1="18" x2="21" y2="18"></line>
                  <line x1="3" y1="6" x2="3.01" y2="6"></line>
                  <line x1="3" y1="12" x2="3.01" y2="12"></line>
                  <line x1="3" y1="18" x2="3.01" y2="18"></line>
                </svg>
                Топпен қосу
              </button>
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: 'var(--text-mid)',
                  }}
                >
                  @
                </span>
                <input
                  type="text"
                  value={newUsernameInput}
                  onChange={(e) => {
                    setNewUsernameInput(e.target.value);
                    if (newUsernameError) setNewUsernameError('');
                  }}
                  placeholder="жаңа_юзернейм (мысалы: official, support, help)"
                  className="form-input"
                  style={{
                    paddingLeft: '32px',
                    borderColor: newUsernameError ? '#DC2626' : undefined,
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={isAddingSingle}
                className="btn-primary"
                style={{
                  padding: '0 24px',
                  height: '42px',
                  borderRadius: '50px',
                  fontSize: '13px',
                  fontWeight: 700,
                  background: 'var(--blue)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexShrink: 0,
                  cursor: isAddingSingle ? 'not-allowed' : 'pointer',
                  opacity: isAddingSingle ? 0.7 : 1,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                {isAddingSingle ? 'Қосылуда...' : 'Қосу'}
              </button>
            </div>
            {newUsernameError && (
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#DC2626', marginTop: '6px' }}>
                {newUsernameError}
              </div>
            )}
          </form>

          {/* Search & Bulk Actions Toolbar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
              flexWrap: 'wrap',
              gap: '12px',
              paddingBottom: '16px',
              borderBottom: '1.5px solid #F1F5F9',
            }}
          >
            {/* Left: Select All Checkbox & Count */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {filteredList.length > 0 && (
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    color: 'var(--text-dark)',
                    userSelect: 'none',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isAllFilteredSelected}
                    onChange={toggleSelectAllFiltered}
                    style={{
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer',
                      accentColor: 'var(--blue)',
                    }}
                  />
                  <span>Барлығын таңдау</span>
                </label>
              )}

              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 800,
                  background: 'rgba(0, 84, 148, 0.1)',
                  color: 'var(--blue)',
                }}
              >
                {filteredList.length} / {reservedUsernames.length}
              </span>
            </div>

            {/* Right: Search Box */}
            <div style={{ position: 'relative', width: '260px', maxWidth: '100%' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Іздеу (@username)..."
                className="form-input"
                style={{
                  padding: '7px 14px',
                  fontSize: '13px',
                  borderRadius: '20px',
                }}
              />
            </div>
          </div>

          {/* Bulk Action Strip (Visible when items selected or list not empty) */}
          {(selectedUsernames.size > 0 || reservedUsernames.length > 0) && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                background: selectedUsernames.size > 0 ? '#FEF2F2' : '#F8FAFC',
                border: selectedUsernames.size > 0 ? '1.5px solid #FECACA' : '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '10px 16px',
                marginBottom: '16px',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {selectedUsernames.size > 0 ? (
                  <>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#DC2626' }}>
                      Таңдалды: {selectedUsernames.size}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedUsernames(new Set())}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#64748B',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        padding: 0,
                      }}
                    >
                      Таңдауды алып тастау
                    </button>
                  </>
                ) : (
                  <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 500 }}>
                    Бірнеше юзернеймді өшіру үшін төмендегі ұяшықтарды белгілеңіз
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {selectedUsernames.size > 0 && (
                  <button
                    type="button"
                    onClick={handleDeleteSelected}
                    disabled={isDeletingBatch}
                    style={{
                      background: '#DC2626',
                      border: 'none',
                      borderRadius: '50px',
                      padding: '6px 16px',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      color: '#FFFFFF',
                      cursor: isDeletingBatch ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 6px rgba(220, 38, 38, 0.25)',
                      opacity: isDeletingBatch ? 0.7 : 1,
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    {isDeletingBatch ? 'Өшірілуде...' : `Таңдалғандарды өшіру (${selectedUsernames.size})`}
                  </button>
                )}

                {reservedUsernames.length > 0 && selectedUsernames.size === 0 && (
                  <button
                    type="button"
                    onClick={handleDeleteAll}
                    disabled={isDeletingAll}
                    style={{
                      background: '#FFFFFF',
                      border: '1.5px solid #FCA5A5',
                      borderRadius: '50px',
                      padding: '5px 14px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#DC2626',
                      cursor: isDeletingAll ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      opacity: isDeletingAll ? 0.7 : 1,
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#FEE2E2';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#FFFFFF';
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    {isDeletingAll ? 'Тазалануда...' : 'Барлығын өшіру'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* List of Reserved Usernames */}
          {filteredList.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '48px 20px',
                background: '#F8FAFC',
                borderRadius: '16px',
                border: '1.5px dashed #CBD5E1',
                color: 'var(--text-mid)',
                fontSize: '13.5px',
              }}
            >
              {searchQuery ? 'Іздеу бойынша ешқандай юзернейм табылмады' : 'Резервтелген юзернеймдер тізімі бос'}
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '12px',
              }}
            >
              {filteredList.map((u) => {
                const isSelected = selectedUsernames.has(u);
                return (
                  <div
                    key={u}
                    onClick={() => toggleSelect(u)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: isSelected ? '#EFF6FF' : '#FFFFFF',
                      border: isSelected ? '1.5px solid var(--blue)' : '1px solid #E2E8F0',
                      borderRadius: '12px',
                      boxShadow: isSelected ? '0 2px 8px rgba(0, 84, 148, 0.12)' : '0 1px 3px rgba(0,0,0,0.02)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      userSelect: 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelect(u);
                        }}
                        style={{
                          width: '16px',
                          height: '16px',
                          cursor: 'pointer',
                          accentColor: 'var(--blue)',
                        }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                        <span style={{ color: 'var(--blue)', fontWeight: 800, fontSize: '13px' }}>@</span>
                        <span
                          style={{
                            fontSize: '13.5px',
                            fontWeight: 700,
                            color: isSelected ? 'var(--blue)' : 'var(--text-dark)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={`@${u}`}
                        >
                          {u}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(u);
                      }}
                      disabled={deletingUsername === u}
                      title="Өшіру"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#EF4444',
                        cursor: deletingUsername === u ? 'not-allowed' : 'pointer',
                        padding: '4px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: deletingUsername === u ? 0.4 : 0.8,
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '1';
                        e.currentTarget.style.background = '#FEE2E2';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = deletingUsername === u ? '0.4' : '0.8';
                        e.currentTarget.style.background = 'none';
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Batch Add Modal */}
      {isBatchModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={() => setIsBatchModalOpen(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '28px 24px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-dark)', margin: 0 }}>
                Юзернеймдерді топпен қосу
              </h3>
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-mid)',
                  padding: '4px',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-mid)', marginBottom: '16px', lineHeight: 1.5 }}>
              Әр юзернеймді жаңа жолдан немесе үтірмен бөліп жазыңыз. Бұрыннан бар юзернеймдер автоматты түрде өткізіліп, тек жаңалары қосылады.
            </p>

            <form onSubmit={handleAddBatch}>
              <textarea
                value={batchInput}
                onChange={(e) => {
                  setBatchInput(e.target.value);
                  if (batchError) setBatchError('');
                }}
                placeholder={"admin\nmoderator\nsupport\nofficial\nhelp"}
                rows={6}
                className="form-input"
                style={{
                  width: '100%',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  resize: 'vertical',
                  marginBottom: '10px',
                  borderColor: batchError ? '#DC2626' : undefined,
                }}
              />

              {batchError && (
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#DC2626', marginBottom: '12px' }}>
                  {batchError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  style={{
                    background: '#F1F5F9',
                    border: 'none',
                    borderRadius: '50px',
                    padding: '10px 20px',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'var(--text-mid)',
                    cursor: 'pointer',
                  }}
                >
                  Бас тарту
                </button>
                <button
                  type="submit"
                  disabled={isAddingBatch}
                  className="btn-primary"
                  style={{
                    borderRadius: '50px',
                    padding: '10px 24px',
                    fontSize: '13px',
                    fontWeight: 700,
                    background: 'var(--blue)',
                    cursor: isAddingBatch ? 'not-allowed' : 'pointer',
                    opacity: isAddingBatch ? 0.7 : 1,
                  }}
                >
                  {isAddingBatch ? 'Қосылуда...' : 'Барлығын қосу'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
