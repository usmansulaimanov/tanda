import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useRoyaltyStore, getMonthLabel } from '../../store/useRoyaltyStore';
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

export const AdminRoyaltyTab: React.FC = () => {
  const { periods, activeMonth, listeningStats, calculateRoyalty, finalizeRoyaltyPeriod, resetAllStatsToZero } = useRoyaltyStore();
  const { getAllAuthors } = useAuthStore();
  const { books } = useBookStore();
  const { showToast } = useToastStore();

  const [selectedMonth, setSelectedMonth] = useState<string>(activeMonth || '2026-09');
  const currentPeriod = periods[selectedMonth];

  const authors = useMemo(() => getAllAuthors(), [getAllAuthors]);

  // Form states for manual expense and revenue input (defaults strictly to 0)
  const [revenueInput, setRevenueInput] = useState<number>(currentPeriod?.totalRevenue || 0);
  const [expenseInput, setExpenseInput] = useState<number>(currentPeriod?.adminExpense || 0);
  const [noteInput, setNoteInput] = useState<string>(currentPeriod?.adminNote || '');

  // Synchronize inputs when selected month changes
  useEffect(() => {
    if (currentPeriod) {
      setRevenueInput(currentPeriod.totalRevenue);
      setExpenseInput(currentPeriod.adminExpense);
      setNoteInput(currentPeriod.adminNote || '');
    } else {
      setRevenueInput(0);
      setExpenseInput(0);
      setNoteInput('');
    }
  }, [selectedMonth, currentPeriod]);

  // Calculate live platform listening minutes and preview metrics strictly from real data
  const totalPlatformMinutes = useMemo(() => {
    if (currentPeriod) return currentPeriod.totalMinutesListened;
    let sum = 0;
    authors.forEach((author) => {
      const matchName = (author.assignedAuthorName || author.name).toLowerCase().trim();
      const assignedIds = new Set(author.assignedBookIds || []);
      const authorBooks = books.filter((b) => {
        if (assignedIds.has(b.id)) return true;
        if (!b.author) return false;
        const bAuthor = b.author.toLowerCase().trim();
        return bAuthor === matchName || bAuthor.includes(matchName);
      });
      authorBooks.forEach((b) => {
        sum += listeningStats[b.id]?.totalMinutes || 0;
      });
    });
    return sum;
  }, [currentPeriod, authors, books, listeningStats]);

  const netPool = Math.max(0, revenueInput - expenseInput);
  const companyShare = Math.round(netPool * 0.5);
  const authorRoyaltyPool = netPool - companyShare;
  const previewRatePerMinute = totalPlatformMinutes > 0 ? Number((authorRoyaltyPool / totalPlatformMinutes).toFixed(2)) : 0;

  const handleRecalculate = () => {
    if (expenseInput < 0) {
      showToast('Шығын сомасы теріс болмауы керек', 'error');
      return;
    }
    if (revenueInput < 0) {
      showToast('Түсім сомасы теріс болмауы керек', 'error');
      return;
    }

    calculateRoyalty(
      selectedMonth,
      {
        totalRevenue: Number(revenueInput),
        adminExpense: Number(expenseInput),
        adminNote: noteInput,
      },
      authors,
      books
    );

    showToast(`«${getMonthLabel(selectedMonth)}» айы үшін роялти есебі жаңартылды!`, 'success');
  };

  const handleFinalize = () => {
    if (!currentPeriod) {
      handleRecalculate();
    }
    const res = finalizeRoyaltyPeriod(selectedMonth);
    if (res.success) {
      showToast(`«${getMonthLabel(selectedMonth)}» айының есебі сәтті бекітіліп, авторлар балансына ақша түсті!`, 'success');
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. Header & Month Selector */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '20px',
          padding: '24px 28px',
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
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-dark)', margin: 0 }}>
              Роялти және табысты бөлу калькуляторы
            </h2>
          </div>
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
              <option value="2026-09">Қыркүйек 2026 (Ағымдағы)</option>
              <option value="2026-08">Тамыз 2026</option>
              <option value="2026-07">Шілде 2026</option>
              <option value="2026-06">Маусым 2026</option>
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
              onChange={(e) => setRevenueInput(parseFormattedNumber(e.target.value))}
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
              onChange={(e) => setExpenseInput(parseFormattedNumber(e.target.value))}
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-dark)', margin: 0 }}>
              Авторлардың есептелген роялти үлестері ({authors.length})
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-mid)', margin: '4px 0 0' }}>
              Әр авторға тиесілі кітаптардың нақты тыңдалған минуты бойынша есептелген төлем сомасы
            </p>
          </div>

          <div
            style={{
              background: '#EFF6FF',
              border: '1.5px solid #BFDBFE',
              borderRadius: '12px',
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#1E40AF' }}>
              Барлық авторлардың жалпы тыңдалымы:
            </span>
            <strong style={{ fontSize: '15px', fontWeight: 900, color: 'var(--blue)' }}>
              {totalPlatformMinutes.toLocaleString()} минут {totalPlatformMinutes > 0 ? `(≈ ${(totalPlatformMinutes / 60).toFixed(1)} сағат)` : ''}
            </strong>
          </div>
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
                  <th style={{ padding: '12px 14px' }}>Бекітілген кітаптары</th>
                  <th style={{ padding: '12px 14px' }}>Тыңдалған уақыт</th>
                  <th style={{ padding: '12px 14px' }}>1 мин бағасы</th>
                  <th style={{ padding: '12px 14px' }}>Роялти сомасы (₸)</th>
                  <th style={{ padding: '12px 14px' }}>Мәртебесі</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Толық статистика</th>
                </tr>
              </thead>
              <tbody>
                {authors.map((author) => {
                  const earningDetail = currentPeriod?.authorEarnings.find((ae) => ae.authorId === author.id);
                  const matchName = (author.assignedAuthorName || author.name).toLowerCase().trim();
                  const assignedIds = new Set(author.assignedBookIds || []);

                  const authorBooks = books.filter((b) => {
                    if (assignedIds.has(b.id)) return true;
                    if (!b.author) return false;
                    const bAuthor = b.author.toLowerCase().trim();
                    return bAuthor === matchName || bAuthor.includes(matchName);
                  });

                  const minutes = earningDetail?.totalMinutes ?? authorBooks.reduce((sum, b) => sum + (listeningStats[b.id]?.totalMinutes || 0), 0);
                  const earned = earningDetail?.totalEarned ?? (previewRatePerMinute > 0 ? Number((minutes * previewRatePerMinute).toFixed(2)) : 0);
                  const isPaid = currentPeriod?.isFinalized || earningDetail?.status === 'paid';

                  return (
                    <tr key={author.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '14px' }}>
                        <Link
                          to={`/admin/authors/${author.id}`}
                          style={{
                            fontWeight: 800,
                            color: 'var(--blue)',
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
                        <div style={{ fontSize: '12px', color: '#64748B' }}>{author.email}</div>
                      </td>

                      <td style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              background: 'rgba(0, 84, 148, 0.08)',
                              color: 'var(--blue)',
                              fontWeight: 800,
                              fontSize: '11.5px',
                              padding: '2px 8px',
                              borderRadius: '6px',
                            }}
                          >
                            {authorBooks.length} кітап
                          </span>
                          {authorBooks.slice(0, 2).map((b) => (
                            <span key={b.id} style={{ fontSize: '12px', color: '#475569' }}>
                              «{b.title.length > 20 ? b.title.slice(0, 20) + '...' : b.title}»
                            </span>
                          ))}
                          {authorBooks.length > 2 && (
                            <span style={{ fontSize: '11px', color: '#94A3B8' }}>+{authorBooks.length - 2}</span>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: '14px', fontWeight: 800, color: '#2563EB' }}>
                        {minutes.toLocaleString()} мин
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>
                          ≈ {(minutes / 60).toFixed(1)} сағат
                        </div>
                      </td>

                      <td style={{ padding: '14px', fontWeight: 700, color: '#64748B' }}>
                        {previewRatePerMinute} ₸
                      </td>

                      <td style={{ padding: '14px' }}>
                        <div style={{ fontSize: '16px', fontWeight: 900, color: '#16A34A' }}>
                          {formatCurrencyWithDecimals(earned)} ₸
                        </div>
                      </td>

                      <td style={{ padding: '14px' }}>
                        {isPaid ? (
                          <span
                            style={{
                              background: '#DCFCE7',
                              color: '#16A34A',
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
                              background: '#FEF3C7',
                              color: '#D97706',
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
                            border: '1.5px solid #BFDBFE',
                            background: '#EFF6FF',
                            color: 'var(--blue)',
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
  );
};
