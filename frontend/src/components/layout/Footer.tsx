import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  const [modalType, setModalType] = useState<'privacy' | 'terms' | null>(null);

  const socialLinks = [
    {
      name: 'Instagram',
      url: 'https://instagram.com/tandamen',
      handle: '@tandamen',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect>
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
          <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line>
        </svg>
      ),
    },
    {
      name: 'Telegram',
      url: 'https://t.me/tandamen',
      handle: '@tandamen',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m22 2-7 20-4-9-9-4Z"></path>
          <path d="M22 2 11 13"></path>
        </svg>
      ),
    },
    {
      name: 'TikTok',
      url: 'https://tiktok.com/@tandamen',
      handle: '@tandamen',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path>
        </svg>
      ),
    },
    {
      name: 'YouTube',
      url: 'https://youtube.com/@tandamen',
      handle: '@tandamen',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"></path>
          <polygon points="10 15 15 12 10 9 10 15"></polygon>
        </svg>
      ),
    },
  ];

  return (
    <footer className="tanda-footer" style={{ background: '#071526', color: '#94A3B8', padding: '56px 24px 32px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Main Grid: 4 columns */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '36px',
            marginBottom: '44px',
          }}
        >
          {/* Column 1: Brand & Description & Email */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <span style={{ fontWeight: 900, color: '#FFFFFF', fontSize: '22px', letterSpacing: '-0.02em' }}>
                tanda<span style={{ color: 'var(--orange)' }}>.</span>
              </span>
            </div>
            <p style={{ fontSize: '13px', lineHeight: 1.6, color: '#94A3B8', marginBottom: '20px', maxWidth: '300px' }}>
              Қазақ тіліндегі аудио және электронды кітаптардың заманауи онлайн платформасы. Сүйікті шығармаларыңызды оқып, кез келген жерде тыңдаңыз.
            </p>

            {/* Email Contact Box */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748B', fontWeight: 700 }}>
                Байланыс және қолдау:
              </span>
              <a
                href="mailto:tandamenapp@gmail.com"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#F8FAFC',
                  fontSize: '13px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  padding: '2px 0',
                  transition: 'color 0.2s ease',
                  width: 'fit-content',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--orange)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#F8FAFC';
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--orange)' }}>
                  <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                </svg>
                tandamenapp@gmail.com
              </a>
            </div>
          </div>

          {/* Column 2: Quick Navigation */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.04em', textTransform: 'uppercase', margin: '0 0 16px 0' }}>
              Навигация
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li>
                <Link
                  to="/catalog"
                  style={{ color: '#94A3B8', fontSize: '13px', textDecoration: 'none', fontWeight: 600, transition: 'color 0.2s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
                >
                  Кітаптар каталогы
                </Link>
              </li>
              <li>
                <Link
                  to="/catalog"
                  style={{ color: '#94A3B8', fontSize: '13px', textDecoration: 'none', fontWeight: 600, transition: 'color 0.2s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
                >
                  Аудиокітаптар қоры
                </Link>
              </li>
              <li>
                <Link
                  to="/quotes"
                  style={{ color: '#94A3B8', fontSize: '13px', textDecoration: 'none', fontWeight: 600, transition: 'color 0.2s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
                >
                  Кітаптан үзінділер
                </Link>
              </li>
              <li>
                <Link
                  to="/my-books"
                  style={{ color: '#94A3B8', fontSize: '13px', textDecoration: 'none', fontWeight: 600, transition: 'color 0.2s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
                >
                  Менің сөрем
                </Link>
              </li>
              <li>
                <Link
                  to="/promo"
                  style={{ color: '#94A3B8', fontSize: '13px', textDecoration: 'none', fontWeight: 600, transition: 'color 0.2s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
                >
                  Промокодты белсендіру
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Security & Privacy */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.04em', textTransform: 'uppercase', margin: '0 0 16px 0' }}>
              Қауіпсіздік
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li>
                <button
                  type="button"
                  onClick={() => setModalType('privacy')}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: '#94A3B8',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
                >
                  Құпиялылық саясаты
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setModalType('terms')}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: '#94A3B8',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
                >
                  Пайдалану шарттары
                </button>
              </li>
              <li style={{ marginTop: '6px' }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    color: '#10B981',
                    background: 'rgba(16, 185, 129, 0.1)',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  </svg>
                  256-bit SSL Қауіпсіз байланыс
                </div>
              </li>
            </ul>
          </div>

          {/* Column 4: Social Channels */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.04em', textTransform: 'uppercase', margin: '0 0 16px 0' }}>
              Әлеуметтік желілер
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {socialLinks.map((item) => (
                <a
                  key={item.name}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '7px 12px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#E2E8F0',
                    textDecoration: 'none',
                    fontSize: '13px',
                    fontWeight: 600,
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.color = '#FFFFFF';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.color = '#E2E8F0';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: 'var(--orange)', display: 'flex', alignItems: 'center' }}>
                      {item.icon}
                    </span>
                    <span>{item.name}</span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>
                    {item.handle}
                  </span>
                </a>
              ))}
            </div>
          </div>

        </div>

        {/* Footer Bottom Bar */}
        <div
          style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '13px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ color: '#64748B' }}>
            &copy; {new Date().getFullYear()} <strong style={{ color: '#94A3B8' }}>tanda.kz</strong>. Барлық құқықтар қорғалған.
          </div>
          <div style={{ color: '#64748B', fontSize: '12px' }}>
            Қазақстанның кітап сүйер қауымына арналған 🇰🇿
          </div>
        </div>

      </div>

      {/* Security & Privacy Modal Dialog */}
      {modalType && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 9999,
          }}
          onClick={() => setModalType(null)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '32px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
              position: 'relative',
              color: 'var(--text-dark)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setModalType(null)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
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
                fontSize: '16px',
                fontWeight: 800,
              }}
            >
              ✕
            </button>

            {modalType === 'privacy' ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--blue)', marginBottom: '12px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  </svg>
                  <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>Құпиялылық саясаты</h3>
                </div>
                <div style={{ fontSize: '13px', lineHeight: 1.7, color: '#475569' }}>
                  <p>
                    <strong>Tanda платформасы</strong> әрбір оқырманның жеке деректерінің қауіпсіздігі мен құпиялылығын толық қамтамасыз етеді.
                  </p>
                  <p>
                    1. <strong>Жиналатын ақпарат:</strong> Тіркелу кезінде көрсетілген есіміңіз, электронды поштаңыз және оқу тарихыңыз тек платформаның қызметін жақсарту мақсатында қолданылады.
                  </p>
                  <p>
                    2. <strong>Деректерді қорғау:</strong> Барлық ақпарат қауіпсіз шифрланған протоколдар (SSL/TLS) арқылы сақталады және үшінші тұлғаларға ешқандай жағдайда берілмейді.
                  </p>
                  <p>
                    3. <strong>Сұрақтар бойынша:</strong> Құпиялылыққа қатысты сұрақтарыңыз болса, <strong>tandamenapp@gmail.com</strong> поштасына хабарласа аласыз.
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--orange)', marginBottom: '12px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                  <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>Пайдалану шарттары</h3>
                </div>
                <div style={{ fontSize: '13px', lineHeight: 1.7, color: '#475569' }}>
                  <p>
                    <strong>Tanda онлайн кітапханасын</strong> пайдалану арқылы сіз келесі шарттармен келісесіз:
                  </p>
                  <p>
                    1. <strong>Авторлық құқық:</strong> Платформадағы барлық аудио және электронды кітаптар авторлардың және баспалардың рұқсатымен орналастырылған. Кітаптарды үшінші тарапқа көшіруге және заңсыз таратуға тыйым салынады.
                  </p>
                  <p>
                    2. <strong>Қолдану ережесі:</strong> Жеке аккаунт бір оқырманға арналған. Сүйікті кітаптарыңызды онлайн оқып, тыңдай аласыз.
                  </p>
                  <p>
                    3. <strong>Қолдау қызметі:</strong> Платформа жұмысына байланысты барлық ұсыныстар мен сұрақтар бойынша <strong>tandamenapp@gmail.com</strong> поштасы арқылы көмек ала аласыз.
                  </p>
                </div>
              </div>
            )}

            <div style={{ marginTop: '24px', textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="btn-primary"
                style={{ padding: '8px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700 }}
              >
                Түсінікті
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};
