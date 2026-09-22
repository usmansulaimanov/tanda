import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useBookStore } from '../../store/useBookStore';
import { useToastStore } from '../../store/useToastStore';
import { AudioChapter } from '../../types';
import { isYouTubeUrl, getYouTubeEmbedUrl } from '../../utils/youtube';

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

const formatDurationInput = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 6);
  if (digits.length <= 2) {
    return digits;
  }
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  }
  return `${digits.slice(0, 2)}:${digits.slice(2, 4)}:${digits.slice(4)}`;
};

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
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isFree, setIsFree] = useState(true);
  const [coverImage, setCoverImage] = useState('');
  const [coverImageError, setCoverImageError] = useState(false);

  // Audio settings
  const [hasAudio, setHasAudio] = useState(false);
  const [audioNarrator, setAudioNarrator] = useState('');
  const [audioDuration, setAudioDuration] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [audioChapters, setAudioChapters] = useState<AudioChapter[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setCategoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadBookDetails = async () => {
      if (isEditing && id) {
        let book = existingBook;
        if (!book || !book.audioChapters || book.audioChapters.length === 0) {
          const fetched = await useBookStore.getState().fetchBookById(id);
          if (fetched) book = fetched;
        }
        if (book && isMounted) {
          setTitle(book.title || '');
          setAuthor(book.author || '');
          if (book.categories && Array.isArray(book.categories) && book.categories.length > 0) {
            setCategories(book.categories);
          } else if (book.category) {
            setCategories(book.category.split(',').map((c) => c.trim()).filter(Boolean));
          } else {
            setCategories([]);
          }
          setPages(book.pages ? String(book.pages) : '');
          setDescription(book.description || '');
          setIsFree(Boolean(book.isFree));
          if (book.coverImage) setCoverImage(book.coverImage);
          if (book.hasAudio) {
            setHasAudio(true);
            setAudioNarrator(book.audioNarrator || '');
            setAudioDuration(book.audioDuration || '');
            const initialAudioUrl = book.audioUrl || (book.audioChapters?.[0]?.audioUrl || '');
            setAudioUrl(initialAudioUrl);
            setAudioChapters(book.audioChapters && book.audioChapters.length > 0 ? book.audioChapters : [
              {
                id: `ch-${Date.now()}`,
                title: '1-аудио',
                duration: book.audioDuration || '',
                audioUrl: initialAudioUrl,
              }
            ]);
          }
        }
      }
    };
    loadBookDetails();
    return () => {
      isMounted = false;
    };
  }, [isEditing, id]);

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
      title: `${audioChapters.length + 1}-аудио`,
      duration: '',
      audioUrl: '',
    };
    setAudioChapters([...audioChapters, newCh]);
    if (errors.audioChapters) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.audioChapters;
        return next;
      });
    }
  };

  const updateChapter = (index: number, field: keyof AudioChapter, val: string) => {
    const updated = [...audioChapters];
    updated[index] = { ...updated[index], [field]: val };
    setAudioChapters(updated);
    if (field === 'audioUrl' && errors[`audioUrl_${index}`]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[`audioUrl_${index}`];
        return next;
      });
    }
  };

  const removeChapter = (index: number) => {
    if (index === 0) return;
    setAudioChapters(audioChapters.filter((_, i) => i !== index));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`audioUrl_${index}`];
      return next;
    });
  };

  const handleChapterAudioFile = (index: number, file: File) => {
    if (!file) return;
    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|ogg|m4a|aac)$/i)) {
      showToast('Тек аудио файлдарын жүктей аласыз (.mp3, .wav, .m4a, .ogg)', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      updateChapter(index, 'audioUrl', dataUrl);
      if (errors[`audioUrl_${index}`]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[`audioUrl_${index}`];
          return next;
        });
      }

      // Auto-detect audio duration
      try {
        const audio = new Audio(dataUrl);
        audio.onloadedmetadata = () => {
          if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
            const mins = Math.floor(audio.duration / 60);
            const secs = Math.floor(audio.duration % 60);
            const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
            updateChapter(index, 'duration', formatted);
          }
        };
      } catch {
        // Fallback
      }
      showToast(`${index + 1}-аудио файлы сәтті жүктелді`, 'success');
    };
    reader.readAsDataURL(file);
  };

  const toggleCategory = (cat: string) => {
    if (categories.includes(cat)) {
      setCategories(categories.filter((c) => c !== cat));
    } else {
      setCategories([...categories, cat]);
      if (errors.categories) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next.categories;
          return next;
        });
      }
    }
  };

  useEffect(() => {
    if (isEditing && id && !existingBook) {
      useBookStore.getState().fetchBookById(id);
    }
  }, [isEditing, id, existingBook]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Кітап атауын енгізіңіз';
    }
    if (!author.trim()) {
      newErrors.author = 'Автордың аты-жөнін енгізіңіз';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstKey = Object.keys(newErrors)[0];
      const firstMessage = newErrors[firstKey];
      showToast(firstMessage, 'error');

      setTimeout(() => {
        const el = document.getElementById(`field-${firstKey}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            (el as HTMLInputElement).focus();
          }
        }
      }, 50);
      return;
    }

    setErrors({});

    const pagesNum = parseInt(pages, 10);
    const validPages = !isNaN(pagesNum) && pagesNum > 0 ? pagesNum : (existingBook?.pages || 1);
    const finalCategories = categories.length > 0 ? categories : (existingBook?.categories || ['Көркем әдебиет']);
    const categoryString = finalCategories.join(', ');

    const finalAudioUrl = audioUrl.trim() || audioChapters.find((ch) => ch.audioUrl?.trim())?.audioUrl || '';
    let finalChapters = [...audioChapters];
    if (hasAudio) {
      if (finalChapters.length === 0 && finalAudioUrl) {
        finalChapters = [
          {
            id: `ch-${Date.now()}`,
            title: '1-аудио',
            duration: audioDuration.trim() || '00:00',
            audioUrl: finalAudioUrl,
          },
        ];
      } else if (finalChapters.length > 0 && finalAudioUrl && !finalChapters[0].audioUrl) {
        finalChapters[0] = { ...finalChapters[0], audioUrl: finalAudioUrl };
      }
    }

    const bookData = {
      title: title.trim(),
      author: author.trim(),
      category: categoryString,
      categories: finalCategories,
      pages: validPages,
      description: description.trim(),
      isFree,
      isArchived: existingBook ? existingBook.isArchived : false,
      coverImage: coverImage.trim() || undefined,
      gradient: coverImage ? undefined : (existingBook?.gradient || DEFAULT_COVER_GRADIENT),
      hasAudio,
      audioNarrator: hasAudio ? (audioNarrator.trim() || undefined) : undefined,
      audioDuration: hasAudio ? (audioDuration.trim() || undefined) : undefined,
      audioUrl: hasAudio && finalAudioUrl ? finalAudioUrl : undefined,
      audioChapters: hasAudio && finalChapters.length > 0 ? finalChapters : undefined,
    };

    try {
      if (isEditing && (existingBook || id)) {
        const targetId = existingBook?.id || id!;
        await updateBook(targetId, bookData);
        showToast('Кітап сәтті жаңартылды', 'success');
      } else {
        await addBook(bookData);
        showToast('Жаңа кітап сәтті қосылды', 'success');
      }
      navigate('/admin');
    } catch (err) {
      showToast('Кітапты сақтау кезінде қате орын алды', 'error');
    }
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
          className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-7 md:p-10 shadow-sm"
        >
          {/* Form Header */}
          <div style={{ borderBottom: '1.5px solid #F1F5F9', paddingBottom: '20px', marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
              {/* Title */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  Кітап атауы: <span className="req">*</span>
                </label>
                <input
                  id="field-title"
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (errors.title) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.title;
                        return next;
                      });
                    }
                  }}
                  className="form-input"
                  placeholder="Абай жолы"
                  style={errors.title ? { borderColor: '#EF4444', boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.12)' } : {}}
                />
                {errors.title && (
                  <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '5px', marginBottom: 0, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    {errors.title}
                  </p>
                )}
              </div>

              {/* Author */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  Автордың аты-жөні: <span className="req">*</span>
                </label>
                <input
                  id="field-author"
                  type="text"
                  value={author}
                  onChange={(e) => {
                    setAuthor(e.target.value);
                    if (errors.author) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.author;
                        return next;
                      });
                    }
                  }}
                  className="form-input"
                  placeholder="Мұхтар Әуезов"
                  style={errors.author ? { borderColor: '#EF4444', boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.12)' } : {}}
                />
                {errors.author && (
                  <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '5px', marginBottom: 0, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    {errors.author}
                  </p>
                )}
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
              <div className="form-group" style={{ margin: 0, position: 'relative' }} ref={categoryDropdownRef}>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Жанры / Санаты: <span className="req">*</span></span>
                  {categories.length > 0 && (
                    <span style={{ fontSize: '11px', color: '#005494', fontWeight: 700 }}>
                      Таңдалды: {categories.length}
                    </span>
                  )}
                </label>

                {/* Multi-select trigger */}
                <div
                  id="field-categories"
                  onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                  style={{
                    minHeight: '42px',
                    padding: '6px 12px',
                    background: '#FFFFFF',
                    border: errors.categories
                      ? '1.5px solid #EF4444'
                      : categoryDropdownOpen
                      ? '1.5px solid #005494'
                      : '1.5px solid #CBD5E1',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    boxShadow: errors.categories
                      ? '0 0 0 3px rgba(239, 68, 68, 0.12)'
                      : categoryDropdownOpen
                      ? '0 0 0 3px rgba(0, 84, 148, 0.12)'
                      : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', flex: 1 }}>
                    {categories.length === 0 ? (
                      <span style={{ color: errors.categories ? '#EF4444' : '#94A3B8', fontSize: '13px' }}>Жанрларды таңдаңыз...</span>
                    ) : (
                      categories.map((c) => (
                        <span
                          key={c}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#EFF6FF',
                            color: '#005494',
                            border: '1px solid #BFDBFE',
                            borderRadius: '6px',
                            padding: '2px 8px',
                            fontSize: '12px',
                            fontWeight: 600,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCategory(c);
                          }}
                        >
                          {c}
                          <span
                            title="Өшіру"
                            style={{
                              fontSize: '14px',
                              lineHeight: '1',
                              cursor: 'pointer',
                              color: '#005494',
                              marginLeft: '2px',
                              fontWeight: 700,
                            }}
                          >
                            &times;
                          </span>
                        </span>
                      ))
                    )}
                  </div>

                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      color: '#64748B',
                      flexShrink: 0,
                      transform: categoryDropdownOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s ease',
                    }}
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>

                {errors.categories && (
                  <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '5px', marginBottom: 0, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    {errors.categories}
                  </p>
                )}

                {/* Dropdown Menu */}
                {categoryDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      right: 0,
                      background: '#FFFFFF',
                      border: '1.5px solid #CBD5E1',
                      borderRadius: '10px',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                      zIndex: 60,
                      maxHeight: '260px',
                      overflowY: 'auto',
                      padding: '6px',
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '4px' }}>
                      {CATEGORIES.map((c) => {
                        const isSelected = categories.includes(c);
                        return (
                          <div
                            key={c}
                            onClick={() => toggleCategory(c)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '8px 10px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              background: isSelected ? '#EFF6FF' : 'transparent',
                              transition: 'background 0.15s ease',
                              fontSize: '13px',
                              color: isSelected ? '#005494' : '#1E293B',
                              fontWeight: isSelected ? 700 : 500,
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) e.currentTarget.style.background = '#F8FAFC';
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // handled by parent onClick
                              style={{
                                cursor: 'pointer',
                                accentColor: '#005494',
                                width: '15px',
                                height: '15px',
                              }}
                            />
                            <span>{c}</span>
                          </div>
                        );
                      })}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 8px 4px',
                        borderTop: '1px solid #E2E8F0',
                        marginTop: '6px',
                      }}
                    >
                      <span style={{ fontSize: '12px', color: '#64748B' }}>
                        Таңдалды: <strong>{categories.length}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => setCategoryDropdownOpen(false)}
                        style={{
                          background: '#005494',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '4px 12px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Дайын
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  Бет саны: <span className="req">*</span>
                </label>
                <input
                  id="field-pages"
                  type="number"
                  min="1"
                  value={pages}
                  onChange={(e) => {
                    setPages(e.target.value);
                    if (errors.pages) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.pages;
                        return next;
                      });
                    }
                  }}
                  className="form-input"
                  placeholder="350"
                  style={errors.pages ? { borderColor: '#EF4444', boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.12)' } : {}}
                />
                {errors.pages && (
                  <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '5px', marginBottom: 0, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    {errors.pages}
                  </p>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label">Кітап сипаттамасы / Аннотация:</label>
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
                      Сурет жүктеу:
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
                      Файлды таңдау
                    </label>

                    <span className="form-hint" style={{ marginTop: '6px' }}>
                      JPG, PNG, WEBP
                    </span>
                  </div>
                </div>

                {/* Preview Card */}
                <div>
                  <label className="form-label" style={{ fontSize: '12px', color: '#475569' }}>
                    Алдын ала көрініс:
                  </label>

                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    {/* Book Cover Preview */}
                    <div
                      style={{
                        width: '150px',
                        height: '210px',
                        borderRadius: '12px',
                        background: coverImage && !coverImageError ? '#F1F5F9' : DEFAULT_COVER_GRADIENT,
                        boxShadow: '0 8px 24px rgba(0, 40, 80, 0.18), 0 2px 8px rgba(0, 0, 0, 0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        padding: coverImage && !coverImageError ? '0' : '16px',
                        color: '#FFFFFF',
                        flexShrink: 0,
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      {coverImage && (
                        <img
                          key={coverImage}
                          src={coverImage}
                          alt="Cover preview"
                          referrerPolicy="no-referrer"
                          style={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            zIndex: 1,
                          }}
                          onLoad={() => {
                            setCoverImageError(false);
                          }}
                          onError={() => {
                            setCoverImageError(true);
                          }}
                        />
                      )}
                      {(!coverImage || coverImageError) && (
                        <>
                          <div style={{ fontSize: '10px', fontWeight: 800, lineHeight: 1.2, textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.9, position: 'relative', zIndex: 2 }}>
                            {categories.join(', ') || 'Жанры'}
                          </div>
                          <div style={{ fontSize: '15px', fontWeight: 900, lineHeight: 1.25, margin: 'auto 0', position: 'relative', zIndex: 2 }}>
                            {title || 'Кітап атауы'}
                          </div>
                          <div style={{ fontSize: '11px', opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', position: 'relative', zIndex: 2 }}>
                            {author || 'Автор'}
                          </div>
                        </>
                      )}
                    </div>

                    {coverImage && (
                      <div>
                        {coverImageError ? (
                          <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#DC2626', marginBottom: '8px', maxWidth: '240px', lineHeight: 1.4 }}>
                            Бұл сілтемеден сурет ашылмады. Төмендегі «Файлды таңдау» арқылы суретті жүктеңіз немесе тікелей JPG/PNG сілтемесін қойыңыз.
                          </span>
                        ) : (
                          <span style={{ display: 'inline-block', fontSize: '12px', fontWeight: 700, color: '#047857', marginBottom: '6px' }}>
                            Сурет сәтті орнатылды
                          </span>
                        )}
                        <div>
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
                      </div>
                    )}
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
                    Аудиокітап
                  </h3>
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
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setHasAudio(checked);
                      if (checked && audioChapters.length === 0) {
                        setAudioChapters([
                          {
                            id: `ch-${Date.now()}`,
                            title: '1-аудио',
                            duration: '',
                            audioUrl: '',
                          },
                        ]);
                      }
                    }}
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
                      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                      gap: '18px',
                      marginBottom: '18px',
                    }}
                  >
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '12px' }}>
                        Диктор (дыбыстаушы):
                      </label>
                      <input
                        id="field-audioNarrator"
                        type="text"
                        value={audioNarrator}
                        onChange={(e) => {
                          setAudioNarrator(e.target.value);
                          if (errors.audioNarrator) {
                            setErrors((prev) => {
                              const next = { ...prev };
                              delete next.audioNarrator;
                              return next;
                            });
                          }
                        }}
                        className="form-input"
                        placeholder="Берік Айтжанов"
                        style={errors.audioNarrator ? { borderColor: '#EF4444', boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.12)' } : {}}
                      />
                      {errors.audioNarrator && (
                        <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '5px', marginBottom: 0, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                          {errors.audioNarrator}
                        </p>
                      )}
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '12px' }}>
                        Жалпы ұзақтығы:
                      </label>
                      <input
                        id="field-audioDuration"
                        type="text"
                        value={audioDuration}
                        onChange={(e) => {
                          setAudioDuration(formatDurationInput(e.target.value));
                          if (errors.audioDuration) {
                            setErrors((prev) => {
                              const next = { ...prev };
                              delete next.audioDuration;
                              return next;
                            });
                          }
                        }}
                        className="form-input"
                        placeholder="02:34:27"
                        style={errors.audioDuration ? { borderColor: '#EF4444', boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.12)' } : {}}
                      />
                      {errors.audioDuration && (
                        <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '5px', marginBottom: 0, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                          {errors.audioDuration}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Main Book Audio URL & Upload block */}
                  <div
                    style={{
                      background: '#FFFFFF',
                      border: '1.5px solid #E2E8F0',
                      borderRadius: '10px',
                      padding: '16px',
                      marginBottom: '18px',
                    }}
                  >
                    <label className="form-label" style={{ fontSize: '13px', fontWeight: 800, marginBottom: '8px', display: 'block' }}>
                      Аудионың интернеттегі немесе YouTube сілтемесі (URL):
                    </label>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <div style={{ position: 'relative', flex: '1 1 280px' }}>
                        <input
                          id="field-mainAudioUrl"
                          type="text"
                          value={audioUrl}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAudioUrl(val);
                            if (audioChapters.length > 0) {
                              updateChapter(0, 'audioUrl', val);
                            } else if (val.trim()) {
                              setAudioChapters([
                                {
                                  id: `ch-${Date.now()}`,
                                  title: '1-аудио',
                                  duration: audioDuration || '',
                                  audioUrl: val,
                                },
                              ]);
                            }
                          }}
                          className="form-input"
                          placeholder="https://www.youtube.com/watch?v=... немесе аудио сілтеме"
                          style={{ paddingLeft: '36px', width: '100%', boxSizing: 'border-box' }}
                        />
                        <svg
                          style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748B', pointerEvents: 'none' }}
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                        </svg>
                      </div>

                      <label
                        htmlFor="main-audio-upload-input"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '10px 18px',
                          background: '#E8F1FB',
                          color: '#005494',
                          border: '1.5px solid #005494',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.15s',
                        }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="17 8 12 3 7 8"></polyline>
                          <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        Файл жүктеу
                      </label>
                      <input
                        type="file"
                        id="main-audio-upload-input"
                        accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            if (!f.type.startsWith('audio/') && !f.name.match(/\.(mp3|wav|ogg|m4a|aac)$/i)) {
                              showToast('Тек аудио файлдарын жүктей аласыз (.mp3, .wav, .m4a, .ogg)', 'error');
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const dataUrl = event.target?.result as string;
                              setAudioUrl(dataUrl);
                              if (audioChapters.length > 0) {
                                updateChapter(0, 'audioUrl', dataUrl);
                              } else {
                                setAudioChapters([
                                  {
                                    id: `ch-${Date.now()}`,
                                    title: '1-аудио',
                                    duration: audioDuration || '',
                                    audioUrl: dataUrl,
                                  },
                                ]);
                              }
                              showToast('Аудио файлы жүктелді', 'success');
                            };
                            reader.readAsDataURL(f);
                          }
                        }}
                        style={{ display: 'none' }}
                      />

                      {audioUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setAudioUrl('');
                            if (audioChapters.length > 0) {
                              updateChapter(0, 'audioUrl', '');
                            }
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '10px 14px',
                            background: '#FEE2E2',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#DC2626',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                          Өшіру
                        </button>
                      )}
                    </div>

                    {audioUrl && (
                      <div style={{ marginTop: '14px', padding: '12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#047857', marginBottom: '8px' }}>
                          ✓ Аудио сілтемесі орнатылды
                        </div>
                        {isYouTubeUrl(audioUrl) ? (
                          <div style={{ position: 'relative', width: '100%', maxWidth: '400px', height: '180px', borderRadius: '8px', overflow: 'hidden' }}>
                            <iframe
                              src={getYouTubeEmbedUrl(audioUrl) || undefined}
                              title="Audio Preview"
                              style={{ width: '100%', height: '100%', border: 'none' }}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        ) : (
                          <audio controls src={audioUrl} style={{ width: '100%', height: '36px' }} />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Chapters block */}
                  <div
                    id="field-audioChapters"
                    style={{
                      background: '#FFFFFF',
                      border: errors.audioChapters ? '1.5px solid #EF4444' : '1.5px solid #E2E8F0',
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
                        flexWrap: 'wrap',
                        gap: '10px',
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                          Аудио бөлімдері: {audioChapters.length}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={addChapter}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '7px 16px',
                          fontSize: '12px',
                          fontWeight: 700,
                          background: '#E8F1FB',
                          color: '#005494',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'background 0.2s',
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19"></line>
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Аудио қосу
                      </button>
                    </div>

                    {errors.audioChapters && (
                      <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '0', marginBottom: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                        {errors.audioChapters}
                      </p>
                    )}

                    {audioChapters.length === 0 ? (
                      <p style={{ fontSize: '12px', color: '#94A3B8', textAlign: 'center', margin: '12px 0' }}>
                        Әзірге аудио қосылмаған. «Аудио қосу» түймесін басыңыз.
                      </p>
                    ) : (
                      audioChapters.map((ch, idx) => (
                        <div
                          key={ch.id || idx}
                          style={{
                            marginBottom: '12px',
                            background: '#F8FAFC',
                            padding: '14px',
                            borderRadius: '10px',
                            border: '1.5px solid #E2E8F0',
                          }}
                        >
                          {/* Chapter Header Row */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              marginBottom: '10px',
                              flexWrap: 'wrap',
                            }}
                          >
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 800,
                                background: '#E2E8F0',
                                color: '#334155',
                                padding: '3px 8px',
                                borderRadius: '4px',
                              }}
                            >
                              {idx + 1}-аудио
                            </span>

                            <input
                              type="text"
                              value={ch.title}
                              onChange={(e) => updateChapter(idx, 'title', e.target.value)}
                              placeholder={`Аудио атауы (${idx + 1}-аудио)`}
                              className="form-input"
                              style={{ flex: '1 1 200px', padding: '8px 12px', fontSize: '13px' }}
                            />

                            <input
                              type="text"
                              value={ch.duration}
                              onChange={(e) => updateChapter(idx, 'duration', formatDurationInput(e.target.value))}
                              placeholder=""
                              className="form-input"
                              style={{ width: '90px', padding: '8px 12px', fontSize: '13px' }}
                              title="Аудио ұзақтығы"
                            />

                            {idx > 0 && (
                              <button
                                type="button"
                                onClick={() => removeChapter(idx)}
                                style={{
                                  background: '#F1F5F9',
                                  border: '1.5px solid #E2E8F0',
                                  color: '#64748B',
                                  cursor: 'pointer',
                                  width: '34px',
                                  height: '34px',
                                  borderRadius: '8px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'all 0.2s',
                                  flexShrink: 0,
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = '#E2E8F0';
                                  e.currentTarget.style.color = '#0F172A';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = '#F1F5F9';
                                  e.currentTarget.style.color = '#64748B';
                                }}
                                title="Аудионы өшіру"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="18" y1="6" x2="6" y2="18"></line>
                                  <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                              </button>
                            )}
                          </div>

                          {/* Chapter Audio Source Row (URL + Upload) */}
                          <div>
                            <div
                              id={`field-audioUrl-${idx}`}
                              style={{
                                display: 'flex',
                                gap: '8px',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                padding: errors[`audioUrl_${idx}`] ? '6px' : '0',
                                borderRadius: '8px',
                                background: errors[`audioUrl_${idx}`] ? '#FEF2F2' : 'transparent',
                                border: errors[`audioUrl_${idx}`] ? '1.5px solid #EF4444' : 'none',
                              }}
                            >
                              <div style={{ position: 'relative', flex: '1 1 220px' }}>
                                <input
                                  type="text"
                                  value={ch.audioUrl || ''}
                                  onChange={(e) => updateChapter(idx, 'audioUrl', e.target.value)}
                                  placeholder="Ютубтан сілтеме"
                                  className="form-input"
                                  style={{
                                    width: '100%',
                                    padding: '7px 10px 7px 30px',
                                    fontSize: '12px',
                                    boxSizing: 'border-box',
                                    background: '#FFFFFF',
                                    borderColor: errors[`audioUrl_${idx}`] ? '#EF4444' : '#CBD5E1',
                                  }}
                                />
                                <svg
                                  style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: '#64748B', pointerEvents: 'none' }}
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                                </svg>
                              </div>

                              {/* Upload Chapter Audio File Button */}
                              <label
                                htmlFor={`ch-audio-upload-${idx}`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '7px 14px',
                                  background: '#FFFFFF',
                                  color: errors[`audioUrl_${idx}`] ? '#DC2626' : '#005494',
                                  border: errors[`audioUrl_${idx}`] ? '1.5px solid #DC2626' : '1.5px solid #005494',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                  transition: 'all 0.15s',
                                }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                  <polyline points="17 8 12 3 7 8"></polyline>
                                  <line x1="12" y1="3" x2="12" y2="15"></line>
                                </svg>
                                Файл жүктеу
                              </label>
                              <input
                                type="file"
                                id={`ch-audio-upload-${idx}`}
                                accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) handleChapterAudioFile(idx, f);
                                }}
                                style={{ display: 'none' }}
                              />

                              {ch.audioUrl && (
                                <button
                                  type="button"
                                  onClick={() => updateChapter(idx, 'audioUrl', '')}
                                  style={{
                                    padding: '6px 10px',
                                    background: '#F1F5F9',
                                    color: '#64748B',
                                    border: '1px solid #CBD5E1',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Тазарту
                                </button>
                              )}
                            </div>

                            {errors[`audioUrl_${idx}`] && (
                              <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '5px', marginBottom: 0, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                {errors[`audioUrl_${idx}`]}
                              </p>
                            )}
                          </div>

                          {/* Chapter Audio Preview Player */}
                          {ch.audioUrl && (
                            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #E2E8F0' }}>
                              {isYouTubeUrl(ch.audioUrl) ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px' }}>
                                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#DC2626', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                    </svg>
                                    YouTube сілтемесі танылды (Аудио түрінде ойнатылады)
                                  </span>
                                </div>
                              ) : (
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#047857' }}>
                                      Аудио жазба тыңдау:
                                    </span>
                                  </div>
                                  <audio controls src={ch.audioUrl} style={{ width: '100%', height: '32px' }} />
                                </div>
                              )}
                            </div>
                          )}
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
                background: !isFree ? '#F0F7FF' : '#F8FAFC',
                border: !isFree ? '1.5px solid #BAE6FD' : '1.5px solid #E2E8F0',
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
                    padding: '3px 10px',
                    borderRadius: '50px',
                    background: !isFree ? 'var(--blue)' : '#FFFFFF',
                    color: !isFree ? '#FFFFFF' : 'var(--blue)',
                    border: '1.5px solid var(--blue)',
                  }}
                >
                  {!isFree ? 'Премиум жазылым' : 'Тегін кітап'}
                </span>
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
                  checked={!isFree}
                  onChange={(e) => setIsFree(!e.target.checked)}
                  style={{
                    accentColor: '#005494',
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer',
                  }}
                />
                Премиум кітап ретінде белгілеу
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
                  justifyContent: 'center',
                }}
              >
                {isEditing ? 'Сақтау' : 'Тіркеу'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
