import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { usePromoStore } from '../../store/usePromoStore';
import { useToastStore } from '../../store/useToastStore';

export const PromoCodePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, role, isAuthenticated, openAuthModal } = useAuthStore();
  const { activatePromoCode, getUserActivatedPromos } = usePromoStore();
  const { showToast } = useToastStore();

  const [inputCode, setInputCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activatedReward, setActivatedReward] = useState<string | null>(null);

  // Authentication protection: only registered readers can access promo codes
  useEffect(() => {
    if (!isAuthenticated || !user) {
      showToast('Промокодты белсендіру үшін алдымен тіркеліңіз немесе жүйеге кіріңіз!', 'info');
      openAuthModal('signup');
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, user, navigate, openAuthModal, showToast]);

  const activatedList = user ? getUserActivatedPromos(user.id) : [];

  if (!isAuthenticated || !user) {
    return null;
  }

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !user) {
      showToast('Промокодты белсендіру үшін жүйеге кіріңіз', 'info');
      openAuthModal('login');
      return;
    }

    if (!inputCode.trim()) {
      showToast('Промокодты енгізіңіз', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = activatePromoCode(inputCode, user);
      if (res.success) {
        const reward = res.rewardTitle || 'Сыйлық';
        setActivatedReward(reward);
        showToast(`Құттықтаймыз! «${reward}» сәтті белсендірілді!`, 'success');
        setInputCode('');
      } else {
        showToast(res.error || 'Промокодты белсендіру сәтсіз аяқталды', 'error');
      }
    } catch {
      showToast('Қате орын алды. Қайта көріңіз', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '840px', margin: '40px auto 80px', padding: '0 24px' }}>
      
      {/* Top back button */}
      <div style={{ marginBottom: '24px' }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-mid)',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          ← Артқа оралу
        </button>
      </div>

      {/* Main Activation Card */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '24px',
          padding: '40px 36px',
          border: '1.5px solid #E2E8F0',
          boxShadow: '0 10px 30px rgba(0, 45, 80, 0.05)',
          marginBottom: '28px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative corner background */}
        <div
          style={{
            position: 'absolute',
            top: '-40px',
            right: '-40px',
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(239, 126, 0, 0.12) 0%, rgba(0, 84, 148, 0.04) 70%, transparent 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* Card Header */}
        <div style={{ marginBottom: '28px', position: 'relative' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--orange)', fontSize: '12px', fontWeight: 800, marginBottom: '10px', letterSpacing: '0.04em' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
              <line x1="7" y1="7" x2="7.01" y2="7"></line>
            </svg>
            АРНАЙЫ ҰСЫНЫС
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 900, color: 'var(--text-dark)', margin: 0, letterSpacing: '-0.02em' }}>
            Промокодты белсендіру
          </h1>
        </div>

        {/* Promocode Activation Form */}
        <form onSubmit={handleActivate} style={{ marginBottom: '24px' }}>
          <div
            style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'stretch',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: '1 1 280px', position: 'relative' }}>
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                placeholder="Промокодты жазыңыз"
                style={{
                  width: '100%',
                  height: '52px',
                  padding: '0 18px 0 46px',
                  borderRadius: '14px',
                  border: '2px solid #CBD5E1',
                  fontSize: '15px',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  background: '#F8FAFC',
                  color: 'var(--text-dark)',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'all 0.2s',
                  textTransform: 'uppercase',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--blue)';
                  e.currentTarget.style.background = '#FFFFFF';
                  e.currentTarget.style.boxShadow = '0 0 0 4px rgba(0, 84, 148, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#CBD5E1';
                  e.currentTarget.style.background = '#F8FAFC';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--blue)',
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                  <line x1="7" y1="7" x2="7.01" y2="7"></line>
                </svg>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !inputCode.trim()}
              className="btn-primary"
              style={{
                height: '52px',
                padding: '0 28px',
                borderRadius: '14px',
                fontSize: '14px',
                fontWeight: 800,
                background: 'linear-gradient(135deg, var(--blue) 0%, #003B6D 100%)',
                opacity: isSubmitting || !inputCode.trim() ? 0.6 : 1,
                cursor: isSubmitting || !inputCode.trim() ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 14px rgba(0, 84, 148, 0.25)',
              }}
            >
              {isSubmitting ? 'Тексерілуде...' : 'Қолдану'}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        </form>

        {/* Success Banner if just activated */}
        {activatedReward && (
          <div
            style={{
              padding: '16px 20px',
              borderRadius: '14px',
              background: '#ECFDF5',
              border: '1.5px solid #A7F3D0',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: '#10B981',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 800, color: '#065F46', fontSize: '14px' }}>
                Құттықтаймыз! Промокод сәтті іске қосылды
              </div>
              <div style={{ color: '#047857', fontSize: '13px', marginTop: '2px' }}>
                Сізге берілген сыйлық: <strong>{activatedReward}</strong>. Барлық кітаптар мен аудиоларды толықтай пайдалана аласыз!
              </div>
            </div>
          </div>
        )}

        {/* User's Activated Promos Section */}
        {isAuthenticated && activatedList.length > 0 && (
          <div style={{ marginTop: '28px', paddingTop: '24px', borderTop: '1.5px solid #F1F5F9' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-dark)', margin: '0 0 14px 0' }}>
              Сіздің белсенді промокодтарыңыз:
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {activatedList.map((p) => {
                const now = Date.now();
                const usage = user?.id ? p.usedBy?.find((u) => u.userId === user.id) : null;
                let expiryMs: number;
                if (usage && usage.usedAt && p.durationDays) {
                  expiryMs = new Date(usage.usedAt).getTime() + p.durationDays * 24 * 60 * 60 * 1000;
                } else if (p.expiresAt) {
                  expiryMs = new Date(p.expiresAt).getTime();
                } else {
                  expiryMs = now + (p.durationDays || 30) * 24 * 60 * 60 * 1000;
                }
                const diffMs = expiryMs - now;
                const daysRemaining = diffMs > 0 ? Math.ceil(diffMs / (24 * 60 * 60 * 1000)) : 0;

                return (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 18px',
                      borderRadius: '12px',
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      flexWrap: 'wrap',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontWeight: 800,
                          fontSize: '13px',
                          color: 'var(--blue)',
                          background: 'rgba(0, 84, 148, 0.08)',
                          padding: '4px 10px',
                          borderRadius: '6px',
                        }}
                      >
                        {p.code}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)' }}>
                        {p.rewardTitle}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '20px',
                        background: '#D1FAE5',
                        color: '#047857',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }}></span>
                      {daysRemaining > 0 ? `Белсенді (${daysRemaining} күн қалды)` : 'Мерзімі аяқталды'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* Info / FAQ Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #E2E8F0',
          }}
        >
          <div style={{ color: 'var(--blue)', marginBottom: '10px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"></path>
              <path d="M6 6h10"></path>
              <path d="M6 10h10"></path>
            </svg>
          </div>
          <h4 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-dark)', margin: '0 0 6px 0' }}>
            Премиум кітаптар
          </h4>
          <p style={{ fontSize: '13px', color: 'var(--text-mid)', margin: 0, lineHeight: 1.5 }}>
            Промокод арқылы сайттағы барлық ақылы кітаптар мен жаңа басылымдарды тегін оқи аласыз.
          </p>
        </div>

        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #E2E8F0',
          }}
        >
          <div style={{ color: 'var(--orange)', marginBottom: '10px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 18v-6a9 9 0 0 1 18 0v6"></path>
              <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path>
            </svg>
          </div>
          <h4 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-dark)', margin: '0 0 6px 0' }}>
            Аудиокітаптар қоры
          </h4>
          <p style={{ fontSize: '13px', color: 'var(--text-mid)', margin: 0, lineHeight: 1.5 }}>
            Кәсіби дикторлар дыбыстаған аудиокітаптарды фондық режимде шектеусіз тыңдау мүмкіндігі.
          </p>
        </div>

        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #E2E8F0',
          }}
        >
          <div style={{ color: '#10B981', marginBottom: '10px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
          </div>
          <h4 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-dark)', margin: '0 0 6px 0' }}>
            Жылдам белсендіру
          </h4>
          <p style={{ fontSize: '13px', color: 'var(--text-mid)', margin: 0, lineHeight: 1.5 }}>
            Промокод енгізілген сәттен бастап сіздің аккаунтыңызға сыйлық бірден қосылады.
          </p>
        </div>
      </div>

    </div>
  );
};
