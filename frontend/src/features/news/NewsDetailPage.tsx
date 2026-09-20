import React, { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useNewsStore } from '../../store/useNewsStore';
import { useAuthStore } from '../../store/useAuthStore';
import { NewsImageCarousel } from '../../components/news/NewsImageCarousel';

export const NewsDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getArticleById, incrementViews, getPublishedArticles } = useNewsStore();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const article = id ? getArticleById(id) : undefined;
  const isScheduled = article
    ? article.isPublished &&
      Boolean(
        (article.scheduledAt && new Date(article.scheduledAt).getTime() > Date.now()) ||
        new Date(article.publishedAt).getTime() > Date.now()
      )
    : false;
  const isAccessible = article && ((article.isPublished && !isScheduled) || isAdmin);

  const recentArticles = getPublishedArticles().filter((a) => a.id !== id).slice(0, 3);

  useEffect(() => {
    if (id && isAccessible && !isScheduled) {
      incrementViews(id);
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [id, incrementViews, isAccessible, isScheduled]);

  if (!article || !isAccessible) {
    return (
      <div style={{ maxWidth: '700px', margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            padding: '48px 24px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#FEF2F2',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '10px' }}>
            Мақала табылмады
          </h2>
          <p style={{ color: 'var(--text-mid)', fontSize: '14px', marginBottom: '24px' }}>
            Бұл жаңалық өшірілген немесе сілтемесі қате көрсетілген болуы мүмкін.
          </p>
          <Link
            to="/news"
            className="btn-primary"
            style={{ padding: '12px 28px', fontSize: '14px', textDecoration: 'none' }}
          >
            ← Жаңалықтарға оралу
          </Link>
        </div>
      </div>
    );
  }

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
    <div style={{ background: '#F8FAFC', minHeight: '85vh', padding: '36px 20px 80px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Top Back Navigation */}
        <div style={{ marginBottom: '20px' }}>
          <button
            type="button"
            onClick={() => navigate('/news')}
            style={{
              background: '#FFFFFF',
              border: '1.5px solid #CBD5E1',
              borderRadius: '50px',
              padding: '8px 18px',
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--text-mid)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--blue)';
              e.currentTarget.style.color = 'var(--blue)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#CBD5E1';
              e.currentTarget.style.color = 'var(--text-mid)';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Барлық жаңалықтарға оралу
          </button>
        </div>

        {/* Admin Preview Banner */}
        {isAdmin && (!article.isPublished || isScheduled) && (
          <div
            style={{
              padding: '12px 18px',
              borderRadius: '12px',
              background: isScheduled ? '#EFF6FF' : '#FFFBEB',
              border: `1.5px solid ${isScheduled ? '#BFDBFE' : '#FDE68A'}`,
              color: isScheduled ? 'var(--blue)' : '#B45309',
              fontSize: '13px',
              fontWeight: 700,
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
            }}
          >
            <span>
              {isScheduled
                ? `⏰ Әкімші режимі: Бұл мақала жоспарланған (сайтта ${formatDate(article.publishedAt)} күні автоматты түрде жарияланады).`
                : '📝 Әкімші режимі: Бұл мақала черновикте сақталған (оқырмандарға көрінбейді).'}
            </span>
            <Link
              to={`/admin/news/${article.id}/edit`}
              style={{
                color: 'inherit',
                textDecoration: 'underline',
                fontSize: '12px',
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              Өңдеуге өту
            </Link>
          </div>
        )}

        {/* Article Container Card */}
        <article
          style={{
            background: '#FFFFFF',
            borderRadius: '24px',
            overflow: 'hidden',
            border: '1px solid #E2E8F0',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.04)',
            padding: '40px',
          }}
        >
          {/* Metadata badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '18px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: '20px',
                background: 'rgba(0, 87, 168, 0.08)',
                color: 'var(--blue)',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              {formatDate(article.publishedAt)}
            </span>

            {article.authorName && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  borderRadius: '20px',
                  background: '#F1F5F9',
                  color: 'var(--text-mid)',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                Автор: <strong>{article.authorName}</strong>
              </span>
            )}
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 900,
              color: 'var(--text-dark)',
              margin: '0 0 24px 0',
              lineHeight: 1.3,
              letterSpacing: '-0.3px',
            }}
          >
            {article.title}
          </h1>

          {/* Main Image Carousel (Auto-rotating multiple images with dots, arrows & thumbnails) */}
          {(() => {
            const articleImages = article.images && article.images.length > 0
              ? article.images
              : (article.imageUrl ? [article.imageUrl] : []);
            if (articleImages.length === 0) return null;

            return (
              <div style={{ marginBottom: '32px' }}>
                <NewsImageCarousel
                  images={articleImages}
                  alt={article.title}
                  height="460px"
                  maxHeight="520px"
                  borderRadius="16px"
                  autoPlayInterval={3500}
                  showArrows={true}
                  showDots={true}
                  showCounter={true}
                  showThumbnails={articleImages.length > 1}
                />
              </div>
            );
          })()}

          {/* Article Body Content */}
          <div
            style={{
              fontSize: '16px',
              lineHeight: 1.8,
              color: '#334155',
              whiteSpace: 'pre-line',
            }}
          >
            {article.content}
          </div>

          {/* Link button if present */}
          {article.linkUrl && (
            <div
              style={{
                marginTop: '36px',
                paddingTop: '24px',
                borderTop: '1.5px solid #F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <span style={{ fontSize: '13px', color: 'var(--text-mid)', fontWeight: 600 }}>
                  Қосымша мәлімет / сілтеме:
                </span>
              </div>
              <a
                href={article.linkUrl}
                target={article.linkUrl.startsWith('http') ? '_blank' : undefined}
                rel={article.linkUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="btn-primary"
                style={{
                  padding: '12px 24px',
                  borderRadius: '50px',
                  fontSize: '14px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>{article.linkText || 'Сілтемеге өту'}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
            </div>
          )}
        </article>

        {/* Recent News Recommendations */}
        {recentArticles.length > 0 && (
          <div style={{ marginTop: '48px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '18px' }}>
              Басқа жаңалықтар
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              {recentArticles.map((rec) => (
                <Link
                  key={rec.id}
                  to={`/news/${rec.id}`}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '16px',
                    padding: '18px 20px',
                    border: '1px solid #E2E8F0',
                    textDecoration: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--blue)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#E2E8F0';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ fontSize: '11px', color: 'var(--blue)', fontWeight: 700, marginBottom: '6px' }}>
                    {formatDate(rec.publishedAt)}
                  </div>
                  <h4 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-dark)', margin: 0, lineHeight: 1.4 }}>
                    {rec.title}
                  </h4>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
