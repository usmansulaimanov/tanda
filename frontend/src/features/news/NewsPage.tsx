import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNewsStore } from '../../store/useNewsStore';
import { NewsImageCarousel } from '../../components/news/NewsImageCarousel';
import { NewsArticle } from '../../types';

const NewsArticleCard: React.FC<{
  article: NewsArticle;
  formatDate: (d: string) => string;
}> = ({ article, formatDate }) => {
  const [isHovered, setIsHovered] = useState(false);

  const cardImages =
    article.images && article.images.length > 0
      ? article.images
      : article.imageUrl
      ? [article.imageUrl]
      : [];

  return (
    <article
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: '#FFFFFF',
        borderRadius: '18px',
        overflow: 'hidden',
        border: isHovered ? '1px solid #BFDBFE' : '1px solid #E2E8F0',
        boxShadow: isHovered
          ? '0 12px 30px rgba(0, 87, 168, 0.12)'
          : '0 4px 16px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Cover Image / Hover-activated 2s Carousel */}
      <div style={{ position: 'relative', height: '200px' }}>
        <Link
          to={`/news/${article.id}`}
          style={{
            display: 'block',
            height: '100%',
            textDecoration: 'none',
          }}
        >
          {cardImages.length > 0 ? (
            <NewsImageCarousel
              images={cardImages}
              alt={article.title}
              height="200px"
              maxHeight="200px"
              borderRadius="0"
              autoPlayInterval={2000}
              playOnHoverOnly={true}
              isHovered={isHovered}
              showArrows={false}
              showDots={cardImages.length > 1}
              showCounter={false}
            />
          ) : (
            <div
              style={{
                height: '100%',
                background: 'linear-gradient(135deg, #0057A8 0%, #1E40AF 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255, 255, 255, 0.8)',
              }}
            >
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 13a2 2 0 0 1-2-2V7m2 13a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path>
              </svg>
            </div>
          )}
        </Link>

        {/* Date badge on image */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            zIndex: 15,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            color: '#FFFFFF',
            fontSize: '11px',
            fontWeight: 700,
            padding: '3px 9px',
            borderRadius: '20px',
            pointerEvents: 'none',
          }}
        >
          {formatDate(article.publishedAt)}
        </div>
      </div>

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
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
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
              <span>{article.linkText || 'Сілтеме'}</span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </a>
          )}
        </div>
      </div>
    </article>
  );
};

export const NewsPage: React.FC = () => {
  const { getPublishedArticles, fetchArticles } = useNewsStore();

  React.useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

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
          <h1
            style={{
              fontSize: '34px',
              fontWeight: 900,
              margin: '0 0 24px 0',
              letterSpacing: '-0.5px',
              lineHeight: 1.25,
            }}
          >
            Жаңалықтар мен мақалалар
          </h1>

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
              <NewsArticleCard
                key={article.id}
                article={article}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
