import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePromoStore, PromoCode, PromoBatch } from '../../store/usePromoStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import { hasAdminPermission } from '../../utils/permissions';

export const AdminPromoCodesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, role } = useAuthStore();
  const {
    batches,
    promocodes,
    generatePromoCodes,
    deleteBatch,
    toggleBatchStatus,
  } = usePromoStore();
  const { showToast } = useToastStore();

  const canManagePromos = hasAdminPermission(user, 'promocodes_manage');

  useEffect(() => {
    if (role !== 'admin' || !canManagePromos) {
      showToast('Промокодтар бөліміне кіруге рұқсатыңыз жоқ', 'error');
      navigate('/admin', { replace: true });
    }
  }, [role, canManagePromos, navigate, showToast]);

  // Generator form state
  const [count, setCount] = useState<number>(10);
  const [rewardTitle, setRewardTitle] = useState<string>('1 айлық жазылым');
  const [durationDays, setDurationDays] = useState<number>(10);
  const [customWord, setCustomWord] = useState<string>('');
  const [customBatchName, setCustomBatchName] = useState<string>('');
  const [maxUses] = useState<number>(1);

  // Search queries
  const [batchSearchQuery, setBatchSearchQuery] = useState<string>('');

  // Modals state
  const [lastGeneratedInfo, setLastGeneratedInfo] = useState<{ batch: PromoBatch; codes: PromoCode[] } | null>(null);
  const [batchToDelete, setBatchToDelete] = useState<PromoBatch | null>(null);

  // Ensure every promo code belongs to a batch
  const allBatches = useMemo(() => {
    const list = batches || [];
    const codesWithoutBatch = promocodes.filter(
      (c) => !list.some((b) => b.id === c.batchId)
    );
    if (codesWithoutBatch.length > 0) {
      const fallbackBatch: PromoBatch = {
        id: 'batch-general',
        name: 'Негізгі топтама',
        rewardType: 'subscription_1m',
        rewardTitle: '1 айлық тегін жазылым',
        durationDays: 30,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        prefix: 'TANDA',
        totalCodes: codesWithoutBatch.length,
        createdAt: new Date().toISOString(),
      };
      return [...list, fallbackBatch];
    }
    return list;
  }, [batches, promocodes]);

  // Filtered batches for list view
  const filteredBatches = useMemo(() => {
    if (!batchSearchQuery.trim()) return allBatches;
    const q = batchSearchQuery.toLowerCase().trim();
    return allBatches.filter((b) => {
      const name = b.name.toLowerCase();
      const reward = b.rewardTitle.toLowerCase();
      return name.includes(q) || reward.includes(q);
    });
  }, [allBatches, batchSearchQuery]);

  // Overall stats
  const totalCodesCount = promocodes.length;
  const activeCodesCount = promocodes.filter((p) => {
    const isExpired = new Date(p.expiresAt) < new Date();
    return p.isActive && !isExpired && p.usedCount < p.maxUses;
  }).length;
  const totalUsedCount = promocodes.reduce((acc, p) => acc + p.usedCount, 0);

  const cleanCustomWord = customWord.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const sampleCodePreview = cleanCustomWord
    ? `${cleanCustomWord}-HXAV66-TANDA`
    : `TANDA-HXAV66`;

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveReward = rewardTitle;

    const effectiveCount = Math.max(1, count || 1);
    const result = generatePromoCodes({
      batchName: customBatchName.trim() || undefined,
      count: effectiveCount,
      rewardTitle: effectiveReward,
      durationDays,
      customWord: cleanCustomWord || undefined,
      maxUses,
    });

    setLastGeneratedInfo(result);
    setCustomBatchName('');
    showToast(`Сәтті! «${result.batch.name}» файлы жасалып, ${result.codes.length} промокод генерацияланды.`, 'success');
  };

  const copyToClipboard = (text: string, label = 'Промокод') => {
    try {
      navigator.clipboard.writeText(text);
      showToast(`${label} буферге көшірілді: ${text}`, 'success');
    } catch {
      showToast('Көшіру мүмкін болмады', 'error');
    }
  };

  const copyBatchCodes = (batchId: string) => {
    const codes = promocodes.filter((p) => p.batchId === batchId);
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
              Промокодтарды басқару
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

        {/* Stats Summary Widget */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '20px 24px', border: '1.5px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#64748B', marginBottom: '6px' }}>Барлық топтамалар (Файлдар)</div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-dark)' }}>{allBatches.length} файл</div>
          </div>

          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '20px 24px', border: '1.5px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#64748B', marginBottom: '6px' }}>Барлық промокодтар саны</div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-dark)' }}>{totalCodesCount}</div>
          </div>

          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '20px 24px', border: '1.5px solid #A7F3D0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#047857', marginBottom: '6px' }}>Белсенді промокодтар</div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: '#059669' }}>{activeCodesCount}</div>
          </div>

          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '20px 24px', border: '1.5px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--orange)', marginBottom: '6px' }}>Қолданылған саны</div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--orange)' }}>{totalUsedCount}</div>
          </div>
        </div>

        {/* Generator Form Card */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            padding: '32px 30px',
            border: '1.5px solid #E2E8F0',
            boxShadow: '0 10px 30px rgba(0, 45, 80, 0.05)',
            marginBottom: '32px',
          }}
        >
          <div style={{ borderBottom: '1.5px solid #F1F5F9', paddingBottom: '18px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '22px', backgroundColor: 'var(--blue)', borderRadius: '4px', display: 'inline-block' }} />
              <h2 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-dark)', margin: 0 }}>
                Жаңа топтама генерациялау
              </h2>
            </div>
          </div>

          <form onSubmit={handleGenerate}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '16px',
              }}
            >
              {/* Count Input */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '13px' }}>
                  Промокод саны <span className="req">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={count || ''}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setCount(isNaN(val) ? 0 : Math.max(1, Math.min(val, 1000)));
                  }}
                  placeholder="Мысалы: 10"
                  className="form-input"
                  style={{ fontWeight: 700, fontSize: '14px' }}
                  required
                />
              </div>

              {/* Reward Type */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '13px' }}>
                  Жеңілдік түрі <span className="req">*</span>
                </label>
                <select
                  value={rewardTitle}
                  onChange={(e) => setRewardTitle(e.target.value)}
                  className="form-select"
                  style={{ fontWeight: 700 }}
                >
                  <option value="10% жеңілдік (Скидка)">10% жеңілдік (Скидка)</option>
                  <option value="20% жеңілдік (Скидка)">20% жеңілдік (Скидка)</option>
                  <option value="30% жеңілдік (Скидка)">30% жеңілдік (Скидка)</option>
                  <option value="40% жеңілдік (Скидка)">40% жеңілдік (Скидка)</option>
                  <option value="50% жеңілдік (Скидка)">50% жеңілдік (Скидка)</option>
                  <option value="1 айлық жазылым">1 айлық жазылым</option>
                  <option value="3 айлық жазылым">3 айлық жазылым</option>
                  <option value="6 айлық жазылым">6 айлық жазылым</option>
                  <option value="12 айлық жазылым">12 айлық жазылым</option>
                  <option value="Мәңгі қолжетімділік (Мәңгі доступ)">Мәңгі қолжетімділік (Мәңгі доступ)</option>
                </select>
              </div>

              {/* Expiration Days */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '13px' }}>
                  Жарамдылық мерзімі <span className="req">*</span>
                </label>
                <select
                  value={durationDays}
                  onChange={(e) => setDurationDays(parseInt(e.target.value, 10))}
                  className="form-select"
                  style={{ fontWeight: 700 }}
                >
                  <option value={7}>7 күн</option>
                  <option value={10}>10 күн (Ұсынылады)</option>
                  <option value={14}>14 күн (2 апта)</option>
                  <option value={30}>30 күн (1 ай)</option>
                  <option value={90}>90 күн (3 ай)</option>
                  <option value={365}>365 күн (1 жыл)</option>
                </select>
              </div>

              {/* Custom Word / Prefix */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '13px', color: 'var(--blue)' }}>
                  Арнайы сөз
                </label>
                <input
                  type="text"
                  value={customWord}
                  onChange={(e) => setCustomWord(e.target.value.toUpperCase())}
                  placeholder="Мысалы: TAUELSIZDIK"
                  className="form-input"
                  style={{ fontFamily: 'monospace', fontWeight: 800, textTransform: 'uppercase' }}
                />
              </div>

              {/* Custom Batch Name */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '13px' }}>
                  Топтама атауы
                </label>
                <input
                  type="text"
                  value={customBatchName}
                  onChange={(e) => setCustomBatchName(e.target.value)}
                  placeholder="Автоматты түрде қойылады"
                  className="form-input"
                  style={{ fontWeight: 600 }}
                />
              </div>
            </div>

            {/* Live Promo Format Preview Badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 16px',
                background: '#F0F9FF',
                borderRadius: '10px',
                border: '1px solid #BAE6FD',
                marginBottom: '18px',
                flexWrap: 'wrap',
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#0369A1' }}>
                Промокод үлгісі:
              </span>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  fontWeight: 800,
                  color: 'var(--blue)',
                  background: '#FFFFFF',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  border: '1px solid #7DD3FC',
                }}
              >
                {sampleCodePreview}
              </span>
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                {cleanCustomWord ? (
                  <span>(Басы: <strong>{cleanCustomWord}</strong> &bull; Ортасы: <strong>Генерация</strong> &bull; Соңы: <strong>TANDA</strong>)</span>
                ) : (
                  <span>(Қарапайым стандартты промокод)</span>
                )}
              </span>
            </div>



            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '1px solid #F1F5F9', flexWrap: 'wrap' }}>
              <button
                type="submit"
                className="btn-primary"
                style={{
                  padding: '12px 28px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 800,
                  background: 'var(--blue)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(0, 84, 148, 0.25)',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                  <line x1="7" y1="7" x2="7.01" y2="7"></line>
                </svg>
                {count} промокодты генерациялау
              </button>
            </div>
          </form>

          {/* Last Generated Preview Alert */}
          {lastGeneratedInfo && (
            <div
              style={{
                marginTop: '24px',
                padding: '20px',
                borderRadius: '14px',
                background: '#F0FDF4',
                border: '1.5px solid #BBF7D0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <div>
                    <strong style={{ color: '#166534', fontSize: '14px', display: 'block' }}>
                      Сәтті жасалды: «{lastGeneratedInfo.batch.name}» ({lastGeneratedInfo.codes.length} промокод)
                    </strong>
                    <span style={{ fontSize: '12px', color: '#15803D' }}>
                      Сыйлық: {lastGeneratedInfo.batch.rewardTitle} &bull; Жарамдылығы: {lastGeneratedInfo.batch.durationDays} күн
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const text = lastGeneratedInfo.codes.map((p) => p.code).join('\n');
                      copyToClipboard(text, `${lastGeneratedInfo.codes.length} промокод`);
                    }}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '8px',
                      background: '#16A34A',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    Барлығын көшіру
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(`/admin/promocodes/${lastGeneratedInfo.batch.id}`)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '8px',
                      background: '#FFFFFF',
                      color: '#166534',
                      border: '1.5px solid #86EFAC',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    Жаңа беттен ашу
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {lastGeneratedInfo.codes.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => copyToClipboard(p.code)}
                    title="Көшіру үшін басыңыз"
                    style={{
                      fontFamily: 'monospace',
                      fontWeight: 800,
                      fontSize: '13px',
                      background: '#FFFFFF',
                      border: '1.5px solid #86EFAC',
                      color: '#15803D',
                      padding: '5px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <span>{p.code}</span>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ALL BATCHES (FILES) LIST VIEW */}
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
                Барлық топтамалар тізімі
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-mid)', marginTop: '4px' }}>
                Генерацияланған файлдар / топтамалар саны: <span style={{ fontWeight: 700, color: 'var(--blue)' }}>{allBatches.length}</span>
              </p>
            </div>

            {/* Search */}
            <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
              <input
                type="text"
                value={batchSearchQuery}
                onChange={(e) => setBatchSearchQuery(e.target.value)}
                placeholder="Іздеу..."
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
          </div>

          {/* Batches Table List */}
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>№</th>
                  <th>Топтама атауы</th>
                  <th>Жеңілдік</th>
                  <th style={{ width: '130px', whiteSpace: 'nowrap' }}>Жасалған күні</th>
                  <th style={{ width: '130px', whiteSpace: 'nowrap' }}>Жарамдылығы</th>
                  <th style={{ width: '150px', whiteSpace: 'nowrap', textAlign: 'center' }}>Кодтар саны</th>
                  <th style={{ width: '110px', whiteSpace: 'nowrap' }}>Мәртебесі</th>
                  <th style={{ width: '240px', textAlign: 'right', whiteSpace: 'nowrap' }}>Әрекеттер</th>
                </tr>
              </thead>
              <tbody>
                {filteredBatches.map((batch, index) => {
                  const batchCodes = promocodes.filter((p) => p.batchId === batch.id);
                  const isExpired = new Date(batch.expiresAt) < new Date();
                  const activeInBatch = batchCodes.filter((p) => p.isActive && !isExpired && p.usedCount < p.maxUses).length;
                  const usedInBatch = batchCodes.filter((p) => p.usedCount > 0).length;
                  const anyActive = batchCodes.some((p) => p.isActive);

                  return (
                    <tr
                      key={batch.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/admin/promocodes/${batch.id}`)}
                    >
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#64748B', fontSize: '12px' }}>
                        {index + 1}
                      </td>

                      {/* Batch Name with Folder Icon */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '8px',
                              background: 'rgba(0, 84, 148, 0.08)',
                              color: 'var(--blue)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                              <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path>
                            </svg>
                          </div>
                          <div>
                            <strong style={{ color: 'var(--text-dark)', fontSize: '14px', display: 'block' }}>
                              {batch.name}
                            </strong>
                            <span style={{ fontSize: '12px', color: 'var(--blue)', fontWeight: 600 }}>
                              Жаңа беттен ашу →
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Reward */}
                      <td>
                        <strong style={{ color: 'var(--text-dark)', fontSize: '13px' }}>
                          {batch.rewardTitle}
                        </strong>
                      </td>

                      {/* Created Date */}
                      <td style={{ whiteSpace: 'nowrap', fontSize: '12px', color: '#475569', fontWeight: 600 }}>
                        {new Date(batch.createdAt).toLocaleDateString('kk-KZ')}
                      </td>

                      {/* Expiry Date */}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: isExpired ? '#DC2626' : '#475569' }}>
                          {new Date(batch.expiresAt).toLocaleDateString('kk-KZ')}
                          {isExpired && <span style={{ display: 'block', fontSize: '10px', color: '#DC2626', fontWeight: 700 }}>Мерзімі өткен</span>}
                        </div>
                      </td>

                      {/* Total codes count & Activation indicator */}
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontSize: '12px',
                              fontWeight: 800,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: '#F1F5F9',
                              color: 'var(--text-dark)',
                            }}
                          >
                            {batchCodes.length} промокод
                          </span>
                          {usedInBatch > 0 ? (
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 800,
                                color: '#15803D',
                                background: '#DCFCE7',
                                border: '1px solid #86EFAC',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                              }}
                            >
                              {usedInBatch} қолданылды
                            </span>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>
                              Әлі қолданылмаған
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        {isExpired ? (
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: '#FEF2F2', color: '#DC2626' }}>
                            Мерзімі өткен
                          </span>
                        ) : anyActive ? (
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: '#D1FAE5', color: '#047857' }}>
                            Белсенді ({activeInBatch})
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: '#FEE2E2', color: '#B91C1C' }}>
                            Жарамсыз
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', justifyContent: 'flex-end' }}>
                          {/* Open batch on new page */}
                          <Link
                            to={`/admin/promocodes/${batch.id}`}
                            title="Жаңа беттен ашу"
                            style={{
                              padding: '4px 6px',
                              fontSize: '13px',
                              fontWeight: 700,
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-dark)',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            Ашу
                          </Link>

                          {/* Copy all codes in batch */}
                          <button
                            type="button"
                            onClick={() => copyBatchCodes(batch.id)}
                            title="Барлық промокодтарды көшіру"
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
                            Көшіру
                          </button>

                          {/* Toggle invalid */}
                          <button
                            type="button"
                            onClick={() => {
                              toggleBatchStatus(batch.id, !anyActive);
                              showToast(
                                anyActive
                                  ? `«${batch.name}» топтамасы жарамсыз етілді`
                                  : `«${batch.name}» топтамасы қайта белсендірілді`,
                                'info'
                              );
                            }}
                            title={anyActive ? 'Жарамсыз ету' : 'Қайта белсендіру'}
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
                            {anyActive ? 'Жарамсыз ету' : 'Белсендіру'}
                          </button>

                          {/* Delete batch */}
                          <button
                            type="button"
                            onClick={() => setBatchToDelete(batch)}
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

          {filteredBatches.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-mid)' }}>
              Промокод топтамалары табылмады. Жоғарыдағы форма арқылы жаңа топтама генерациялаңыз.
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

    </section>
  );
};
