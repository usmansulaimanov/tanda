import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useNewsStore } from '../../store/useNewsStore';
import { useToastStore } from '../../store/useToastStore';
import { NewsArticle } from '../../types';
import { Search, Plus, Eye, Edit, Trash2 } from 'lucide-react';

export const AdminNewsPage: React.FC = () => {
  const { articles, deleteArticle } = useNewsStore();
  const { showToast } = useToastStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft'>('all');
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [articleToDelete, setArticleToDelete] = useState<NewsArticle | null>(null);

  const filteredArticles = useMemo(() => {
    return articles.filter((a) => {
      if (filterStatus === 'published' && !a.isPublished) return false;
      if (filterStatus === 'draft' && a.isPublished) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q);
    });
  }, [articles, filterStatus, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredArticles.length / pageSize));

  React.useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, searchQuery, pageSize]);

  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedArticles = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredArticles.slice(start, start + pageSize);
  }, [filteredArticles, currentPage, pageSize]);

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

  const confirmDelete = async () => {
    if (!articleToDelete) return;
    const res = await deleteArticle(articleToDelete.id);
    if (res.success) {
      showToast('Жаңалық сәтті өшірілді', 'info');
      setArticleToDelete(null);
    } else {
      showToast(res.error || 'Өшіру мүмкін болмады', 'error');
    }
  };

  const publishedCount = articles.filter((a) => a.isPublished).length;
  const draftCount = articles.filter((a) => !a.isPublished).length;

  return (
    <section className="admin-page-section" id="admin-news-section" style={{ minHeight: '85vh', paddingBottom: '80px' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 20px' }}>
        <div className="admin-card">
          {/* Header */}
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
              <h1 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-dark)', margin: 0 }}>
                Жаңалықтар мен мақалалар ({articles.length})
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--text-mid)', marginTop: '4px', margin: 0 }}>
                Жарияланған: <span style={{ fontWeight: 700, color: '#16A34A' }}>{publishedCount}</span> | Қаралама: <span style={{ fontWeight: 700, color: '#64748B' }}>{draftCount}</span>
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              {/* Search input */}
              <div style={{ position: 'relative', minWidth: '240px' }}>
                <input
                  type="text"
                  placeholder="Жаңалықты іздеу..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: '8px 12px 8px 34px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '13px',
                    background: '#FFFFFF',
                    color: 'var(--text-dark)',
                    outline: 'none',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                />
                <Search
                  size={15}
                  color="#94A3B8"
                  style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                />
              </div>

              {/* Status Filters */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setFilterStatus('all')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: filterStatus === 'all' ? '#FFFFFF' : '#64748B',
                    background: filterStatus === 'all' ? 'var(--blue)' : '#F1F5F9',
                    padding: '7px 14px',
                    borderRadius: '6px',
                    border: `1.5px solid ${filterStatus === 'all' ? 'var(--blue)' : '#CBD5E1'}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  Барлығы ({articles.length})
                </button>

                <button
                  type="button"
                  onClick={() => setFilterStatus('published')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#047857',
                    background: filterStatus === 'published' ? '#D1FAE5' : '#ECFDF5',
                    padding: '7px 14px',
                    borderRadius: '6px',
                    border: '1.5px solid #A7F3D0',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }}></span>
                  Жарияланған ({publishedCount})
                </button>

                <button
                  type="button"
                  onClick={() => setFilterStatus('draft')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#64748B',
                    background: filterStatus === 'draft' ? '#E2E8F0' : '#F1F5F9',
                    padding: '7px 14px',
                    borderRadius: '6px',
                    border: '1.5px solid #CBD5E1',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#94A3B8' }}></span>
                  Қаралама ({draftCount})
                </button>
              </div>

              {/* Add News Button -> Navigates to dedicated page */}
              <Link
                to="/admin/news/new"
                className="btn-primary"
                style={{
                  textDecoration: 'none',
                  padding: '10px 22px',
                  fontSize: '13px',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(240,128,0,0.25)',
                }}
              >
                <Plus size={16} />
                Жаңалық жариялау
              </Link>
            </div>
          </div>

          {/* Table / List */}
          {filteredArticles.length === 0 ? (
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                padding: '48px 24px',
                textAlign: 'center',
                border: '1px dashed #CBD5E1',
                color: 'var(--text-mid)',
              }}
            >
              <p style={{ margin: 0, fontSize: '14px' }}>
                {searchQuery
                  ? 'Іздеу бойынша жаңалық табылмады'
                  : 'Әзірге жаңалықтар жоқ. «Жаңалық жариялау» батырмасын басып жаңасын қосыңыз.'}
              </p>
            </div>
          ) : (
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
                overflow: 'hidden',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {paginatedArticles.map((article, index) => {
                  const itemIndex = (currentPage - 1) * pageSize + index + 1;
                  return (
                    <div
                      key={article.id}
                      style={{
                        padding: '18px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '16px',
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#FFFFFF')}
                    >
                      {/* Left: Index + Image + Info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#94A3B8', minWidth: '24px' }}>
                          {itemIndex}
                        </span>

                        {/* Thumbnail */}
                        <div
                          style={{
                            width: '84px',
                            height: '56px',
                            borderRadius: '8px',
                            background: '#F1F5F9',
                            overflow: 'hidden',
                            flexShrink: 0,
                            border: '1px solid #E2E8F0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {article.imageUrl ? (
                            <img
                              src={article.imageUrl}
                              alt={article.title}
                              referrerPolicy="no-referrer"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <span style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 700 }}>Суретсіз</span>
                          )}
                        </div>

                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '12px',
                                background: article.isPublished ? 'rgba(34, 197, 94, 0.1)' : '#F1F5F9',
                                color: article.isPublished ? '#16A34A' : '#64748B',
                              }}
                            >
                              {article.isPublished ? 'Жарияланған' : 'Қаралама'}
                            </span>
                            <span style={{ fontSize: '12px', color: 'var(--text-mid)' }}>
                              {formatDate(article.publishedAt)}
                            </span>
                            {article.authorName && (
                              <span style={{ fontSize: '12px', color: '#64748B' }}>
                                &bull; {article.authorName}
                              </span>
                            )}
                          </div>

                          <h3
                            style={{
                              fontSize: '15px',
                              fontWeight: 800,
                              color: 'var(--text-dark)',
                              margin: '0 0 4px 0',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={article.title}
                          >
                            {article.title}
                          </h3>

                          <p
                            style={{
                              fontSize: '12px',
                              color: 'var(--text-mid)',
                              margin: 0,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {article.summary || article.content}
                          </p>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <Link
                          to={`/news/${article.id}`}
                          target="_blank"
                          style={{
                            padding: '7px 12px',
                            borderRadius: '8px',
                            background: '#F1F5F9',
                            color: 'var(--text-dark)',
                            fontSize: '12px',
                            fontWeight: 700,
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Eye size={14} />
                          Көру
                        </Link>

                        {/* Dedicated Edit Page Link */}
                        <Link
                          to={`/admin/news/${article.id}/edit`}
                          style={{
                            padding: '7px 12px',
                            borderRadius: '8px',
                            background: '#EFF6FF',
                            border: '1px solid #BFDBFE',
                            color: 'var(--blue)',
                            fontSize: '12px',
                            fontWeight: 700,
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Edit size={14} />
                          Өңдеу
                        </Link>

                        <button
                          type="button"
                          onClick={() => setArticleToDelete(article)}
                          style={{
                            padding: '7px 12px',
                            borderRadius: '8px',
                            background: '#FEF2F2',
                            border: '1px solid #FECACA',
                            color: '#DC2626',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Trash2 size={14} />
                          Өшіру
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pagination controls */}
          {filteredArticles.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                marginTop: '20px',
                paddingTop: '16px',
                borderTop: '1.5px solid #F1F5F9',
              }}
            >
              {/* Page size selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
                  Беттегі жаңалық саны:
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'var(--text-dark)',
                    background: '#FFFFFF',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                  <option value={40}>40</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span style={{ fontSize: '13px', color: '#94A3B8', marginLeft: '6px' }}>
                  ({Math.min((currentPage - 1) * pageSize + 1, filteredArticles.length)}-
                  {Math.min(currentPage * pageSize, filteredArticles.length)} / Барлығы {filteredArticles.length})
                </span>
              </div>

              {/* Page navigation */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    background: currentPage === 1 ? '#F8FAFC' : '#FFFFFF',
                    color: currentPage === 1 ? '#94A3B8' : 'var(--text-dark)',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                  Алдыңғы
                </button>

                {/* Number buttons */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                  if (
                    totalPages > 7 &&
                    pageNum !== 1 &&
                    pageNum !== totalPages &&
                    Math.abs(pageNum - currentPage) > 1
                  ) {
                    if (pageNum === 2 && currentPage > 3) {
                      return (
                        <span key="dots-start" style={{ padding: '0 4px', color: '#94A3B8', fontSize: '12px' }}>
                          ...
                        </span>
                      );
                    }
                    if (pageNum === totalPages - 1 && currentPage < totalPages - 2) {
                      return (
                        <span key="dots-end" style={{ padding: '0 4px', color: '#94A3B8', fontSize: '12px' }}>
                          ...
                        </span>
                      );
                    }
                    return null;
                  }

                  const isActive = currentPage === pageNum;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      style={{
                        minWidth: '34px',
                        height: '34px',
                        padding: '0 8px',
                        borderRadius: '8px',
                        border: isActive ? '1.5px solid var(--blue)' : '1.5px solid #CBD5E1',
                        background: isActive ? 'var(--blue)' : '#FFFFFF',
                        color: isActive ? '#FFFFFF' : 'var(--text-dark)',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    background: currentPage === totalPages ? '#F8FAFC' : '#FFFFFF',
                    color: currentPage === totalPages ? '#94A3B8' : 'var(--text-dark)',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  Кейінгі
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {articleToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(13,27,42,0.7)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setArticleToDelete(null)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '32px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 24px 48px rgba(0,0,0,0.25)',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: '#FEE2E2',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <Trash2 size={26} />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-dark)', margin: '0 0 8px' }}>
              Жаңалықты өшіру
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-mid)', lineHeight: '1.5', margin: '0 0 24px' }}>
              «<strong>{articleToDelete.title}</strong>» жаңалығын өшіргіңіз келетініне сенімдісіз бе? Бұл әрекетті қайтару мүмкін емес.
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setArticleToDelete(null)}
                style={{
                  flex: 1,
                  padding: '11px',
                  borderRadius: '10px',
                  border: '1.5px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: 'var(--text-mid)',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Болдырмау
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                style={{
                  flex: 1,
                  padding: '11px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#DC2626',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(220,38,38,0.3)',
                }}
              >
                Өшіру
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
