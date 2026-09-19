import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useNewsStore } from '../../store/useNewsStore';
import { useToastStore } from '../../store/useToastStore';
import { useAuthStore } from '../../store/useAuthStore';
import { resizeAndCompressImage } from '../../utils/imageUtils';
import { ArrowLeft, Upload, X, Image as ImageIcon, Globe, FileText, CheckCircle2, Sparkles } from 'lucide-react';

export const AdminNewsFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { articles, addArticle, updateArticle, getArticleById } = useNewsStore();
  const { showToast } = useToastStore();
  const { user } = useAuthStore();

  const isEditing = Boolean(id);
  const existingArticle = id ? getArticleById(id) || articles.find((a) => a.id === id) : null;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [isPublished, setIsPublished] = useState(true);

  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (existingArticle) {
      setTitle(existingArticle.title);
      setContent(existingArticle.content);
      setSummary(existingArticle.summary || '');
      setImageUrl(existingArticle.imageUrl || '');
      setLinkUrl(existingArticle.linkUrl || '');
      setLinkText(existingArticle.linkText || '');
      setAuthorName(existingArticle.authorName || 'Tanda әкімшілігі');
      setIsPublished(existingArticle.isPublished);
    } else {
      setAuthorName(user?.name || 'Tanda әкімшілігі');
    }
  }, [existingArticle, user]);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setIsUploadingImage(true);
    try {
      const dataUrl = await resizeAndCompressImage(file, 1200, 0.85);
      setImageUrl(dataUrl);
      showToast('Мұқаба суреті сәтті жүктелді!', 'success');
    } catch {
      showToast('Суретті жүктеу кезінде қате орын алды', 'error');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const removeCoverImage = () => {
    setImageUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!title.trim()) {
      setFormError('Мақала тақырыбын енгізіңіз');
      return;
    }
    if (!content.trim()) {
      setFormError('Мақаланың толық мәтінін енгізіңіз');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && existingArticle) {
        const res = await updateArticle(existingArticle.id, {
          title: title.trim(),
          content: content.trim(),
          summary: summary.trim() || undefined,
          imageUrl: imageUrl.trim() || undefined,
          linkUrl: linkUrl.trim() || undefined,
          linkText: linkText.trim() || undefined,
          authorName: authorName.trim() || undefined,
          isPublished,
        });
        if (res.success) {
          showToast('Жаңалық сәтті жаңартылды!', 'success');
          navigate('/admin/news');
        } else {
          setFormError(res.error || 'Қате орын алды');
        }
      } else {
        const res = await addArticle({
          title: title.trim(),
          content: content.trim(),
          summary: summary.trim() || undefined,
          imageUrl: imageUrl.trim() || undefined,
          linkUrl: linkUrl.trim() || undefined,
          linkText: linkText.trim() || undefined,
          authorName: authorName.trim() || undefined,
          isPublished,
        });
        if (res.success) {
          showToast('Жаңалық сәтті жарияланды!', 'success');
          navigate('/admin/news');
        } else {
          setFormError(res.error || 'Қате орын алды');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="admin-page-section" style={{ minHeight: '85vh', paddingBottom: '80px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 20px' }}>
        {/* Navigation Breadcrumb / Back button */}
        <div style={{ marginBottom: '24px' }}>
          <Link
            to="/admin/news"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--blue)',
              textDecoration: 'none',
              padding: '8px 14px',
              background: '#FFFFFF',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              transition: 'all 0.15s ease',
            }}
          >
            <ArrowLeft size={16} />
            Жаңалықтар тізіміне қайту
          </Link>
        </div>

        {/* Page Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '28px',
          }}
        >
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 900, color: 'var(--text-dark)', margin: 0 }}>
              {isEditing ? 'Жаңалықты өңдеу' : 'Жаңа жаңалық жариялау'}
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-mid)', marginTop: '4px', margin: 0 }}>
              {isEditing
                ? 'Мақала мәліметтерін өзгертіп, қайта сақтаңыз'
                : 'Платформа оқырмандары үшін жаңа хабарландыру немесе мақала жазыңыз'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => navigate('/admin/news')}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                border: '1.5px solid #CBD5E1',
                background: '#FFFFFF',
                color: 'var(--text-mid)',
                cursor: 'pointer',
              }}
            >
              Болдырмау
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="btn-primary"
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              <CheckCircle2 size={16} />
              {isSubmitting
                ? 'Сақталуда...'
                : isEditing
                ? 'Өзгерістерді сақтау'
                : isPublished
                ? 'Платформаға жариялау'
                : 'Черновик ретінде сақтау'}
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {formError && (
          <div
            style={{
              padding: '12px 18px',
              borderRadius: '10px',
              background: '#FEF2F2',
              border: '1.5px solid #FCA5A5',
              color: '#B91C1C',
              fontSize: '13px',
              fontWeight: 700,
              marginBottom: '20px',
            }}
          >
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Main Card: Content */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '28px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.03)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'rgba(0, 87, 168, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--blue)',
                }}
              >
                <FileText size={20} />
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>
                Мақаланың негізгі мәліметтері
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Title */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '8px' }}>
                  Тақырыбы <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Мысалы: Платформада жаңа қазақ әдебиетінің аудиокітаптары жарық көрді"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '14px',
                    color: 'var(--text-dark)',
                    background: '#FFFFFF',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontWeight: 600,
                  }}
                  required
                />
              </div>

              {/* Excerpt / Summary */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '8px' }}>
                  Қысқаша мазмұны / Аңдатпа (Кіріспе)
                </label>
                <textarea
                  rows={2}
                  placeholder="Жаңалықтар тізімінде карточканың бетінде көрінетін қысқаша мәтін (толтырмасаңыз, автоматты алынады)..."
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '13px',
                    color: 'var(--text-dark)',
                    background: '#FFFFFF',
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Full Content */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>
                    Толық мақала мәтіні <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <span style={{ fontSize: '12px', color: '#94A3B8' }}>
                    {content.length} таңба
                  </span>
                </div>
                <textarea
                  rows={10}
                  placeholder="Мақаланың толық мазмұнын жазыңыз. Абзацтарды бөлуге және тізімдер қосуға болады..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '10px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    color: 'var(--text-dark)',
                    background: '#FFFFFF',
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                  required
                />
              </div>
            </div>
          </div>

          {/* Secondary Card: Media & Attachments */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '28px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.03)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'rgba(240, 128, 0, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--orange)',
                }}
              >
                <ImageIcon size={20} />
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>
                Мұқаба суреті және Медиа
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Image Preview & Upload */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '8px' }}>
                  Мұқаба суреті
                </label>

                {imageUrl ? (
                  <div
                    style={{
                      position: 'relative',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      border: '1.5px solid #CBD5E1',
                      height: '240px',
                      background: '#F1F5F9',
                      marginBottom: '12px',
                    }}
                  >
                    <img
                      src={imageUrl}
                      alt="Мұқаба алдын ала қарау"
                      referrerPolicy="no-referrer"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                    <button
                      type="button"
                      onClick={removeCoverImage}
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: 'rgba(15, 23, 42, 0.75)',
                        backdropFilter: 'blur(4px)',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                      title="Суретті алып тастау"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : null}

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageFileChange}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '9px 16px',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      background: '#F8FAFC',
                      color: 'var(--text-dark)',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: isUploadingImage ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <Upload size={16} color="var(--blue)" />
                    {isUploadingImage ? 'Жүктелуде...' : 'Компьютерден сурет жүктеу'}
                  </button>

                  <span style={{ fontSize: '13px', color: '#94A3B8' }}>немесе</span>

                  <input
                    type="url"
                    placeholder="Суреттің тікелей сілтемесін (URL) енгізіңіз..."
                    value={imageUrl.startsWith('data:') ? '' : imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    style={{
                      flex: 1,
                      minWidth: '240px',
                      padding: '9px 14px',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '13px',
                      background: '#FFFFFF',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* External Link */}
              <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '8px' }}>
                      Қосымша сілтеме (URL)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Globe
                        size={16}
                        style={{
                          position: 'absolute',
                          left: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#94A3B8',
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Мысалы: /catalog немесе https://..."
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 14px 10px 36px',
                          borderRadius: '8px',
                          border: '1.5px solid #CBD5E1',
                          fontSize: '13px',
                          background: '#FFFFFF',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '8px' }}>
                      Сілтеме батырмасының мәтіні
                    </label>
                    <input
                      type="text"
                      placeholder="Мысалы: Толық танысу / Кітапқа өту"
                      value={linkText}
                      onChange={(e) => setLinkText(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1.5px solid #CBD5E1',
                        fontSize: '13px',
                        background: '#FFFFFF',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tertiary Card: Publishing Settings */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '28px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.03)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#10B981',
                }}
              >
                <Sparkles size={20} />
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>
                Жариялау және Автор
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', alignItems: 'center' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '8px' }}>
                  Автор / Әкімші атауы
                </label>
                <input
                  type="text"
                  placeholder="Tanda әкімшілігі"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '13px',
                    background: '#FFFFFF',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Status Toggle Card */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  borderRadius: '12px',
                  background: isPublished ? '#F0FDF4' : '#F8FAFC',
                  border: `1.5px solid ${isPublished ? '#BBF7D0' : '#E2E8F0'}`,
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: isPublished ? '#166534' : '#475569' }}>
                    {isPublished ? 'Платформада жарияланған' : 'Қаралама (Черновик)'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                    {isPublished ? 'Оқырмандарға бірден көрінеді' : 'Тек админ панельде сақталады'}
                  </div>
                </div>

                <label
                  style={{
                    position: 'relative',
                    display: 'inline-block',
                    width: '46px',
                    height: '24px',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      cursor: 'pointer',
                      inset: 0,
                      backgroundColor: isPublished ? 'var(--blue)' : '#CBD5E1',
                      borderRadius: '24px',
                      transition: '0.2s',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        content: '""',
                        height: '18px',
                        width: '18px',
                        left: isPublished ? '24px' : '3px',
                        bottom: '3px',
                        backgroundColor: 'white',
                        borderRadius: '50%',
                        transition: '0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }}
                    />
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Form Actions Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '12px',
            }}
          >
            <button
              type="button"
              onClick={() => navigate('/admin/news')}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 700,
                border: '1.5px solid #CBD5E1',
                background: '#FFFFFF',
                color: 'var(--text-mid)',
                cursor: 'pointer',
              }}
            >
              Болдырмау
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
              style={{
                padding: '12px 32px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
                boxShadow: '0 4px 14px rgba(240,128,0,0.25)',
              }}
            >
              <CheckCircle2 size={18} />
              {isSubmitting
                ? 'Сақталуда...'
                : isEditing
                ? 'Өзгерістерді сақтау'
                : isPublished
                ? 'Платформаға жариялау'
                : 'Черновик ретінде сақтау'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};
