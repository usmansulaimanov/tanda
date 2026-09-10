import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useBookStore } from '../../store/useBookStore';
import { useToastStore } from '../../store/useToastStore';
import { AudioChapter } from '../../types';

const CATEGORIES = [
  'Көркем әдебиет',
  'Детектив',
  'Романтика',
  'Фэнтези',
  'Фантастика',
  'Мистика және хоррор',
  'Психология',
  'Өзін-өзі дамыту',
  'Бизнес және қаржы',
  'Тарих',
  'Руханият және философия',
  'Білім және ғылым',
  'Балалар әдебиеті',
  'Жасөспірімдер әдебиеті',
  'Өмірбаян және мемуар',
];

const DEFAULT_COVER_GRADIENT = 'linear-gradient(135deg, #005494, #002D50)';

export const BookFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { books, addBook, updateBook } = useBookStore();
  const { showToast } = useToastStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = Boolean(id);
  const existingBook = isEditing ? books.find((b) => b.id === id) : null;

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('Көркем әдебиет');
  const [pages, setPages] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isFree, setIsFree] = useState(true);
  const [coverImage, setCoverImage] = useState('');

  // Audio settings
  const [hasAudio, setHasAudio] = useState(false);
  const [audioNarrator, setAudioNarrator] = useState('');
  const [audioDuration, setAudioDuration] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [audioChapters, setAudioChapters] = useState<AudioChapter[]>([]);

  useEffect(() => {
    if (existingBook) {
      setTitle(existingBook.title);
      setAuthor(existingBook.author);
      setCategory(existingBook.category);
      setPages(existingBook.pages ? String(existingBook.pages) : '');
      setDescription(existingBook.description);
      setIsFree(existingBook.isFree);
      if (existingBook.coverImage) setCoverImage(existingBook.coverImage);
      if (existingBook.hasAudio) {
        setHasAudio(true);
        setAudioNarrator(existingBook.audioNarrator || '');
        setAudioDuration(existingBook.audioDuration || '');
        setAudioUrl(existingBook.audioUrl || '');
        setAudioChapters(existingBook.audioChapters || []);
      }
    }
  }, [existingBook]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showToast('Тек сурет файлдарын жүктей аласыз', 'error');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showToast('Сурет өлшемі 5MB-тан аспауы керек', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setCoverImage(event.target?.result as string);
        showToast('Мұқаба суреті жүктелді', 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  const removeCoverImage = () => {
    setCoverImage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const addChapter = () => {
    const newCh: AudioChapter = {
      id: `ch-${Date.now()}`,
      title: `${audioChapters.length + 1}-тарау`,
      duration: '05:00',
      audioUrl: '',
    };
    setAudioChapters([...audioChapters, newCh]);
  };

  const updateChapter = (index: number, field: keyof AudioChapter, val: string) => {
    const updated = [...audioChapters];
    updated[index] = { ...updated[index], [field]: val };
    setAudioChapters(updated);
  };

  const removeChapter = (index: number) => {
    setAudioChapters(audioChapters.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      showToast('Кітап атауын енгізіңіз', 'error');
      return;
    }
    if (!author.trim()) {
      showToast('Автордың атын енгізіңіз', 'error');
      return;
    }

    const pagesNum = parseInt(pages, 10);
    const validPages = isNaN(pagesNum) || pagesNum <= 0 ? (hasAudio ? 0 : 100) : pagesNum;

    const bookData = {
      title: title.trim(),
      author: author.trim(),
      category,
      pages: validPages,
      description: description.trim(),
      isFree,
      isArchived: existingBook ? existingBook.isArchived : false,
      coverImage: coverImage.trim() || undefined,
      gradient: coverImage ? undefined : (existingBook?.gradient || DEFAULT_COVER_GRADIENT),
      hasAudio,
      audioNarrator: hasAudio ? audioNarrator.trim() : undefined,
      audioDuration: hasAudio ? audioDuration.trim() : undefined,
      audioUrl: hasAudio ? audioUrl.trim() : undefined,
      audioChapters: hasAudio && audioChapters.length > 0 ? audioChapters : undefined,
    };

    if (isEditing && existingBook) {
      updateBook(existingBook.id, bookData);
      showToast('Кітап сәтті жаңартылды', 'success');
    } else {
      addBook(bookData);
      showToast('Жаңа кітап сәтті қосылды', 'success');
    }

    navigate('/admin');
  };

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: 'calc(100vh - 80px)', padding: '32px 16px 80px' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>
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
            <Link to="/admin" style={{ color: '#005494', fontWeight: 600, textDecoration: 'none' }}>
              Басқару панелі
            </Link>
            <span>/</span>
            <span style={{ color: '#0F172A', fontWeight: 600 }}>
              {isEditing ? 'Кітапты өңдеу' : 'Жаңа кітап қосу'}
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
              color: '#005494',
              textDecoration: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              background: '#FFFFFF',
              border: '1.5px solid #E2E8F0',
              transition: 'all 0.2s',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Басқару панеліне қайту
          </Link>
        </div>

        {/* Main Card */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1.5px solid #E2E8F0',
            borderRadius: '16px',
            padding: '36px',
            boxShadow: '0 4px 20px -2px rgba(0, 84, 148, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.03)',
          }}
        >
          {/* Form Header */}
          <div style={{ borderBottom: '1.5px solid #F1F5F9', paddingBottom: '20px', marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '24px',
                  backgroundColor: '#EF7E00',
                  borderRadius: '4px',
                }}
              />
              <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>
                {isEditing ? 'Кітап мәліметтерін өңдеу' : 'Жаңа кітап тіркеу'}
              </h1>
            </div>
            <p style={{ fontSize: '14px', color: '#64748B', margin: 0, paddingLeft: '18px' }}>
              {isEditing
                ? 'Кітап параметрлерін өзгертіп, төмендегі сақтау түймесін басыңыз'
                : 'Кітапхана қорына жаңа әдебиет немесе аудиокітап қосу'}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Primary Details: Title & Author */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '20px',
                marginBottom: '20px',
              }}
            >
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  Кітап атауы <span className="req">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="form-input"
                  placeholder="Мысалы: Абай жолы"
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  Автордың аты-жөні <span className="req">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="form-input"
                  placeholder="Мысалы: Мұхтар Әуезов"
                />
              </div>
            </div>

            {/* Category and Pages */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '20px',
                marginBottom: '20px',
              }}
            >
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Жанры / Санаты</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="form-select"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Бет саны</label>
                <input
                  type="number"
                  min="1"
                  value={pages}
                  onChange={(e) => setPages(e.target.value)}
                  className="form-input"
                  placeholder="Мысалы: 350"
                />
              </div>
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label">Кітап сипаттамасы / Аннотация</label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="form-textarea"
                placeholder="Кітаптың қысқаша мазмұны, тақырыбы немесе оқырманға арналған ақпарат..."
                style={{ resize: 'vertical' }}
              />
            </div>

            {/* COVER IMAGE SECTION (File upload + Image URL) */}
            <div
              style={{
                background: '#F8FAFC',
                border: '1.5px solid #E2E8F0',
                borderRadius: '14px',
                padding: '24px',
                marginBottom: '24px',
              }}
            >
              <div style={{ marginBottom: '18px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Мұқаба суреті
                </h3>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 0' }}>
                  Кітаптың мұқаба суретін құрылғыңыздан жүктеңіз немесе интернеттегі тікелей сілтемесін (URL) көрсетіңіз
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', alignItems: 'start' }}>
                {/* Inputs: URL and File */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Image URL Input */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '12px', color: '#475569' }}>
                      Суреттің интернеттегі сілтемесі (URL):
                    </label>
                    <input
                      type="url"
                      value={coverImage.startsWith('data:') ? '' : coverImage}
                      onChange={(e) => setCoverImage(e.target.value)}
                      placeholder="https://мысал.kz/images/mukaaba.jpg"
                      className="form-input"
                    />
                    <span className="form-hint">
                      Интернеттен кез келген суреттің толық сілтемесін қоюға болады
                    </span>
                  </div>

                  {/* Divider */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>немесе</span>
                    <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
                  </div>

                  {/* File Upload Button */}
                  <div>
                    <label className="form-label" style={{ fontSize: '12px', color: '#475569' }}>
                      Құрылғыдан сурет файлын жүктеу:
                    </label>

                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                      id="cover-file-upload"
                    />

                    <label
                      htmlFor="cover-file-upload"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 18px',
                        background: '#FFFFFF',
                        border: '1.5px solid #005494',
                        color: '#005494',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: '0 1px 2px rgba(0, 84, 148, 0.08)',
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                      </svg>
                      Сурет файлын таңдау...
                    </label>

                    <span className="form-hint" style={{ marginTop: '6px' }}>
                      Қолдау көрсетілетін форматтар: JPG, PNG, WEBP
                    </span>
                  </div>
                </div>

                {/* Preview Card */}
                <div>
                  <label className="form-label" style={{ fontSize: '12px', color: '#475569' }}>
                    Алдын ала көрініс (Preview):
                  </label>

                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    {/* 3D Realistic Book Cover Preview */}
                    <div
                      style={{
                        width: '96px',
                        height: '130px',
                        borderRadius: '6px',
                        background: coverImage ? `url(${coverImage}) center/cover no-repeat` : DEFAULT_COVER_GRADIENT,
                        boxShadow: '0 8px 20px rgba(0, 40, 80, 0.2), 0 2px 6px rgba(0, 0, 0, 0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        padding: '10px',
                        color: '#FFFFFF',
                        flexShrink: 0,
                        position: 'relative',
                        overflow: 'hidden',
                        borderLeft: '4px solid rgba(255, 255, 255, 0.25)',
                      }}
                    >
                      {!coverImage && (
                        <>
                          <div style={{ fontSize: '8px', fontWeight: 800, lineHeight: 1.1, textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.9 }}>
                            {category}
                          </div>
                          <div style={{ fontSize: '11px', fontWeight: 900, lineHeight: 1.2, margin: 'auto 0' }}>
                            {title || 'Кітап атауы'}
                          </div>
                          <div style={{ fontSize: '9px', opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {author || 'Автор'}
                          </div>
                        </>
                      )}
                    </div>

                    <div>
                      {coverImage ? (
                        <div>
                          <span style={{ display: 'inline-block', fontSize: '12px', fontWeight: 700, color: '#047857', marginBottom: '6px' }}>
                            Сурет сәтті орнатылды
                          </span>
                          <button
                            type="button"
                            onClick={removeCoverImage}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 12px',
                              background: '#FEE2E2',
                              border: 'none',
                              borderRadius: '6px',
                              color: '#DC2626',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'background 0.2s',
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18"></line>
                              <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                            Суретті өшіру / тазарту
                          </button>
                        </div>
                      ) : (
                        <p style={{ fontSize: '12px', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                          Сурет жүктелмесе, сайтта негізгі қарапайым фирменный фон көрсетіледі.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AUDIOBOOK SETTINGS SECTION */}
            <div
              style={{
                background: '#F8FAFC',
                border: '1.5px solid #E2E8F0',
                borderRadius: '14px',
                padding: '24px',
                marginBottom: '24px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: hasAudio ? '16px' : '0',
                  borderBottom: hasAudio ? '1.5px solid #E2E8F0' : 'none',
                  marginBottom: hasAudio ? '20px' : '0',
                }}
              >
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    Аудиокітап мүмкіндігі
                  </h3>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 0' }}>
                    Бұл басылымға аудиожазба немесе диктор дауысын бекіту
                  </p>
                </div>

                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    background: '#FFFFFF',
                    padding: '8px 16px',
                    borderRadius: '50px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#0F172A',
                    userSelect: 'none',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={hasAudio}
                    onChange={(e) => setHasAudio(e.target.checked)}
                    style={{
                      accentColor: '#005494',
                      width: '16px',
                      height: '16px',
                      cursor: 'pointer',
                    }}
                  />
                  Аудио нұсқасы бар
                </label>
              </div>

              {hasAudio && (
                <div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                      gap: '18px',
                      marginBottom: '20px',
                    }}
                  >
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '12px' }}>
                        Диктор (Дауыстаған)
                      </label>
                      <input
                        type="text"
                        value={audioNarrator}
                        onChange={(e) => setAudioNarrator(e.target.value)}
                        className="form-input"
                        placeholder="Мысалы: Берік Айтжанов"
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '12px' }}>
                        Жалпы ұзақтығы
                      </label>
                      <input
                        type="text"
                        value={audioDuration}
                        onChange={(e) => setAudioDuration(e.target.value)}
                        className="form-input"
                        placeholder="Мысалы: 2 сағат 15 минут"
                      />
                    </div>
                  </div>

                  {/* Chapters block */}
                  <div
                    style={{
                      background: '#FFFFFF',
                      border: '1.5px solid #E2E8F0',
                      borderRadius: '10px',
                      padding: '16px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '14px',
                      }}
                    >
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                        Тараулар ({audioChapters.length})
                      </span>

                      <button
                        type="button"
                        onClick={addChapter}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 14px',
                          fontSize: '12px',
                          fontWeight: 700,
                          background: '#E8F1FB',
                          color: '#005494',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'background 0.2s',
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19"></line>
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Тарау қосу
                      </button>
                    </div>

                    {audioChapters.length === 0 ? (
                      <p style={{ fontSize: '12px', color: '#94A3B8', textAlign: 'center', margin: '12px 0' }}>
                        Әзірге тараулар қосылмаған. «Тарау қосу» түймесін басыңыз.
                      </p>
                    ) : (
                      audioChapters.map((ch, idx) => (
                        <div
                          key={ch.id || idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            marginBottom: '10px',
                            background: '#F8FAFC',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: '1px solid #E2E8F0',
                          }}
                        >
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#64748B', width: '22px' }}>
                            {idx + 1}.
                          </span>
                          <input
                            type="text"
                            value={ch.title}
                            onChange={(e) => updateChapter(idx, 'title', e.target.value)}
                            placeholder="Тарау атауы"
                            className="form-input"
                            style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}
                          />
                          <input
                            type="text"
                            value={ch.duration}
                            onChange={(e) => updateChapter(idx, 'duration', e.target.value)}
                            placeholder="05:00"
                            className="form-input"
                            style={{ width: '90px', padding: '8px 12px', fontSize: '13px' }}
                          />
                          <button
                            type="button"
                            onClick={() => removeChapter(idx)}
                            style={{
                              background: '#FEE2E2',
                              border: 'none',
                              color: '#DC2626',
                              cursor: 'pointer',
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'background 0.2s',
                              flexShrink: 0,
                            }}
                            title="Тарауды өшіру"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18"></line>
                              <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* FREE / PAID ACCESS */}
            <div
              style={{
                background: isFree ? '#F0FDF4' : '#FFFBEB',
                border: isFree ? '1.5px solid #BBF7D0' : '1.5px solid #FDE68A',
                borderRadius: '12px',
                padding: '16px 20px',
                marginBottom: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    fontSize: '11px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: isFree ? '#22C55E' : '#D97706',
                    color: '#FFFFFF',
                    marginBottom: '4px',
                  }}
                >
                  {isFree ? 'Тегін кітап' : 'Премиум жазылым'}
                </span>
                <p style={{ fontSize: '13px', color: '#1E293B', margin: 0, fontWeight: 600 }}>
                  {isFree
                    ? 'Бұл кітап барлық оқырмандар үшін тегін қолжетімді болады'
                    : 'Бұл кітапты тек премиум жазылымы бар пайдаланушылар оқи алады'}
                </p>
              </div>

              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#0F172A',
                }}
              >
                <input
                  type="checkbox"
                  checked={isFree}
                  onChange={(e) => setIsFree(e.target.checked)}
                  style={{
                    accentColor: '#005494',
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer',
                  }}
                />
                Тегін кітап ретінде белгілеу
              </label>
            </div>

            {/* ACTION BUTTONS */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '14px',
                borderTop: '1.5px solid #F1F5F9',
                paddingTop: '24px',
              }}
            >
              <button
                type="button"
                onClick={() => navigate('/admin')}
                style={{
                  padding: '12px 28px',
                  borderRadius: '50px',
                  border: '1.5px solid #CBD5E1',
                  background: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '14px',
                  color: '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Болдырмау
              </button>

              <button
                type="submit"
                style={{
                  padding: '12px 36px',
                  borderRadius: '50px',
                  border: 'none',
                  background: '#EF7E00',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(239, 126, 0, 0.35)',
                  transition: 'all 0.2s',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
                {isEditing ? 'Өзгерістерді сақтау' : 'Кітапты сақтау'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
