import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNewsStore } from '../../store/useNewsStore';

export const NewsPage: React.FC = () => {
  const { getPublishedArticles } = useNewsStore();
  const articles = getPublishedArticles();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredArticles = articles.filter((a) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q);
  });

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}.${month}.${year}`;
    } catch {
      return isoString;
    }
  };

  return (
    <div style={{ minHeight: '80vh', paddingBottom: '80px', background: '#F8FAFC' }}>
      {/* Hero Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0057A8 0%, #0A3663 100%)',
          color: '#FFFFFF',
          padding: '60px 24px 50px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ maxWidth: '800px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 16px',
              borderRadius: '30px',
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(8px)',
              fontSize: '13px',
              fontWeight: 700,
              marginBottom: '16px',
              letterSpacing: '0.5px',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 13a2 2 0 0 1-2-2V7m2 13a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path>
            </svg>
            TANDA ЖАҢАЛЫҚТАРЫ
          </div>

          <h1
            style={{
              fontSize: '34px',
              fontWeight: 900,
              margin: '0 0 14px 0',
              letterSpacing: '-0.5px',
              lineHeight: 1.25,
            }}
          >
            Жаңалықтар мен мақалалар
          </h1>

          <p
            style={{
              fontSize: '16px',
              color: 'rgba(255, 255, 255, 0.85)',
              margin: '0 auto 28px',
              maxWidth: '560px',
              lineHeight: 1.6,
            }}
          >
            Tanda платформасының соңғы хабарландырулары, әдеби жаңалықтар және пайдалы мақалалар
          </p>

          {/* Search Box */}
          <div style={{ maxWidth: '440px', margin: '0 auto', position: 'relative' }}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94A3B8',
              }}
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Жаңалықтардан іздеу..."
              style={{
                width: '100%',
                padding: '12px 18px 12px 46px',
                borderRadius: '50px',
                border: 'none',
                fontSize: '14px',
                background: '#FFFFFF',
                color: 'var(--text-dark)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                outline: 'none',
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div style={{ maxWidth: '1120px', margin: '-24px auto 0', padding: '0 24px', position: 'relative', zIndex: 10 }}>
        {filteredArticles.length === 0 ? (
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '60px 24px',
              textAlign: 'center',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
              border: '1px solid #E2E8F0',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#F1F5F9',
                color: '#64748B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 13a2 2 0 0 1-2-2V7m2 13a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path>
              </svg>
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '8px' }}>
              {searchQuery ? 'Іздеу бойынша ешқандай жаңалық табылмады' : 'Әзірге жаңалықтар жарияланбады'}
            </h3>
            <p style={{ color: 'var(--text-mid)', fontSize: '14px', margin: 0 }}>
              {searchQuery ? 'Басқа сөздерді іздеп көріңіз' : 'Жақын арада жаңа мақалалар мен хабарландырулар қосылады'}
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '24px',
            }}
          >
            {filteredArticles.map((article) => (
              <article
                key={article.id}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '18px',
                  overflow: 'hidden',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 12px 30px rgba(0, 87, 168, 0.12)';
                  e.currentTarget.style.borderColor = '#BFDBFE';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.04)';
                  e.currentTarget.style.borderColor = '#E2E8F0';
                }}
              >
                {/* Cover Image */}
                <Link
                  to={`/news/${article.id}`}
                  style={{
                    display: 'block',
                    height: '200px',
                    background: article.imageUrl ? '#F1F5F9' : 'linear-gradient(135deg, #0057A8 0%, #1E40AF 100%)',
                    position: 'relative',
                    overflow: 'hidden',
                    textDecoration: 'none',
                  }}
                >
                  {article.imageUrl ? (
                    <img
                      src={article.imageUrl}
                      alt={article.title}
                      referrerPolicy="no-referrer"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'transform 0.3s ease',
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'rgba(255, 255, 255, 0.8)',
                      }}
                    >
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 13a2 2 0 0 1-2-2V7m2 13a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path>
                      </svg>
                    </div>
                  )}

                  {/* Date badge on image */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '14px',
                      left: '14px',
                      background: 'rgba(15, 23, 42, 0.75)',
                      backdropFilter: 'blur(6px)',
                      color: '#FFFFFF',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '20px',
                    }}
                  >
                    {formatDate(article.publishedAt)}
                  </div>
                </Link>

                {/* Content */}
                <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <Link
                    to={`/news/${article.id}`}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <h2
                      style={{
                        fontSize: '18px',
                        fontWeight: 800,
                        color: 'var(--text-dark)',
                        margin: '0 0 10px 0',
                        lineHeight: 1.35,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                      title={article.title}
                    >
                      {article.title}
                    </h2>
                  </Link>

                  <p
                    style={{
                      fontSize: '13px',
                      color: 'var(--text-mid)',
                      lineHeight: 1.55,
                      margin: '0 0 18px 0',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      flex: 1,
                    }}
                  >
                    {article.summary || article.content}
                  </p>

                  {/* Card Footer Actions */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: '14px',
                      borderTop: '1px solid #F1F5F9',
                    }}
                  >
                    <Link
                      to={`/news/${article.id}`}
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: 'var(--blue)',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      Толық оқу
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    </Link>

                    {article.linkUrl && (
                      <a
                        href={article.linkUrl}
                        target={article.linkUrl.startsWith('http') ? '_blank' : undefined}
                        rel={article.linkUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#64748B',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          background: '#F1F5F9',
                          borderRadius: '8px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {article.linkText || 'Сілтеме'}
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                          <polyline points="15 3 21 3 21 9"></polyline>
                          <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
