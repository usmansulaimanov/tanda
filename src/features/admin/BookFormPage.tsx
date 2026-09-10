import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Headphones,
  BookOpen,
  Image as ImageIcon,
  Check,
} from 'lucide-react';
import { useBookStore } from '../../store/useBookStore';
import { useToastStore } from '../../store/useToastStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { AudioChapter } from '../../types';

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

  // Populate data if editing
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

  // Handle Cover image file upload (convert to Base64 data url)
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

  // Add chapter
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

  // Submit handler
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
      showToast('Жаңа кітап сәтті қосылды және сақталды!', 'success');
    }

    // Automatically navigate back to admin dashboard
    navigate('/admin');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/admin')}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Әкімші панеліне оралу
        </button>

        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
          {isEditing ? 'Кітапты өңдеу' : 'Жаңа кітап қосу'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Book Details Card */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
          <h2 className="text-lg font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#0057A8]" />
            Негізгі ақпарат
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Input
              label="Кітап атауы *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Мысалы: Абай жолы"
              required
            />

            <Input
              label="Авторы *"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Мысалы: Мұхтар Әуезов"
              required
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Санаты *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-[#0057A8] outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <Input
              label="Бет саны"
              type="number"
              value={pages}
              onChange={(e) => setPages(e.target.value)}
              placeholder="Мысалы: 350"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Кітап мазмұны / сипаттамасы
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Кітаптың қысқаша мазмұнын енгізіңіз..."
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-[#0057A8] outline-none"
            />
          </div>

          {/* Is Free Toggle */}
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <input
              type="checkbox"
              id="isFree"
              checked={isFree}
              onChange={(e) => setIsFree(e.target.checked)}
              className="w-4 h-4 text-[#0057A8] rounded accent-[#0057A8]"
            />
            <label htmlFor="isFree" className="text-sm font-medium text-slate-800 cursor-pointer">
              Бұл кітап тегін қолжетімді (оқырмандар ақысыз оқи алады)
            </label>
          </div>
        </div>

        {/* Cover / Gradient Design Card */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
          <h2 className="text-lg font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-[#F08000]" />
            Мұқаба және Дизайн
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
            {/* Gradient Presets */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                Градиентті түс үлгісін таңдау
              </label>
              <div className="grid grid-cols-2 gap-2">
                {GRADIENT_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => {
                      setGradient(preset.value);
                      setCoverImage('');
                    }}
                    className={`h-12 rounded-xl flex items-center justify-between px-3 text-white text-xs font-semibold shadow-sm transition-transform active:scale-95 ${
                      gradient === preset.value && !coverImage ? 'ring-2 ring-offset-2 ring-slate-800' : ''
                    }`}
                    style={{ background: preset.value }}
                  >
                    <span>{preset.name}</span>
                    {gradient === preset.value && !coverImage && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Cover Image */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                Немесе сурет файлын жүктеу
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#0057A8] hover:file:bg-blue-100 cursor-pointer"
              />

              {/* Preview */}
              <div className="mt-4 flex items-center gap-4">
                <div
                  className="w-20 h-28 rounded-xl shadow-md flex items-center justify-center text-white text-xs font-bold p-2 text-center"
                  style={{
                    background: coverImage ? `url(${coverImage}) center/cover` : gradient,
                  }}
                >
                  {!coverImage && (title || 'Мұқаба')}
                </div>
                <div className="text-xs text-slate-500">
                  Алдын ала көрініс (Preview)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Audiobook Section */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Headphones className="w-5 h-5 text-[#F08000]" />
              Аудиокітап баптаулары
            </h2>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="hasAudio"
                checked={hasAudio}
                onChange={(e) => setHasAudio(e.target.checked)}
                className="w-4 h-4 text-[#0057A8] rounded accent-[#0057A8]"
              />
              <label htmlFor="hasAudio" className="text-sm font-medium text-slate-800 cursor-pointer">
                Аудио нұсқасы бар
              </label>
            </div>
          </div>

          {hasAudio && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Input
                  label="Диктор / Дыбыстаған"
                  value={audioNarrator}
                  onChange={(e) => setAudioNarrator(e.target.value)}
                  placeholder="Мысалы: Берік Айтжанов"
                />

                <Input
                  label="Жалпы ұзақтығы"
                  value={audioDuration}
                  onChange={(e) => setAudioDuration(e.target.value)}
                  placeholder="Мысалы: 2 сағат 15 минут"
                />
              </div>

              {/* Chapters list */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800">Тараулар тізімі ({audioChapters.length})</h3>
                  <Button type="button" size="sm" variant="outline" onClick={addChapter} className="gap-1">
                    <Plus className="w-3.5 h-3.5" /> Тарау қосу
                  </Button>
                </div>

                <div className="space-y-2">
                  {audioChapters.map((ch, idx) => (
                    <div key={ch.id || idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-xs font-mono font-bold text-slate-400 w-6 text-center">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={ch.title}
                        onChange={(e) => updateChapter(idx, 'title', e.target.value)}
                        placeholder="Тарау атауы"
                        className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                      />
                      <input
                        type="text"
                        value={ch.duration}
                        onChange={(e) => updateChapter(idx, 'duration', e.target.value)}
                        placeholder="03:45"
                        className="w-24 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => removeChapter(idx)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                        title="Өшіру"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {audioChapters.length === 0 && (
                    <p className="text-xs text-slate-400 italic">Тараулар қосылмаған. Тарау қосу үшін жоғарыдағы батырманы басыңыз.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit & Cancel Actions */}
        <div className="flex items-center justify-end gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/admin')}
          >
            Болдырмау
          </Button>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="gap-2 shadow-md"
          >
            <Save className="w-5 h-5" />
            Сақтау
          </Button>
        </div>
      </form>
    </div>
  );
};
