import React, { useState, useMemo, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { usePromoStore, PromoCode, PromoBatch } from '../../store/usePromoStore';
import { useToastStore } from '../../store/useToastStore';

export const AdminPromoBatchDetailPage: React.FC = () => {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const {
    batches,
    promocodes,
    deletePromoCode,
    togglePromoCodeStatus,
    togglePromoIssued,
    updatePromoNote,
    deleteBatch,
    toggleBatchStatus,
    fetchBatches,
    fetchPromoCodes,
  } = usePromoStore();
  const { showToast } = useToastStore();

  useEffect(() => {
    fetchBatches();
    fetchPromoCodes();
  }, [fetchBatches, fetchPromoCodes]);

  const [codeSearchQuery, setCodeSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'activated' | 'issued'>('all');
  const [batchToDelete, setBatchToDelete] = useState<PromoBatch | null>(null);
  const [codeToDelete, setCodeToDelete] = useState<PromoCode | null>(null);

  // Find the current batch
  const currentBatch = useMemo(() => {
    if (!batchId) return null;
    const found = batches.find((b) => b.id === batchId);
    if (found) return found;

    // Fallback if not found in batches list
    const codesForThis = promocodes.filter((p) => p.batchId === batchId);
    if (codesForThis.length > 0) {
      const first = codesForThis[0];
      return {
        id: batchId,
        name: first.batchName || 'Топтама файлы',
        rewardType: first.rewardType,
        rewardTitle: first.rewardTitle,
        durationDays: first.durationDays,
        expiresAt: first.expiresAt,
        prefix: first.code.split('-')[0] || 'TANDA',
        totalCodes: codesForThis.length,
        createdAt: first.createdAt,
      } as PromoBatch;
    }

    return null;
  }, [batches, promocodes, batchId]);

  // Codes belonging to this batch with search and tab filter
  const batchCodes = useMemo(() => {
    if (!batchId) return [];
    let list = promocodes.filter((p) => p.batchId === batchId);

    // Apply tab filter
    if (activeFilter === 'activated') {
      list = list.filter((p) => p.usedCount > 0);
    } else if (activeFilter === 'issued') {
      list = list.filter((p) => p.isIssued);
    }

    if (!codeSearchQuery.trim()) return list;
    const q = codeSearchQuery.toLowerCase().trim();
    return list.filter((p) => {
      const code = p.code.toLowerCase();
      const note = (p.note || '').toLowerCase();
      const usedUsers = p.usedBy.map((u) => `${u.userName} ${u.userEmail}`).join(' ').toLowerCase();
      return code.includes(q) || note.includes(q) || usedUsers.includes(q);
    });
  }, [promocodes, batchId, codeSearchQuery, activeFilter]);

  const copyToClipboard = (text: string, label = 'Промокод') => {
    try {
      navigator.clipboard.writeText(text);
      showToast(`${label} буферге көшірілді: ${text}`, 'success');
    } catch {
      showToast('Көшіру мүмкін болмады', 'error');
    }
  };

  const copyAllBatchCodes = () => {
    if (!currentBatch) return;
    const codes = promocodes.filter((p) => p.batchId === currentBatch.id);
    if (codes.length === 0) {
      showToast('Бұл топтамада промокодтар жоқ', 'info');
      return;
    }
    const text = codes.map((p) => p.code).join('\n');
    copyToClipboard(text, `${codes.length} промокод`);
  };

  const confirmDeleteBatch = () => {
    if (batchToDelete) {
      deleteBatch(batchToDelete.id);
      showToast(`«${batchToDelete.name}» файлы және оның барлық промокодтары өшірілді`, 'info');
      setBatchToDelete(null);
      navigate('/admin/promocodes');
    }
  };

  const confirmDeleteCode = () => {
    if (codeToDelete) {
      deletePromoCode(codeToDelete.id);
      showToast(`«${codeToDelete.code}» промокоды өшірілді`, 'info');
      setCodeToDelete(null);
    }
  };

  if (!currentBatch) {
    return (
      <section className="admin-page-section" style={{ padding: '40px 16px', backgroundColor: '#F8FAFC', minHeight: 'calc(100vh - 80px)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', background: '#FFFFFF', padding: '48px 24px', borderRadius: '16px', border: '1.5px solid #E2E8F0' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '8px' }}>
            Промокод топтамасы (файлы) табылмады
          </h2>
          <p style={{ color: 'var(--text-mid)', fontSize: '14px', marginBottom: '24px' }}>
            Мүмкін бұл топтама өшірілген немесе сілтеме қате көрсетілген.
          </p>
          <Link
            to="/admin/promocodes"
            className="btn-primary"
            style={{
              padding: '10px 24px',
              borderRadius: '10px',
              fontWeight: 700,
              display: 'inline-block',
              textDecoration: 'none',
            }}
          >
            ← Барлық топтамалар тізіміне оралу
          </Link>
        </div>
      </section>
    );
  }

  const rawBatchCodes = promocodes.filter((p) => p.batchId === currentBatch.id);
  const isExpired = new Date(currentBatch.expiresAt) < new Date();
  const anyActive = rawBatchCodes.some((p) => p.isActive);
  const activeCount = rawBatchCodes.filter((p) => p.isActive && !isExpired && p.usedCount < p.maxUses).length;
  const usedCount = rawBatchCodes.filter((p) => p.usedCount > 0).length;
  const issuedCount = rawBatchCodes.filter((p) => p.isIssued).length;
  const now = new Date();
  const expiresDate = new Date(currentBatch.expiresAt);
  const diffTime = expiresDate.getTime() - now.getTime();
  const remainingDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  return (
    <section className="admin-page-section" style={{ padding: '32px 16px 80px', backgroundColor: '#F8FAFC', minHeight: 'calc(100vh - 80px)' }}>
      <div style={{ maxWidth: '1360px', margin: '0 auto' }}>

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
            <Link to="/admin/promocodes" style={{ color: 'var(--blue)', fontWeight: 600, textDecoration: 'none' }}>
              Промокодтар топтамалары
            </Link>
            <span>/</span>
            <span style={{ color: 'var(--text-dark)', fontWeight: 700 }}>
              {currentBatch.name}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Link
              to="/admin/promocodes"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--text-dark)',
                padding: '8px 16px',
                borderRadius: '8px',
                background: '#FFFFFF',
                border: '1.5px solid #CBD5E1',
                textDecoration: 'none',
                transition: 'all 0.15s',
              }}
            >
              ← Топтамалар тізіміне оралу
            </Link>

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
              Басқару панелі
            </Link>
          </div>
        </div>

        {/* Main Batch Detail Card */}
        <div className="admin-card" style={{ padding: '32px 30px' }}>
          
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '22px',
              borderBottom: '1.5px solid #F1F5F9',
              marginBottom: '24px',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'rgba(0, 84, 148, 0.1)',
                  color: 'var(--blue)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path>
                </svg>
              </div>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-dark)', margin: 0 }}>
                  {currentBatch.name}
                </h1>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={copyAllBatchCodes}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  background: '#EFF6FF',
                  color: 'var(--blue)',
                  border: '1.5px solid #BFDBFE',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                Барлық кодтарды көшіру
              </button>

              <button
                type="button"
                onClick={() => {
                  toggleBatchStatus(currentBatch.id, !anyActive);
                  showToast(
                    anyActive
                      ? 'Топтамадағы барлық промокодтар жарамсыз етілді'
                      : 'Топтамадағы барлық промокодтар қайта белсендірілді',
                    'info'
                  );
                }}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  background: anyActive ? '#FFFBEB' : '#ECFDF5',
                  color: anyActive ? '#D97706' : '#059669',
                  border: anyActive ? '1.5px solid #FDE68A' : '1.5px solid #A7F3D0',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                </svg>
                {anyActive ? 'Барлығын жарамсыз ету' : 'Барлығын белсендіру'}
              </button>

              <button
                type="button"
                onClick={() => setBatchToDelete(currentBatch)}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  background: '#FEF2F2',
                  color: '#DC2626',
                  border: '1.5px solid #FECACA',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                Файлды өшіру
              </button>
            </div>
          </div>

          {/* Info Summary Grid */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '20px 24px',
              padding: '20px 24px',
              background: '#F8FAFC',
              borderRadius: '16px',
              border: '1.5px solid #E2E8F0',
              marginBottom: '28px',
            }}
          >
            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', display: 'block', textTransform: 'uppercase', marginBottom: '4px' }}>
                Жеңілдік:
              </span>
              <strong style={{ fontSize: '15px', color: 'var(--text-dark)', whiteSpace: 'nowrap' }}>
                {currentBatch.rewardTitle}
              </strong>
            </div>

            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', display: 'block', textTransform: 'uppercase', marginBottom: '4px' }}>
                Жасалған күні:
              </span>
              <strong style={{ fontSize: '15px', color: 'var(--text-dark)', whiteSpace: 'nowrap' }}>
                {new Date(currentBatch.createdAt).toLocaleDateString('kk-KZ')}
              </strong>
            </div>

            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', display: 'block', textTransform: 'uppercase', marginBottom: '4px' }}>
                Жарамдылық мерзімі:
              </span>
              <strong style={{ fontSize: '15px', color: isExpired ? '#DC2626' : 'var(--text-dark)', whiteSpace: 'nowrap' }}>
                {new Date(currentBatch.expiresAt).toLocaleDateString('kk-KZ')}{' '}
                {isExpired ? (
                  <span style={{ color: '#DC2626' }}>(Мерзімі өткен)</span>
                ) : (
                  <span>({remainingDays} күн қалды)</span>
                )}
              </strong>
            </div>

            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', display: 'block', textTransform: 'uppercase', marginBottom: '4px' }}>
                Берілгендер белгісі:
              </span>
              <strong style={{ fontSize: '15px', color: 'var(--text-dark)', whiteSpace: 'nowrap' }}>
                {issuedCount} / {rawBatchCodes.length} адамға берілді
              </strong>
            </div>

            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', display: 'block', textTransform: 'uppercase', marginBottom: '4px' }}>
                Активация:
              </span>
              <strong style={{ fontSize: '15px', color: 'var(--text-dark)', whiteSpace: 'nowrap' }}>
                {usedCount} / {rawBatchCodes.length} қолданылды
              </strong>
            </div>
          </div>

          {/* Search bar & Filter Tabs */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '14px',
            }}
          >
            {/* Filter Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                style={{
                  padding: '7px 14px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: activeFilter === 'all' ? 'var(--blue)' : '#FFFFFF',
                  color: activeFilter === 'all' ? '#FFFFFF' : '#64748B',
                  border: activeFilter === 'all' ? '1px solid var(--blue)' : '1px solid #CBD5E1',
                  transition: 'all 0.15s',
                }}
              >
                Барлығы: {rawBatchCodes.length}
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('activated')}
                style={{
                  padding: '7px 14px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: activeFilter === 'activated' ? '#16A34A' : '#FFFFFF',
                  color: activeFilter === 'activated' ? '#FFFFFF' : '#15803D',
                  border: activeFilter === 'activated' ? '1px solid #16A34A' : '1px solid #86EFAC',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.15s',
                }}
              >
                Активация болған: {usedCount}
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('issued')}
                style={{
                  padding: '7px 14px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: activeFilter === 'issued' ? '#0284C7' : '#FFFFFF',
                  color: activeFilter === 'issued' ? '#FFFFFF' : '#0369A1',
                  border: activeFilter === 'issued' ? '1px solid #0284C7' : '1px solid #BAE6FD',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.15s',
                }}
              >
                Берілгендер: {issuedCount}
              </button>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
              <input
                type="text"
                value={codeSearchQuery}
                onChange={(e) => setCodeSearchQuery(e.target.value)}
                placeholder="Іздеу..."
                style={{
                  width: '100%',
                  padding: '9px 14px 9px 34px',
                  borderRadius: '8px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '13px',
                  outline: 'none',
                  background: '#FFFFFF',
                  color: 'var(--text-dark)',
                  boxSizing: 'border-box',
                }}
              />
              <svg
                style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#64748B', pointerEvents: 'none' }}
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

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: '36px', textAlign: 'center', padding: '10px 6px' }}>№</th>
                  <th style={{ width: '50px', textAlign: 'center', whiteSpace: 'nowrap', padding: '10px 6px' }}>Берілді</th>
                  <th style={{ width: '160px', whiteSpace: 'nowrap', padding: '10px 8px' }}>Промокод</th>
                  <th style={{ width: '130px', whiteSpace: 'nowrap', padding: '10px 8px' }}>Активация</th>
                  <th style={{ width: '150px', padding: '10px 8px' }}>Заметка (Кімге берілді)</th>
                  <th style={{ width: '140px', padding: '10px 8px' }}>Жеңілдік</th>
                  <th style={{ width: '90px', whiteSpace: 'nowrap', padding: '10px 8px' }}>Мәртебесі</th>
                  <th style={{ width: '160px', padding: '10px 8px' }}>Қолданған оқырман</th>
                  <th style={{ textAlign: 'right', whiteSpace: 'nowrap', padding: '10px 12px' }}>Әрекеттер</th>
                </tr>
              </thead>
              <tbody>
                {batchCodes.map((promo, index) => {
                  const isCodeExpired = new Date(promo.expiresAt) < new Date();
                  const isActivated = promo.usedCount > 0;
                  const expiryDateStr = new Date(promo.expiresAt).toLocaleDateString('kk-KZ');

                  return (
                    <tr
                      key={promo.id}
                      style={{
                        backgroundColor: isActivated ? '#F0FDF4' : promo.isIssued ? '#F8FAFC' : undefined,
                        borderLeft: isActivated ? '4px solid #16A34A' : promo.isIssued ? '4px solid #0284C7' : undefined,
                        transition: 'background-color 0.2s',
                      }}
                    >
                      {/* Index */}
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#64748B', fontSize: '12px' }}>
                        {index + 1}
                      </td>

                      {/* Checkbox (Берілді галочкасы) */}
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <input
                          type="checkbox"
                          checked={promo.isIssued || false}
                          onChange={(e) => {
                            togglePromoIssued(promo.id, e.target.checked);
                            if (e.target.checked) {
                              showToast(`«${promo.code}» промокоды берілді деп белгіленді`, 'success');
                            }
                          }}
                          title={promo.isIssued ? 'Берілді деп белгіленген' : 'Берілді деп белгілеу үшін басыңыз'}
                          style={{
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer',
                            accentColor: '#0284C7',
                            verticalAlign: 'middle',
                          }}
                        />
                      </td>

                      {/* Code badge */}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(promo.code)}
                          title="Көшіру үшін басыңыз"
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 800,
                            fontSize: '13px',
                            background: isActivated ? '#FFFFFF' : 'rgba(0, 84, 148, 0.08)',
                            color: 'var(--blue)',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            border: isActivated ? '1.5px solid #86EFAC' : '1px solid rgba(0, 84, 148, 0.2)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          {promo.code}
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                          </svg>
                        </button>
                      </td>

                      {/* ACTIVATION INDICATOR / BADGE */}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {isActivated ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '4px 10px',
                                borderRadius: '20px',
                                background: '#DCFCE7',
                                color: '#15803D',
                                border: '1px solid #86EFAC',
                                fontSize: '12px',
                                fontWeight: 800,
                                width: 'fit-content',
                              }}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                              Қолданылды
                            </span>
                            {promo.usedBy[0]?.usedAt && (
                              <span style={{ fontSize: '11px', color: '#166534', fontWeight: 600, paddingLeft: '4px' }}>
                                {new Date(promo.usedBy[0].usedAt).toLocaleString('kk-KZ')}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              background: '#F1F5F9',
                              color: '#64748B',
                              border: '1px solid #CBD5E1',
                              fontSize: '12px',
                              fontWeight: 700,
                              width: 'fit-content',
                            }}
                          >
                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#94A3B8' }} />
                            Қолданылмаған
                          </span>
                        )}
                      </td>

                      {/* Note (Заметка) Input */}
                      <td>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="text"
                            defaultValue={promo.note || ''}
                            onBlur={(e) => {
                              const newNote = e.target.value.trim();
                              if (newNote !== (promo.note || '')) {
                                updatePromoNote(promo.id, newNote);
                                showToast(`«${promo.code}» жазбасы сақталды`, 'info');
                              }
                            }}
                            placeholder="Кімге?"
                            style={{
                              width: '100%',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              border: promo.note ? '1.5px solid #93C5FD' : '1px solid #CBD5E1',
                              fontSize: '12px',
                              fontWeight: 600,
                              background: '#FFFFFF',
                              color: 'var(--text-dark)',
                              outline: 'none',
                              boxSizing: 'border-box',
                            }}
                          />
                        </div>
                      </td>

                      {/* Reward */}
                      <td>
                        <strong style={{ color: 'var(--text-dark)', fontSize: '13px' }}>
                          {promo.rewardTitle}
                        </strong>
                      </td>

                      {/* Status */}
                      <td>
                        {isActivated ? (
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: '#DCFCE7', color: '#15803D' }}>
                            Пайдаланылды
                          </span>
                        ) : isCodeExpired ? (
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: '#FEF2F2', color: '#DC2626' }}>
                            Мерзімі өткен
                          </span>
                        ) : promo.isActive ? (
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: '#D1FAE5', color: '#047857' }}>
                            Белсенді
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: '#FEE2E2', color: '#B91C1C' }}>
                            Жарамсыз
                          </span>
                        )}
                      </td>

                      {/* Users who redeemed */}
                      <td>
                        {promo.usedBy.length > 0 ? (
                          <div style={{ fontSize: '13px', color: 'var(--text-dark)' }}>
                            {promo.usedBy.map((u, i) => (
                              <div key={i} style={{ marginBottom: '2px', fontWeight: 600 }}>
                                {u.userEmail || u.userName}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: '#94A3B8', fontSize: '14px', fontWeight: 700 }}>
                            —
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', justifyContent: 'flex-end' }}>
                          {/* Toggle validity */}
                          <button
                            type="button"
                            onClick={() => {
                              togglePromoCodeStatus(promo.id);
                              showToast(
                                promo.isActive
                                  ? `«${promo.code}» промокоды жарамсыз етілді`
                                  : `«${promo.code}» промокоды қайта белсендірілді`,
                                'info'
                              );
                            }}
                            title={promo.isActive ? 'Жарамсыз ету (өшіру)' : 'Қайта белсендіру'}
                            style={{
                              padding: '4px 6px',
                              fontSize: '13px',
                              fontWeight: 700,
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-dark)',
                              cursor: 'pointer',
                            }}
                          >
                            {promo.isActive ? 'Жарамсыз ету' : 'Белсендіру'}
                          </button>

                          {/* Delete code permanently */}
                          <button
                            type="button"
                            onClick={() => setCodeToDelete(promo)}
                            title="Өшіру"
                            style={{
                              padding: '4px 6px',
                              fontSize: '13px',
                              fontWeight: 700,
                              background: 'transparent',
                              border: 'none',
                              color: '#DC2626',
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

          {batchCodes.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-mid)' }}>
              Бұл топтамада промокодтар жоқ немесе іздеу нәтижесі бойынша табылмады.
            </div>
          )}

        </div>

      </div>

      {/* Delete Batch Confirmation Modal */}
      {batchToDelete && (
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
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '12px' }}>
              Топтаманы (Файлды) өшіру
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-mid)', lineHeight: 1.6, marginBottom: '24px' }}>
              Сіз шынымен <strong style={{ color: 'var(--text-dark)' }}>{batchToDelete.name}</strong> файлын және оның ішіндегі барлық промокодтарды біржола өшіргіңіз келе ме?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setBatchToDelete(null)}
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
                onClick={confirmDeleteBatch}
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
                Иә, файлды өшіру
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Single Code Confirmation Modal */}
      {codeToDelete && (
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
              Промокодты өшіру
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-mid)', lineHeight: 1.6, marginBottom: '24px' }}>
              Сіз шынымен <strong style={{ color: 'var(--text-dark)' }}>{codeToDelete.code}</strong> промокодын өшіргіңіз келе ме?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setCodeToDelete(null)}
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
                onClick={confirmDeleteCode}
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

    </section>
  );
};
