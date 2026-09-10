import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useBookStore } from '../../store/useBookStore';
import { useToastStore } from '../../store/useToastStore';
import { AudioChapter } from '../../types';
import tandaLogo from '../../assets/tanda-logo.png';

const CATEGORIES = [
  'Классика',
  'Тұлғалық даму',
  'Тарих',
  'Ертегілер',
  'Бизнес',
  'Психология',
];

const GRADIENT_PRESETS = [
  { name: 'Көк классика', value: 'linear-gradient(135deg, #0057A8, #003d7a)' },
  { name: 'Жылы сары', value: 'linear-gradient(135deg, #F08000, #c06800)' },
  { name: 'Терең көк', value: 'linear-gradient(135deg, #1E3A8A, #172554)' },
  { name: 'Изумруд жасыл', value: 'linear-gradient(135deg, #065F46, #022C22)' },
  { name: 'Күлгін рубин', value: 'linear-gradient(135deg, #7C3AED, #4C1D95)' },
  { name: 'Қоңыр кітап', value: 'linear-gradient(135deg, #B45309, #78350F)' },
  { name: 'Қызыл екпін', value: 'linear-gradient(135deg, #DC2626, #7F1D1D)' },
];

export const BookFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { books, addBook, updateBook } = useBookStore();
  const { showToast } = useToastStore();

  const isEditing = Boolean(id);
  const existingBook = isEditing ? books.find((b) => b.id === id) : null;

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('Классика');
  const [pages, setPages] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isFree, setIsFree] = useState(true);
  const [gradient, setGradient] = useState(GRADIENT_PRESETS[0].value);
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
      if (existingBook.gradient) setGradient(existingBook.gradient);
      if (existingBook.coverImage) setCoverImage(existingBook.coverImage);
      setHasAudio(Boolean(existingBook.hasAudio));
      setAudioNarrator(existingBook.audioNarrator || '');
      setAudioDuration(existingBook.audioDuration || '');
      setAudioUrl(existingBook.audioUrl || '');
      setAudioChapters(existingBook.audioChapters || []);
    }
  }, [existingBook]);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCoverImage(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
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
      showToast('Автор есімін енгізіңіз', 'error');
      return;
    }

    const payload = {
      title,
      author,
      category,
      pages: pages ? parseInt(pages, 10) : null,
      description,
      isFree,
      isArchived: existingBook ? existingBook.isArchived : false,
      gradient,
      coverImage,
      hasAudio,
      audioNarrator: hasAudio ? audioNarrator : undefined,
      audioDuration: hasAudio ? audioDuration : undefined,
      audioUrl: hasAudio ? audioUrl : undefined,
      audioChapters: hasAudio ? audioChapters : [],
    };

    if (isEditing && existingBook) {
      updateBook(existingBook.id, payload);
      showToast('Кітап сәтті сақталды және жаңартылды!', 'success');
    } else {
      addBook(payload);
      showToast('Жаңа кітап сәтті қосылды!', 'success');
    }

    // Automatically navigate back to admin dashboard
    navigate('/admin');
  };

  return (
    <div style={{ backgroundColor: '#F1F5F9', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header (Exact add-book.html design) */}
      <header
        style={{
          background: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          padding: '16px 24px',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}
      >
        <div
          style={{
            maxWidth: '960px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center' }}>
              <img
                src={tandaLogo}
                alt="Tanda"
                style={{ height: '32px', width: 'auto', display: 'block', objectFit: 'contain' }}
              />
            </Link>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#0369A1',
                background: '#E0F2FE',
                padding: '4px 10px',
                borderRadius: '50px',
              }}
            >
              Әкімші панелі
            </span>
          </div>

          <Link
            to="/admin"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: 700,
              color: 'var(--text-mid)',
              textDecoration: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
            }}
          >
            ← Артқа оралу
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <div style={{ maxWidth: '860px', width: '100%', margin: '36px auto 60px', padding: '0 20px', flex: 1 }}>
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: '16px',
            padding: '36px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
          }}
        >
          <h1 style={{ fontSize: '26px', fontWeight: 900, color: 'var(--text-dark)', letterSpacing: '-0.5px' }}>
            {isEditing ? 'Кітапты өңдеу' : 'Жаңа кітап қосу'}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-mid)', marginTop: '6px', marginBottom: '28px' }}>
            {isEditing ? 'Кітап параметрлерін өзгертіп, сақтауды басыңыз' : 'Кітапхана қорына жаңа әдебиет немесе аудиокітапты тіркеу'}
          </p>

          <form onSubmit={handleSubmit}>
            {/* Form grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '20px',
                marginBottom: '20px',
              }}
            >
              <div className="form-group">
                <label className="form-label">Кітап атауы *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="form-input"
                  placeholder="Мысалы: Абай жолы"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Автордың аты-жөні *</label>
                <input
                  type="text"
                  required
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="form-input"
                  placeholder="Мысалы: Мұхтар Әуезов"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Жанры / Санаты</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="form-input"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Бет саны</label>
                <input
                  type="number"
                  value={pages}
                  onChange={(e) => setPages(e.target.value)}
                  className="form-input"
                  placeholder="Мысалы: 350"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Кітап сипаттамасы / Аннотация</label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="form-input"
                placeholder="Кітап мазмұны туралы қысқаша..."
                style={{ resize: 'vertical' }}
              />
            </div>

            {/* MUKABA DIZAINY (Cover Design box) */}
            <div
              style={{
                background: '#F8FAFC',
                border: '1.5px solid #CBD5E1',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '24px',
              }}
            >
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '16px' }}>
                Мұқаба дизайны мен градиент
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
                {/* Presets */}
                <div>
                  <label className="form-label" style={{ fontSize: '12px' }}>Градиентті таңдаңыз:</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                    {GRADIENT_PRESETS.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => {
                          setGradient(p.value);
                          setCoverImage('');
                        }}
                        style={{
                          background: p.value,
                          color: '#FFF',
                          padding: '10px 8px',
                          borderRadius: '8px',
                          border: gradient === p.value && !coverImage ? '2.5px solid #000' : 'none',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Upload Image */}
                <div>
                  <label className="form-label" style={{ fontSize: '12px' }}>Немесе мұқаба суретін жүктеңіз:</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    style={{ fontSize: '13px', marginTop: '4px' }}
                  />

                  {/* Preview Box */}
                  <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '64px',
                        height: '84px',
                        borderRadius: '6px',
                        background: coverImage ? `url(${coverImage}) center/cover` : gradient,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFF',
                        fontSize: '9px',
                        fontWeight: 800,
                        textAlign: 'center',
                        padding: '4px',
                      }}
                    >
                      {!coverImage && (title || 'Мұқаба')}
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-mid)' }}>Алдын ала көрініс (Preview)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* AUDIOKITAP SECTION */}
            <div
              style={{
                background: '#F8FAFC',
                border: '1.5px solid #CBD5E1',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '24px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-dark)' }}>
                  Аудиокітап параметрлері
                </h3>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>
                  <input
                    type="checkbox"
                    checked={hasAudio}
                    onChange={(e) => setHasAudio(e.target.checked)}
                    style={{ width: '16px', height: '16px' }}
                  />
                  Аудио нұсқасы бар
                </label>
              </div>

              {hasAudio && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '12px' }}>Диктор</label>
                      <input
                        type="text"
                        value={audioNarrator}
                        onChange={(e) => setAudioNarrator(e.target.value)}
                        className="form-input"
                        placeholder="Мысалы: Берік Айтжанов"
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '12px' }}>Жалпы ұзақтығы</label>
                      <input
                        type="text"
                        value={audioDuration}
                        onChange={(e) => setAudioDuration(e.target.value)}
                        className="form-input"
                        placeholder="Мысалы: 2 сағат 15 минут"
                      />
                    </div>
                  </div>

                  {/* Chapters */}
                  <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)' }}>
                        Тараулар ({audioChapters.length})
                      </span>
                      <button
                        type="button"
                        onClick={addChapter}
                        style={{
                          padding: '6px 14px',
                          fontSize: '12px',
                          fontWeight: 700,
                          background: 'var(--blue-light)',
                          color: 'var(--blue)',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        + Тарау қосу
                      </button>
                    </div>

                    {audioChapters.map((ch, idx) => (
                      <div
                        key={ch.id || idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          marginBottom: '8px',
                          background: '#FFF',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid #E2E8F0',
                        }}
                      >
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-mid)', width: '20px' }}>
                          {idx + 1}.
                        </span>
                        <input
                          type="text"
                          value={ch.title}
                          onChange={(e) => updateChapter(idx, 'title', e.target.value)}
                          placeholder="Тарау атауы"
                          style={{ flex: 1, padding: '6px 10px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px' }}
                        />
                        <input
                          type="text"
                          value={ch.duration}
                          onChange={(e) => updateChapter(idx, 'duration', e.target.value)}
                          placeholder="03:45"
                          style={{ width: '80px', padding: '6px 10px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px' }}
                        />
                        <button
                          type="button"
                          onClick={() => removeChapter(idx)}
                          style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontWeight: 700 }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* FREE / PAID TOGGLE */}
            <div style={{ marginBottom: '28px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 700 }}>
                <input
                  type="checkbox"
                  checked={isFree}
                  onChange={(e) => setIsFree(e.target.checked)}
                  style={{ width: '18px', height: '18px' }}
                />
                Бұл кітап тегін оқырмандарға қолжетімді
              </label>
            </div>

            {/* ACTION BUTTONS */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '14px', borderTop: '1px solid #E2E8F0', paddingTop: '24px' }}>
              <button
                type="button"
                onClick={() => navigate('/admin')}
                style={{
                  padding: '12px 28px',
                  borderRadius: '50px',
                  border: '1.5px solid #CBD5E1',
                  background: '#FFF',
                  fontWeight: 700,
                  fontSize: '14px',
                  color: 'var(--text-dark)',
                  cursor: 'pointer',
                }}
              >
                Болдырмау
              </button>

              <button
                type="submit"
                className="btn-primary"
                style={{ padding: '12px 36px', fontSize: '14px' }}
              >
                Сақтау
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
