import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useRoyaltyStore, getMonthLabel, PayoutRecord } from '../../store/useRoyaltyStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useBookStore } from '../../store/useBookStore';
import { useToastStore } from '../../store/useToastStore';

const formatNumberWithSpaces = (val: number | string): string => {
  if (val === '' || val === null || val === undefined) return '';
  const digits = String(val).replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('ru-RU');
};

const parseFormattedNumber = (val: string): number => {
  const digits = val.replace(/\D/g, '');
  return digits ? Number(digits) : 0;
};

const formatCurrencyWithDecimals = (num: number): string => {
  if (num === null || num === undefined || isNaN(num)) return '0';
  const rounded = Number(num.toFixed(2));
  const parts = rounded.toFixed(2).split('.');
  const integerPart = Number(parts[0]).toLocaleString('ru-RU');
  const decimalPart = parts[1];
  
  if (decimalPart === '00') {
    return integerPart;
  }
  return `${integerPart},${decimalPart}`;
};

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('kk-KZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

export const AdminRoyaltyTab: React.FC = () => {
  const {
    periods,
    activeMonth,
    calculateRoyalty,
    finalizeRoyaltyPeriod,
    fetchPeriods,
    fetchPeriod,
    resetAllStatsToZero,
    fetchAllAdminPayouts,
    approvePayout,
    rejectPayout,
  } = useRoyaltyStore();
  const { authors, fetchAuthors } = useAuthStore();
  const { books, fetchBooks } = useBookStore();
  const { showToast } = useToastStore();

  // Sub-tabs: 'calculator' | 'payouts'
  const [activeSubTab, setActiveSubTab] = useState<'calculator' | 'payouts'>('calculator');

  // Month selector: generate past 12 months dynamically
  const availableMonths = useMemo(() => {
    const months: string[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      months.push(`${y}-${m}`);
    }
    Object.keys(periods).forEach((key) => {
      if (!months.includes(key)) {
        months.push(key);
      }
    });
    return months;
  }, [periods]);

  const defaultMonth = availableMonths[0] || '2026-09';
  const [selectedMonth, setSelectedMonth] = useState<string>(activeMonth || defaultMonth);
  const currentPeriod = periods[selectedMonth];

  // Form states initialized from current period
  const [revenueInput, setRevenueInput] = useState<number>(() => currentPeriod?.totalRevenue || 0);
  const [expenseInput, setExpenseInput] = useState<number>(() => currentPeriod?.adminExpense || 0);
  const [noteInput, setNoteInput] = useState<string>(() => currentPeriod?.adminNote || '');

  // Payouts state
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [payoutsLoading, setPayoutsLoading] = useState<boolean>(false);
  const [payoutStatusFilter, setPayoutStatusFilter] = useState<'all' | 'requested' | 'completed' | 'rejected'>('all');
  const [payoutSearchQuery, setPayoutSearchQuery] = useState<string>('');

  // Rejection modal state
  const [rejectingPayout, setRejectingPayout] = useState<PayoutRecord | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>('');
  const [isSubmittingReject, setIsSubmittingReject] = useState<boolean>(false);

  // Load periods, authors, and books on mount
  useEffect(() => {
    fetchPeriods();
    fetchAuthors();
    fetchBooks();
  }, [fetchPeriods, fetchAuthors, fetchBooks]);

  const saveTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (selectedMonth) {
      fetchPeriod(selectedMonth);
    }
  }, [selectedMonth, fetchPeriod]);

  // Synchronize inputs ONLY when selected month changes
  useEffect(() => {
    const p = periods[selectedMonth];
    if (p) {
      setRevenueInput(p.totalRevenue || 0);
      setExpenseInput(p.adminExpense || 0);
      setNoteInput(p.adminNote || '');
    }
  }, [selectedMonth, periods]);

  // Load payouts
  const loadPayouts = useCallback(async () => {
    setPayoutsLoading(true);
    try {
      const data = await fetchAllAdminPayouts();
      setPayouts(data);
    } finally {
      setPayoutsLoading(false);
    }
  }, [fetchAllAdminPayouts]);

  useEffect(() => {
    loadPayouts();
  }, [loadPayouts]);

  const pendingPayoutsCount = useMemo(() => {
    return payouts.filter((p) => p.status === 'requested').length;
  }, [payouts]);

  const handleRevenueChange = (newVal: number) => {
    setRevenueInput(newVal);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      calculateRoyalty(selectedMonth, {
        totalRevenue: Number(newVal),
        adminExpense: Number(expenseInput),
        adminNote: noteInput,
      });
    }, 600);
  };

  const handleExpenseChange = (newVal: number) => {
    setExpenseInput(newVal);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      calculateRoyalty(selectedMonth, {
        totalRevenue: Number(revenueInput),
        adminExpense: Number(newVal),
        adminNote: noteInput,
      });
    }, 600);
  };

  // Platform listening minutes from backend period (or sum of author earnings)
  const totalPlatformMinutes = useMemo(() => {
    if (currentPeriod?.totalMinutesListened && currentPeriod.totalMinutesListened > 0) {
      return currentPeriod.totalMinutesListened;
    }
    if (currentPeriod?.authorEarnings && currentPeriod.authorEarnings.length > 0) {
      return currentPeriod.authorEarnings.reduce((acc, ae) => acc + (ae.totalMinutes || 0), 0);
    }
    return 0;
  }, [currentPeriod]);

  const netPool = Math.max(0, revenueInput - expenseInput);
  const companyShare = Math.round(netPool * 0.5);
  const authorRoyaltyPool = netPool - companyShare;
  const previewRatePerMinute = totalPlatformMinutes > 0 ? Number((authorRoyaltyPool / totalPlatformMinutes).toFixed(2)) : 0;

  const handleRecalculate = async () => {
    if (expenseInput < 0) {
      showToast('Шығын сомасы теріс болмауы керек', 'error');
      return;
    }
    if (revenueInput < 0) {
      showToast('Түсім сомасы теріс болмауы керек', 'error');
      return;
    }

    const updated = await calculateRoyalty(
      selectedMonth,
      {
        totalRevenue: Number(revenueInput),
        adminExpense: Number(expenseInput),
        adminNote: noteInput,
      }
    );

    if (updated) {
      showToast(`«${getMonthLabel(selectedMonth)}» айы үшін роялти есебі жаңартылды!`, 'success');
    } else {
      showToast('Роялти есебін жүргізу кезінде қате орын алды', 'error');
    }
  };

  const handleFinalize = async () => {
    if (currentPeriod?.isFinalized) {
      showToast('Бұл кезең бұрыннан бекітілген', 'info');
      return;
    }

    const confirmMsg = `«${getMonthLabel(selectedMonth)}» айының роялти есебін бекітіп, авторлардың балансына ақша түсіруге сенімдісіз бе?\n\nБекітілгеннен кейін сомалар авторлардың қолжетімді балансына қосылады және олар шығару сұранысын жібере алады.`;
    if (!window.confirm(confirmMsg)) {
      return;
    }

    if (!currentPeriod) {
      await handleRecalculate();
    }
    const res = await finalizeRoyaltyPeriod(selectedMonth);
    if (res.success) {
      showToast(`«${getMonthLabel(selectedMonth)}» айының есебі сәтті бекітіліп, авторлар балансына ақша түсті!`, 'success');
      loadPayouts();
    } else {
      showToast(res.error || 'Бекіту сәтсіз аяқталды', 'error');
    }
  };

  const handleResetAll = () => {
    if (window.confirm('Барлық роялти мен тыңдалым статистикасын 0-ге түсіруге сенімдісіз бе?')) {
      resetAllStatsToZero();
      setRevenueInput(0);
      setExpenseInput(0);
      setNoteInput('');
      showToast('Барлық роялти мен тыңдалым деректері 0-ге түсірілді', 'info');
    }
  };

  // Payout actions
  const handleApprovePayout = async (payout: PayoutRecord) => {
    const confirmMsg = `«${payout.authorName}» авторының ${payout.amount.toLocaleString()} ₸ сомасындағы төлемін мақұлдауға сенімдісіз бе?`;
    if (!window.confirm(confirmMsg)) return;

    const res = await approvePayout(payout.id);
    if (res.success) {
      showToast(`«${payout.authorName}» төлемі сәтті мақұлданды!`, 'success');
      loadPayouts();
    } else {
      showToast(res.error || 'Мақұлдау сәтсіз аяқталды', 'error');
    }
  };

  const openRejectModal = (payout: PayoutRecord) => {
    setRejectingPayout(payout);
    setRejectionReasonInput('Деректемелер дұрыс көрсетілмеген немесе қате');
  };

  const closeRejectModal = () => {
    setRejectingPayout(null);
    setRejectionReasonInput('');
    setIsSubmittingReject(false);
  };

  const handleConfirmReject = async () => {
    if (!rejectingPayout) return;
    setIsSubmittingReject(true);
    try {
      const res = await rejectPayout(rejectingPayout.id, rejectionReasonInput.trim());
      if (res.success) {
        showToast(
          `Сұраныстан бас тартылды және ${rejectingPayout.amount.toLocaleString()} ₸ автор балансына қайтарылды!`,
          'success'
        );
        closeRejectModal();
        loadPayouts();
      } else {
        showToast(res.error || 'Бас тарту сәтсіз аяқталды', 'error');
        setIsSubmittingReject(false);
      }
    } catch {
      showToast('Қате орын алды', 'error');
      setIsSubmittingReject(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Деректеме алмасу буферіне көшірілді', 'info');
  };

  // Filtered payouts
  const filteredPayouts = useMemo(() => {
    return payouts.filter((p) => {
      if (payoutStatusFilter !== 'all' && p.status !== payoutStatusFilter) {
        return false;
      }
      if (payoutSearchQuery.trim()) {
        const q = payoutSearchQuery.toLowerCase().trim();
        const authorMatch = p.authorName.toLowerCase().includes(q);
        const emailMatch = p.authorEmail ? p.authorEmail.toLowerCase().includes(q) : false;
        const methodMatch = p.method ? p.method.toLowerCase().includes(q) : false;
        const cardMatch = p.cardOrAccount ? p.cardOrAccount.toLowerCase().includes(q) : false;
        return authorMatch || emailMatch || methodMatch || cardMatch;
      }
      return true;
    });
  }, [payouts, payoutStatusFilter, payoutSearchQuery]);

  // Payout statistics
  const payoutStats = useMemo(() => {
    const totalCount = payouts.length;
    const totalSum = payouts.reduce((acc, p) => acc + p.amount, 0);

    const pending = payouts.filter((p) => p.status === 'requested');
    const pendingCount = pending.length;
    const pendingSum = pending.reduce((acc, p) => acc + p.amount, 0);

    const completed = payouts.filter((p) => p.status === 'completed');
    const completedCount = completed.length;
    const completedSum = completed.reduce((acc, p) => acc + p.amount, 0);

    const rejected = payouts.filter((p) => p.status === 'rejected');
    const rejectedCount = rejected.length;
    const rejectedSum = rejected.reduce((acc, p) => acc + p.amount, 0);

    return {
      totalCount,
      totalSum,
      pendingCount,
      pendingSum,
      completedCount,
      completedSum,
      rejectedCount,
      rejectedSum,
    };
  }, [payouts]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Sub-tab Navigation */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          borderBottom: '2px solid #E2E8F0',
          paddingBottom: '12px',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveSubTab('calculator')}
          style={{
            padding: '10px 22px',
            borderRadius: '12px',
            border: 'none',
            background: activeSubTab === 'calculator' ? 'var(--blue)' : '#F1F5F9',
            color: activeSubTab === 'calculator' ? '#FFFFFF' : '#475569',
            fontWeight: 800,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="4" y="2" width="16" height="20" rx="2"></rect>
            <line x1="8" y1="6" x2="16" y2="6"></line>
            <line x1="16" y1="14" x2="16" y2="18"></line>
            <path d="M16 10h.01"></path>
            <path d="M12 10h.01"></path>
            <path d="M8 10h.01"></path>
            <path d="M12 14h.01"></path>
            <path d="M8 14h.01"></path>
            <path d="M12 18h.01"></path>
            <path d="M8 18h.01"></path>
          </svg>
          Роялти калькуляторы (50/50)
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('payouts')}
          style={{
            padding: '10px 22px',
            borderRadius: '12px',
            border: 'none',
            background: activeSubTab === 'payouts' ? 'var(--blue)' : '#F1F5F9',
            color: activeSubTab === 'payouts' ? '#FFFFFF' : '#475569',
            fontWeight: 800,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="2" y="5" width="20" height="14" rx="2"></rect>
            <line x1="2" y1="10" x2="22" y2="10"></line>
          </svg>
          Шығару сұраныстары (Төлемдер)
          {pendingPayoutsCount > 0 && (
            <span
              style={{
                background: '#EA580C',
                color: '#FFFFFF',
                fontSize: '11px',
                fontWeight: 900,
                padding: '2px 8px',
                borderRadius: '12px',
                marginLeft: '4px',
              }}
            >
              {pendingPayoutsCount}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: ROYALTY CALCULATOR (50/50)                                     */}
      {/* ========================================================================= */}
      {activeSubTab === 'calculator' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 1. Header & Month Selector */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '22px 28px',
              border: '1.5px solid #E2E8F0',
              boxShadow: '0 4px 20px rgba(0, 84, 148, 0.04)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-dark)', margin: 0 }}>
                  Роялти және табысты бөлу калькуляторы
                </h2>
                {currentPeriod?.isFinalized ? (
                  <span
                    style={{
                      background: '#DCFCE7',
                      color: '#16A34A',
                      fontSize: '12px',
                      fontWeight: 800,
                      padding: '4px 12px',
                      borderRadius: '12px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    ✓ Бекітілді (Балансқа түсті)
                    {currentPeriod.finalizedAt && (
                      <span style={{ fontSize: '11px', opacity: 0.85 }}>
                        • {new Date(currentPeriod.finalizedAt).toLocaleDateString('kk-KZ')}
                      </span>
                    )}
                  </span>
                ) : currentPeriod ? (
                  <span
                    style={{
                      background: '#FEF3C7',
                      color: '#D97706',
                      fontSize: '12px',
                      fontWeight: 800,
                      padding: '4px 12px',
                      borderRadius: '12px',
                    }}
                  >
                    ⏳ Есептелді (Бекітілмеген)
                  </span>
                ) : (
                  <span
                    style={{
                      background: '#F1F5F9',
                      color: '#64748B',
                      fontSize: '12px',
                      fontWeight: 800,
                      padding: '4px 12px',
                      borderRadius: '12px',
                    }}
                  >
                    Жаңа кезең
                  </span>
                )}
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748B' }}>
                Таза пайданы 50/50 формуласы бойынша бөлу және авторлардың нақты тыңдалған уақытына сәйкес төлеу
              </p>
            </div>

            {/* Month Selector & Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)' }}>
                  Есептік ай:
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '12px',
                    border: '1.5px solid #CBD5E1',
                    background: '#FFFFFF',
                    fontSize: '13.5px',
                    fontWeight: 800,
                    color: '#0F172A',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {availableMonths.map((m) => (
                    <option key={m} value={m}>
                      {getMonthLabel(m)} {m === defaultMonth ? '(Ағымдағы)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleRecalculate}
                title="Есептеулерді жаңарту"
                style={{
                  padding: '9px 18px',
                  borderRadius: '12px',
                  border: '1.5px solid var(--blue)',
                  background: '#FFFFFF',
                  color: 'var(--blue)',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
                </svg>
                Қайта есептеу
              </button>

              <button
                type="button"
                onClick={handleFinalize}
                disabled={Boolean(currentPeriod?.isFinalized)}
                title={
                  currentPeriod?.isFinalized
                    ? 'Бұл кезең бекітіліп қойылған'
                    : 'Есепті бекітіп, авторлардың балансына ақша түсіру'
                }
                style={{
                  padding: '9px 18px',
                  borderRadius: '12px',
                  border: 'none',
                  background: currentPeriod?.isFinalized ? '#E2E8F0' : '#16A34A',
                  color: currentPeriod?.isFinalized ? '#94A3B8' : '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: currentPeriod?.isFinalized ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s',
                  boxShadow: currentPeriod?.isFinalized ? 'none' : '0 2px 10px rgba(22, 163, 74, 0.25)',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                {currentPeriod?.isFinalized ? '✓ Бекітілген' : 'Бекіту (Балансқа түсіру)'}
              </button>

              <button
                type="button"
                onClick={handleResetAll}
                title="Барлық есептеулер мен тыңдалым статистикасын 0-ге түсіру"
                style={{
                  padding: '9px 14px',
                  borderRadius: '12px',
                  border: '1.5px solid #FCA5A5',
                  background: '#FEF2F2',
                  color: '#DC2626',
                  fontSize: '12.5px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                0-ге түсіру
              </button>
            </div>
          </div>

      {/* 2. Key Metric Cards (Summary) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Card 1: Total Revenue (Manual Input) */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '18px',
            padding: '18px 20px',
            border: '1.5px solid #CBD5E1',
            boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#64748B', marginBottom: '6px' }}>
            Табыс
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '2px 0' }}>
            <input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={formatNumberWithSpaces(revenueInput)}
              onChange={(e) => handleRevenueChange(parseFormattedNumber(e.target.value))}
              style={{
                width: '100%',
                fontSize: '22px',
                fontWeight: 900,
                color: '#0F172A',
                border: '1.5px solid #E2E8F0',
                borderRadius: '10px',
                padding: '6px 12px',
                outline: 'none',
                background: '#F8FAFC',
                boxSizing: 'border-box',
              }}
            />
            <span style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A' }}>₸</span>
          </div>
        </div>

        {/* Card 2: Manual Expense (Manual Input) */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '18px',
            padding: '18px 20px',
            border: '1.5px solid #CBD5E1',
            boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#64748B', marginBottom: '6px' }}>
            Шығын
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '2px 0' }}>
            <input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={formatNumberWithSpaces(expenseInput)}
              onChange={(e) => handleExpenseChange(parseFormattedNumber(e.target.value))}
              style={{
                width: '100%',
                fontSize: '22px',
                fontWeight: 900,
                color: '#DC2626',
                border: '1.5px solid #E2E8F0',
                borderRadius: '10px',
                padding: '6px 12px',
                outline: 'none',
                background: '#FEF2F2',
                boxSizing: 'border-box',
              }}
            />
            <span style={{ fontSize: '20px', fontWeight: 900, color: '#DC2626' }}>₸</span>
          </div>
        </div>

        {/* Card 3: Net Distributable Pool */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '18px',
            padding: '20px',
            border: '1.5px solid #E2E8F0',
            boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#64748B', marginBottom: '8px' }}>
            Таза пайда
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--blue)' }}>
            {netPool.toLocaleString()} ₸
          </div>
        </div>

        {/* Card 4: Company Share 50% */}
        <div
          style={{
            background: 'linear-gradient(135deg, #003763 0%, #005494 100%)',
            color: '#FFFFFF',
            borderRadius: '18px',
            padding: '20px',
            boxShadow: '0 8px 24px rgba(0, 55, 99, 0.2)',
          }}
        >
          <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'rgba(255,255,255,0.8)', marginBottom: '8px' }}>
            Компанияның пайдасы | 50%
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#FFFFFF' }}>
            {companyShare.toLocaleString()} ₸
          </div>
        </div>

        {/* Card 5: Author Royalty Pool 50% */}
        <div
          style={{
            background: 'linear-gradient(135deg, #EF7E00 0%, #EA580C 100%)',
            color: '#FFFFFF',
            borderRadius: '18px',
            padding: '20px',
            boxShadow: '0 8px 24px rgba(239, 126, 0, 0.25)',
          }}
        >
          <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'rgba(255,255,255,0.9)', marginBottom: '8px' }}>
            Авторлардың пайдасы | 50%
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#FFFFFF' }}>
            {authorRoyaltyPool.toLocaleString()} ₸
          </div>
        </div>

        {/* Card 6: 1 Minute Rate */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '18px',
            padding: '20px',
            border: '2px solid var(--blue)',
            boxShadow: '0 4px 16px rgba(0, 84, 148, 0.08)',
          }}
        >
          <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--blue)', marginBottom: '8px' }}>
            1 минуттың бағасы
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--blue)' }}>
            {previewRatePerMinute} ₸ <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748B' }}>/ мин</span>
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px' }}>
            1 сағатқа ≈ {(previewRatePerMinute * 60).toFixed(1)} ₸
          </div>
        </div>

        {/* Card 7: Total Author Listening Minutes */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '18px',
            padding: '20px',
            border: '1.5px solid #CBD5E1',
            boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#64748B', marginBottom: '8px' }}>
            Айлық тыңдалым
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--blue)' }}>
            {totalPlatformMinutes.toLocaleString()} мин
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px' }}>
            {totalPlatformMinutes > 0 ? `≈ ${(totalPlatformMinutes / 60).toFixed(1)} сағат тыңдалды` : 'Барлық авторлардың кітаптары бойынша'}
          </div>
        </div>

        {/* Card 8: Product of 1 Min Rate & Total Minutes */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '18px',
            padding: '20px',
            border: '1.5px solid #CBD5E1',
            boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#64748B', marginBottom: '8px' }}>
            Жалпы төлем сомасы
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#16A34A' }}>
            {formatCurrencyWithDecimals(previewRatePerMinute * totalPlatformMinutes)} ₸
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px' }}>
            {previewRatePerMinute} ₸ × {totalPlatformMinutes.toLocaleString()} мин
          </div>
        </div>
      </div>

      {/* 4. Authors Royalty Breakdown Table */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '20px',
          padding: '26px 30px',
          border: '1.5px solid #E2E8F0',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
        }}
      >
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-dark)', margin: 0 }}>
            Авторлардың есептелген роялти үлестері: {authors.length}
          </h3>
        </div>

        {authors.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748B' }}>
            Авторлар тіркелмеген. «Авторлар» вкладкасынан алдымен авторларды қосыңыз.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#64748B', fontWeight: 800 }}>
                  <th style={{ padding: '12px 14px' }}>Автор</th>
                  <th style={{ padding: '12px 14px' }}>Кітаптары</th>
                  <th style={{ padding: '12px 14px' }}>Тыңдалған уақыт</th>
                  <th style={{ padding: '12px 14px' }}>1 мин бағасы</th>
                  <th style={{ padding: '12px 14px' }}>Роялти сомасы (₸)</th>
                  <th style={{ padding: '12px 14px' }}>Мәртебесі</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Толық статистика</th>
                </tr>
              </thead>
              <tbody>
                {authors.map((author) => {
                  const matchName = (author.assignedAuthorName || author.name).toLowerCase().trim();
                  const earningDetail = currentPeriod?.authorEarnings?.find(
                    (ae) => ae.authorId === author.id || ae.authorUserId === author.id || (ae.authorName && ae.authorName.toLowerCase().trim() === matchName)
                  );
                  const assignedIds = new Set(author.assignedBookIds || []);

                  const authorBooks = books.filter((b) => {
                    if (assignedIds.has(b.id)) return true;
                    if (!b.author) return false;
                    const bAuthor = b.author.toLowerCase().trim();
                    return bAuthor === matchName || bAuthor.includes(matchName);
                  });

                  const minutes = earningDetail?.totalMinutes ?? 0;
                  const seconds = earningDetail?.totalSeconds ?? (minutes * 60);
                  const hrs = Number((seconds / 3600).toFixed(1));
                  const earned = previewRatePerMinute > 0 ? Number((minutes * previewRatePerMinute).toFixed(2)) : (earningDetail?.totalEarned ?? 0);
                  const isPaid = currentPeriod?.isFinalized || earningDetail?.status === 'paid';

                  return (
                    <tr key={author.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '14px' }}>
                        <Link
                          to={`/admin/authors/${author.id}`}
                          style={{
                            fontWeight: 800,
                            color: 'var(--text-dark)',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            transition: 'color 0.15s',
                          }}
                          title="Автордың толық парақшасы мен статистикасын ашу"
                        >
                          {author.name}
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                          </svg>
                        </Link>
                        <div style={{ fontSize: '12px', color: 'var(--text-mid)' }}>{author.email}</div>
                      </td>

                      <td style={{ padding: '14px', fontWeight: 800, color: 'var(--text-dark)' }}>
                        {authorBooks.length} кітап
                      </td>

                      <td style={{ padding: '14px', fontWeight: 800, color: 'var(--text-dark)' }}>
                        <div>{minutes.toLocaleString('ru-RU')} мин</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-mid)', fontWeight: 600, marginTop: '2px' }}>
                          🕒 {hrs} сағ • ⏱ {seconds.toLocaleString('ru-RU')} сек
                        </div>
                      </td>

                      <td style={{ padding: '14px', fontWeight: 800, color: 'var(--text-dark)' }}>
                        {previewRatePerMinute} ₸
                      </td>

                      <td style={{ padding: '14px' }}>
                        <div style={{ fontSize: '16px', fontWeight: 900, color: 'var(--text-dark)' }}>
                          {formatCurrencyWithDecimals(earned)} ₸
                        </div>
                      </td>

                      <td style={{ padding: '14px' }}>
                        {isPaid ? (
                          <span
                            style={{
                              background: '#F1F5F9',
                              color: 'var(--text-dark)',
                              fontSize: '11.5px',
                              fontWeight: 800,
                              padding: '4px 10px',
                              borderRadius: '20px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            ✓ Төленді
                          </span>
                        ) : (
                          <span
                            style={{
                              background: '#F1F5F9',
                              color: 'var(--text-dark)',
                              fontSize: '11.5px',
                              fontWeight: 800,
                              padding: '4px 10px',
                              borderRadius: '20px',
                            }}
                          >
                            Есептелді
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '14px', textAlign: 'right' }}>
                        <Link
                          to={`/admin/authors/${author.id}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '7px 14px',
                            borderRadius: '8px',
                            border: '1.5px solid #E2E8F0',
                            background: '#F8FAFC',
                            color: 'var(--text-dark)',
                            fontSize: '12px',
                            fontWeight: 800,
                            textDecoration: 'none',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.15s',
                          }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="20" x2="18" y2="10"></line>
                            <line x1="12" y1="20" x2="12" y2="4"></line>
                            <line x1="6" y1="20" x2="6" y2="14"></line>
                          </svg>
                          Парақшасы ↗
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: AUTHOR PAYOUTS PROCESSING                                      */}
      {/* ========================================================================= */}
      {activeSubTab === 'payouts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '22px 28px',
              border: '1.5px solid #E2E8F0',
              boxShadow: '0 4px 20px rgba(0, 84, 148, 0.04)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-dark)', margin: 0 }}>
                Авторлардың шығару сұраныстары (Төлемдер)
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748B' }}>
                Авторлардың сұратқан төлемдерін тексеру, мақұлдау немесе қате реквизит жағдайында балансына кері қайтару
              </p>
            </div>

            <button
              type="button"
              onClick={loadPayouts}
              disabled={payoutsLoading}
              style={{
                padding: '9px 18px',
                borderRadius: '12px',
                border: '1.5px solid #CBD5E1',
                background: '#FFFFFF',
                color: 'var(--text-dark)',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s',
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                style={{
                  animation: payoutsLoading ? 'spin 1s linear infinite' : 'none',
                }}
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
              </svg>
              Жаңарту
            </button>
          </div>

          {/* Payout Stats Summary Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
            }}
          >
            {/* Card 1: Total Payouts */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '18px',
                padding: '20px',
                border: '1.5px solid #E2E8F0',
                boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#64748B', marginBottom: '8px' }}>
                Барлық сұраныстар
              </div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-dark)' }}>
                {payoutStats.totalCount} <span style={{ fontSize: '14px', fontWeight: 700, color: '#64748B' }}>сұраныс</span>
              </div>
              <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '4px', fontWeight: 700 }}>
                {payoutStats.totalSum.toLocaleString()} ₸
              </div>
            </div>

            {/* Card 2: Pending (Action needed) */}
            <div
              style={{
                background: '#FFFBEB',
                borderRadius: '18px',
                padding: '20px',
                border: '2px solid #FCD34D',
                boxShadow: '0 4px 16px rgba(217, 119, 6, 0.08)',
              }}
            >
              <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#D97706', marginBottom: '8px' }}>
                ⏳ Күтудегі сұраныстар
              </div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#B45309' }}>
                {payoutStats.pendingCount} <span style={{ fontSize: '14px', fontWeight: 700, color: '#D97706' }}>сұраныс</span>
              </div>
              <div style={{ fontSize: '12.5px', color: '#B45309', marginTop: '4px', fontWeight: 800 }}>
                {payoutStats.pendingSum.toLocaleString()} ₸
              </div>
            </div>

            {/* Card 3: Completed */}
            <div
              style={{
                background: '#F0FDF4',
                borderRadius: '18px',
                padding: '20px',
                border: '1.5px solid #86EFAC',
                boxShadow: '0 4px 16px rgba(22, 163, 74, 0.05)',
              }}
            >
              <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#16A34A', marginBottom: '8px' }}>
                ✓ Төленген сома
              </div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#15803D' }}>
                {payoutStats.completedSum.toLocaleString()} ₸
              </div>
              <div style={{ fontSize: '12.5px', color: '#16A34A', marginTop: '4px', fontWeight: 700 }}>
                {payoutStats.completedCount} орындалған төлем
              </div>
            </div>

            {/* Card 4: Rejected */}
            <div
              style={{
                background: '#FEF2F2',
                borderRadius: '18px',
                padding: '20px',
                border: '1.5px solid #FECACA',
                boxShadow: '0 4px 16px rgba(220, 38, 38, 0.04)',
              }}
            >
              <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#DC2626', marginBottom: '8px' }}>
                ✕ Бас тартылған (Қайтарылған)
              </div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#991B1B' }}>
                {payoutStats.rejectedSum.toLocaleString()} ₸
              </div>
              <div style={{ fontSize: '12.5px', color: '#DC2626', marginTop: '4px', fontWeight: 700 }}>
                {payoutStats.rejectedCount} сұраныс балансқа қайтарылды
              </div>
            </div>
          </div>

          {/* Filters & Search */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '18px',
              padding: '16px 20px',
              border: '1.5px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            {/* Status Pills */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setPayoutStatusFilter('all')}
                style={{
                  padding: '7px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid',
                  borderColor: payoutStatusFilter === 'all' ? 'var(--blue)' : '#CBD5E1',
                  background: payoutStatusFilter === 'all' ? 'var(--blue)' : '#FFFFFF',
                  color: payoutStatusFilter === 'all' ? '#FFFFFF' : '#475569',
                  fontSize: '12.5px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Барлығы ({payouts.length})
              </button>

              <button
                type="button"
                onClick={() => setPayoutStatusFilter('requested')}
                style={{
                  padding: '7px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid',
                  borderColor: payoutStatusFilter === 'requested' ? '#D97706' : '#FCD34D',
                  background: payoutStatusFilter === 'requested' ? '#D97706' : '#FFFBEB',
                  color: payoutStatusFilter === 'requested' ? '#FFFFFF' : '#B45309',
                  fontSize: '12.5px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Күтуде ({payoutStats.pendingCount})
              </button>

              <button
                type="button"
                onClick={() => setPayoutStatusFilter('completed')}
                style={{
                  padding: '7px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid',
                  borderColor: payoutStatusFilter === 'completed' ? '#16A34A' : '#86EFAC',
                  background: payoutStatusFilter === 'completed' ? '#16A34A' : '#F0FDF4',
                  color: payoutStatusFilter === 'completed' ? '#FFFFFF' : '#15803D',
                  fontSize: '12.5px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Төленді ({payoutStats.completedCount})
              </button>

              <button
                type="button"
                onClick={() => setPayoutStatusFilter('rejected')}
                style={{
                  padding: '7px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid',
                  borderColor: payoutStatusFilter === 'rejected' ? '#DC2626' : '#FECACA',
                  background: payoutStatusFilter === 'rejected' ? '#DC2626' : '#FEF2F2',
                  color: payoutStatusFilter === 'rejected' ? '#FFFFFF' : '#991B1B',
                  fontSize: '12.5px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Бас тартылды ({payoutStats.rejectedCount})
              </button>
            </div>

            {/* Search Box */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '260px' }}>
              <input
                type="text"
                placeholder="Автор, телефон немесе карта нөмірі..."
                value={payoutSearchQuery}
                onChange={(e) => setPayoutSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '12.5px',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Payouts Table */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '24px 28px',
              border: '1.5px solid #E2E8F0',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
            }}
          >
            <div style={{ marginBottom: '18px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-dark)', margin: 0 }}>
                Сұраныстар тізімі: {filteredPayouts.length}
              </h3>
            </div>

            {filteredPayouts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748B' }}>
                {payoutSearchQuery || payoutStatusFilter !== 'all'
                  ? 'Сүзгі талаптарына сәйкес сұраныс табылмады'
                  : 'Әзірге шығару сұраныстары жоқ'}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#64748B', fontWeight: 800 }}>
                      <th style={{ padding: '12px 14px' }}>Сұраныс уақыты</th>
                      <th style={{ padding: '12px 14px' }}>Автор</th>
                      <th style={{ padding: '12px 14px' }}>Сомасы (₸)</th>
                      <th style={{ padding: '12px 14px' }}>Төлем әдісі мен деректемесі</th>
                      <th style={{ padding: '12px 14px' }}>Мәртебесі</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right' }}>Әрекеттер</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayouts.map((payout) => {
                      const isPending = payout.status === 'requested';
                      const isCompleted = payout.status === 'completed';
                      const isRejected = payout.status === 'rejected';

                      return (
                        <tr key={payout.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          {/* Date & ID */}
                          <td style={{ padding: '14px', whiteSpace: 'nowrap' }}>
                            <div style={{ fontWeight: 800, color: 'var(--text-dark)', fontSize: '13px' }}>
                              {formatDate(payout.requestedAt || payout.date)}
                            </div>
                            <div style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'monospace' }}>
                              {payout.id}
                            </div>
                          </td>

                          {/* Author */}
                          <td style={{ padding: '14px' }}>
                            <Link
                              to={`/admin/authors/${payout.authorId}`}
                              style={{
                                fontWeight: 800,
                                color: 'var(--text-dark)',
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                              }}
                            >
                              {payout.authorName}
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                <polyline points="15 3 21 3 21 9"></polyline>
                                <line x1="10" y1="14" x2="21" y2="3"></line>
                              </svg>
                            </Link>
                            {payout.authorEmail && (
                              <div style={{ fontSize: '12px', color: 'var(--text-mid)' }}>{payout.authorEmail}</div>
                            )}
                            {payout.authorPhone && (
                              <div style={{ fontSize: '11.5px', color: '#64748B' }}>{payout.authorPhone}</div>
                            )}
                          </td>

                          {/* Amount */}
                          <td style={{ padding: '14px', whiteSpace: 'nowrap' }}>
                            <div style={{ fontSize: '17px', fontWeight: 900, color: '#0F172A' }}>
                              {payout.amount.toLocaleString()} ₸
                            </div>
                          </td>

                          {/* Method & Card */}
                          <td style={{ padding: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span
                                style={{
                                  background: '#EFF6FF',
                                  color: 'var(--blue)',
                                  fontWeight: 800,
                                  fontSize: '11.5px',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                }}
                              >
                                {payout.method}
                              </span>
                            </div>
                            {payout.cardOrAccount ? (
                              <div
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  marginTop: '5px',
                                  background: '#F8FAFC',
                                  border: '1px solid #E2E8F0',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  fontFamily: 'monospace',
                                  fontSize: '12.5px',
                                  color: '#0F172A',
                                  fontWeight: 700,
                                }}
                              >
                                <span>{payout.cardOrAccount}</span>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(payout.cardOrAccount || '')}
                                  title="Реквизитті көшіру"
                                  style={{
                                    border: 'none',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    padding: '2px',
                                    color: '#64748B',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                  }}
                                >
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                  </svg>
                                </button>
                              </div>
                            ) : (
                              <div style={{ fontSize: '11.5px', color: '#94A3B8', marginTop: '4px' }}>
                                Деректеме жазылмаған
                              </div>
                            )}
                          </td>

                          {/* Status */}
                          <td style={{ padding: '14px', whiteSpace: 'nowrap' }}>
                            {isPending && (
                              <span
                                style={{
                                  background: '#FEF3C7',
                                  color: '#D97706',
                                  fontSize: '12px',
                                  fontWeight: 800,
                                  padding: '5px 12px',
                                  borderRadius: '20px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                }}
                              >
                                ⏳ Күтуде
                              </span>
                            )}
                            {isCompleted && (
                              <span
                                style={{
                                  background: '#DCFCE7',
                                  color: '#16A34A',
                                  fontSize: '12px',
                                  fontWeight: 800,
                                  padding: '5px 12px',
                                  borderRadius: '20px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                }}
                              >
                                ✓ Төленді
                              </span>
                            )}
                            {isRejected && (
                              <div>
                                <span
                                  style={{
                                    background: '#FEE2E2',
                                    color: '#DC2626',
                                    fontSize: '12px',
                                    fontWeight: 800,
                                    padding: '5px 12px',
                                    borderRadius: '20px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                  }}
                                >
                                  ✕ Бас тартылды
                                </span>
                                {payout.rejectionReason && (
                                  <div
                                    style={{
                                      fontSize: '11.5px',
                                      color: '#991B1B',
                                      marginTop: '4px',
                                      maxWidth: '220px',
                                      lineHeight: 1.3,
                                    }}
                                  >
                                    Себебі: {payout.rejectionReason}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Actions */}
                          <td style={{ padding: '14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            {isPending ? (
                              <div style={{ display: 'inline-flex', gap: '8px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleApprovePayout(payout)}
                                  title="Төлемді мақұлдау"
                                  style={{
                                    padding: '7px 14px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: '#16A34A',
                                    color: '#FFFFFF',
                                    fontSize: '12.5px',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    boxShadow: '0 2px 8px rgba(22, 163, 74, 0.2)',
                                  }}
                                >
                                  ✓ Мақұлдау
                                </button>

                                <button
                                  type="button"
                                  onClick={() => openRejectModal(payout)}
                                  title="Бас тарту және соманы балансқа қайтару"
                                  style={{
                                    padding: '7px 14px',
                                    borderRadius: '10px',
                                    border: '1.5px solid #FCA5A5',
                                    background: '#FEF2F2',
                                    color: '#DC2626',
                                    fontSize: '12.5px',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                  }}
                                >
                                  ✕ Бас тарту
                                </button>
                              </div>
                            ) : (
                              <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                                {isCompleted && payout.processedAt ? `Орындалды: ${formatDate(payout.processedAt)}` : 'Өңделген'}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REJECTION MODAL                                                           */}
      {/* ========================================================================= */}
      {rejectingPayout && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            background: 'rgba(0, 20, 45, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '24px',
              padding: '28px',
              width: '100%',
              maxWidth: '520px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '19px', fontWeight: 900, color: 'var(--text-dark)', margin: 0 }}>
                Шығару сұранысынан бас тарту
              </h3>
              <button
                type="button"
                onClick={closeRejectModal}
                style={{
                  border: 'none',
                  background: '#F1F5F9',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748B',
                }}
              >
                ✕
              </button>
            </div>

            {/* Warning & Info */}
            <div
              style={{
                background: '#FEF2F2',
                border: '1.5px solid #FECACA',
                borderRadius: '14px',
                padding: '14px 16px',
                fontSize: '13px',
                color: '#991B1B',
                lineHeight: 1.4,
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: '4px' }}>
                Автор: {rejectingPayout.authorName} • Сомасы: {rejectingPayout.amount.toLocaleString()} ₸
              </div>
              <div>
                Сұраныстан бас тартқан жағдайда, аталған сома автордың қолжетімді балансына <strong>дереу қайтарылады</strong>.
              </div>
            </div>

            {/* Quick Reason Suggestions */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '8px' }}>
                Жиі қолданылатын себептер:
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[
                  'Деректемелер дұрыс көрсетілмеген немесе қате',
                  'Карта/шот иесінің аты автордың аты-жөнімен сәйкес келмейді',
                  'Банк деректемелері арқылы төлем жүргізу мүмкін болмады',
                  'Техникалық ақау орын алды, қайта өтініш жіберуіңізді сұраймыз',
                ].map((reasonText) => (
                  <button
                    key={reasonText}
                    type="button"
                    onClick={() => setRejectionReasonInput(reasonText)}
                    style={{
                      textAlign: 'left',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      background: rejectionReasonInput === reasonText ? '#EFF6FF' : '#F8FAFC',
                      color: rejectionReasonInput === reasonText ? 'var(--blue)' : '#334155',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    • {reasonText}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Reason Input */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                Бас тарту себебі (авторға көрсетіледі):
              </label>
              <textarea
                rows={3}
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                placeholder="Себебін енгізіңіз..."
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={closeRejectModal}
                disabled={isSubmittingReject}
                style={{
                  padding: '10px 20px',
                  borderRadius: '12px',
                  border: '1.5px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Болдырмау
              </button>

              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isSubmittingReject || !rejectionReasonInput.trim()}
                style={{
                  padding: '10px 22px',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#DC2626',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: isSubmittingReject || !rejectionReasonInput.trim() ? 'not-allowed' : 'pointer',
                  opacity: isSubmittingReject || !rejectionReasonInput.trim() ? 0.6 : 1,
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
                }}
              >
                {isSubmittingReject ? 'Қайтарылуда...' : 'Бас тартуды растау (Балансқа қайтару)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
