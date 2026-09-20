import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useNewsStore } from '../../store/useNewsStore';
import { useMessageStore } from '../../store/useMessageStore';
import { useToastStore } from '../../store/useToastStore';
import { useAuthStore } from '../../store/useAuthStore';
import { hasAdminPermission } from '../../utils/permissions';
import { resizeAndCompressImage } from '../../utils/imageUtils';
import {
  ArrowLeft,
  Upload,
  X,
  Image as ImageIcon,
  Globe,
  FileText,
  CheckCircle2,
  Sparkles,
  Plus,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Check,
} from 'lucide-react';

interface CalendarDateTimePickerProps {
  value: string; // ISO string or empty
  onChange: (value: string) => void;
  maxYear?: number;
  placeholder?: string;
  helperText?: string;
  disableFuture?: boolean;
  disablePast?: boolean;
}

const MONTH_NAMES_KK = [
  'Қаңтар',
  'Ақпан',
  'Наурыз',
  'Сәуір',
  'Мамыр',
  'Маусым',
  'Шілде',
  'Тамыз',
  'Қыркүйек',
  'Қазан',
  'Қараша',
  'Желтоқсан',
];

const WEEKDAYS_KK = ['Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сб', 'Жк'];

const CalendarDateTimePicker: React.FC<CalendarDateTimePickerProps> = ({
  value,
  onChange,
  maxYear = new Date().getFullYear(),
  placeholder = 'Күнтізбеден таңдау',
  helperText,
  disableFuture = false,
  disablePast = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const initialDate = value ? new Date(value) : new Date();
  const validInitialDate = isNaN(initialDate.getTime()) ? new Date() : initialDate;

  const [viewYear, setViewYear] = useState(Math.min(validInitialDate.getFullYear(), maxYear));
  const [viewMonth, setViewMonth] = useState(validInitialDate.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(value ? validInitialDate.getDate() : null);
  const [selectedHour, setSelectedHour] = useState<number>(validInitialDate.getHours());
  const [selectedMinute, setSelectedMinute] = useState<number>(validInitialDate.getMinutes());

  const now = new Date();
  const currentActualYear = now.getFullYear();
  const currentActualMonth = now.getMonth();
  const currentActualDate = now.getDate();
  const currentActualHour = now.getHours();
  const currentActualMinute = now.getMinutes();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setViewYear(Math.min(d.getFullYear(), maxYear));
        setViewMonth(d.getMonth());
        setSelectedDay(d.getDate());
        setSelectedHour(d.getHours());
        setSelectedMinute(d.getMinutes());
      }
    } else {
      setSelectedDay(null);
    }
  }, [value, maxYear]);

  const canGoNextMonth = () => {
    if (disableFuture) {
      if (viewYear > currentActualYear) return false;
      if (viewYear === currentActualYear && viewMonth >= currentActualMonth) return false;
    }
    if (viewYear >= maxYear && viewMonth === 11) return false;
    return true;
  };

  const canGoPrevMonth = () => {
    if (disablePast) {
      if (viewYear < currentActualYear) return false;
      if (viewYear === currentActualYear && viewMonth <= currentActualMonth) return false;
    }
    return true;
  };

  const handlePrevMonth = () => {
    if (!canGoPrevMonth()) return;
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (!canGoNextMonth()) return;
    if (viewMonth === 11) {
      if (viewYear < maxYear) {
        setViewMonth(0);
        setViewYear((prev) => prev + 1);
      }
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const rawFirstDay = new Date(viewYear, viewMonth, 1).getDay();
  const firstDayIndex = (rawFirstDay + 6) % 7;

  const isDaySelectedToday =
    viewYear === currentActualYear &&
    viewMonth === currentActualMonth &&
    ((selectedDay !== null && selectedDay === currentActualDate) ||
      (selectedDay === null && viewYear === currentActualYear && viewMonth === currentActualMonth));

  const handleSelectDay = (day: number) => {
    setSelectedDay(day);
    let h = selectedHour;
    let m = selectedMinute;

    const isTargetToday =
      viewYear === currentActualYear &&
      viewMonth === currentActualMonth &&
      day === currentActualDate;

    if (disableFuture && isTargetToday) {
      if (h > currentActualHour) {
        h = currentActualHour;
        m = Math.min(m, currentActualMinute);
      } else if (h === currentActualHour && m > currentActualMinute) {
        m = currentActualMinute;
      }
    }

    if (disablePast && isTargetToday) {
      if (h < currentActualHour) {
        h = currentActualHour;
        m = Math.max(m, currentActualMinute);
      } else if (h === currentActualHour && m < currentActualMinute) {
        m = currentActualMinute;
      }
    }

    setSelectedHour(h);
    setSelectedMinute(m);
    const newDate = new Date(viewYear, viewMonth, day, h, m);
    onChange(newDate.toISOString());
  };

  const handleTimeChange = (newHour: number, newMinute: number) => {
    const day = selectedDay || currentActualDate;
    let h = newHour;
    let m = newMinute;

    const isTargetToday =
      viewYear === currentActualYear &&
      viewMonth === currentActualMonth &&
      day === currentActualDate;

    if (disableFuture && isTargetToday) {
      if (h > currentActualHour) {
        h = currentActualHour;
      }
      if (h === currentActualHour && m > currentActualMinute) {
        m = currentActualMinute;
      }
    }

    if (disablePast && isTargetToday) {
      if (h < currentActualHour) {
        h = currentActualHour;
      }
      if (h === currentActualHour && m < currentActualMinute) {
        m = currentActualMinute;
      }
    }

    setSelectedHour(h);
    setSelectedMinute(m);
    const newDate = new Date(viewYear, viewMonth, day, h, m);
    onChange(newDate.toISOString());
  };

  const handleSetNow = () => {
    const current = new Date();
    setViewYear(Math.min(current.getFullYear(), maxYear));
    setViewMonth(current.getMonth());
    setSelectedDay(current.getDate());
    setSelectedHour(current.getHours());
    setSelectedMinute(current.getMinutes());
    onChange(current.toISOString());
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDay(null);
    onChange('');
  };

  const formatDisplayValue = () => {
    if (!value) return '';
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return '';
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day}.${month}.${year}, ${hours}:${minutes}`;
    } catch {
      return '';
    }
  };

  const displayString = formatDisplayValue();

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Trigger Input Box */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '10px 14px',
          borderRadius: '8px',
          border: isOpen ? '1.5px solid var(--blue)' : '1.5px solid #CBD5E1',
          background: '#FFFFFF',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          boxSizing: 'border-box',
          transition: 'all 0.15s ease',
          boxShadow: isOpen ? '0 0 0 3px rgba(0, 87, 168, 0.1)' : 'none',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
          <CalendarIcon size={16} color={displayString ? 'var(--blue)' : '#94A3B8'} style={{ flexShrink: 0 }} />
          <span
            style={{
              fontSize: '13px',
              fontWeight: displayString ? 700 : 500,
              color: displayString ? 'var(--text-dark)' : '#94A3B8',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {displayString || placeholder}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {displayString && (
            <button
              type="button"
              onClick={handleClear}
              style={{
                background: '#F1F5F9',
                border: 'none',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748B',
                padding: 0,
              }}
              title="Тазарту (қазіргі уақытқа қайтару)"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {helperText ? (
        <p style={{ fontSize: '11px', color: '#64748B', margin: '6px 0 0 0' }}>
          {helperText}
        </p>
      ) : null}

      {/* Calendar Dropdown Popover */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: 0,
            zIndex: 9999,
            width: '320px',
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 -8px 30px rgba(0, 0, 0, 0.15)',
            padding: '16px',
            boxSizing: 'border-box',
          }}
        >
          {/* Header: Month & Year Navigator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
              paddingBottom: '8px',
              borderBottom: '1px solid #F1F5F9',
            }}
          >
            <button
              type="button"
              onClick={handlePrevMonth}
              disabled={!canGoPrevMonth()}
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: !canGoPrevMonth() ? 'not-allowed' : 'pointer',
                color: !canGoPrevMonth() ? '#CBD5E1' : 'var(--text-dark)',
                opacity: !canGoPrevMonth() ? 0.4 : 1,
              }}
            >
              <ChevronLeft size={16} />
            </button>

            <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-dark)' }}>
              {MONTH_NAMES_KK[viewMonth]} {viewYear}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              disabled={!canGoNextMonth()}
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: !canGoNextMonth() ? 'not-allowed' : 'pointer',
                color: !canGoNextMonth() ? '#CBD5E1' : 'var(--text-dark)',
                opacity: !canGoNextMonth() ? 0.4 : 1,
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Weekdays Row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              textAlign: 'center',
              marginBottom: '6px',
            }}
          >
            {WEEKDAYS_KK.map((wd, i) => (
              <span
                key={i}
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: i >= 5 ? '#EF4444' : '#94A3B8',
                  padding: '4px 0',
                }}
              >
                {wd}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '4px',
              marginBottom: '14px',
            }}
          >
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} style={{ height: '34px' }} />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isSelected =
                selectedDay === day &&
                viewMonth === (value ? new Date(value).getMonth() : -1) &&
                viewYear === (value ? new Date(value).getFullYear() : -1);

              const isToday =
                currentActualDate === day &&
                currentActualMonth === viewMonth &&
                currentActualYear === viewYear;

              const isFutureDay =
                disableFuture &&
                (viewYear > currentActualYear ||
                  (viewYear === currentActualYear && viewMonth > currentActualMonth) ||
                  (viewYear === currentActualYear && viewMonth === currentActualMonth && day > currentActualDate));

              const isPastDay =
                disablePast &&
                (viewYear < currentActualYear ||
                  (viewYear === currentActualYear && viewMonth < currentActualMonth) ||
                  (viewYear === currentActualYear && viewMonth === currentActualMonth && day < currentActualDate));

              const isDayDisabled = isFutureDay || isPastDay;

              return (
                <button
                  key={day}
                  type="button"
                  disabled={isDayDisabled}
                  onClick={() => !isDayDisabled && handleSelectDay(day)}
                  style={{
                    height: '34px',
                    borderRadius: '8px',
                    border: isToday && !isSelected ? '1.5px solid var(--blue)' : 'none',
                    background: isSelected
                      ? 'var(--blue)'
                      : isToday
                      ? 'rgba(0, 87, 168, 0.08)'
                      : 'transparent',
                    color: isDayDisabled
                      ? '#CBD5E1'
                      : isSelected
                      ? '#FFFFFF'
                      : isToday
                      ? 'var(--blue)'
                      : 'var(--text-dark)',
                    fontSize: '12px',
                    fontWeight: isSelected || isToday ? 800 : 500,
                    cursor: isDayDisabled ? 'not-allowed' : 'pointer',
                    opacity: isDayDisabled ? 0.35 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.1s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected && !isDayDisabled) e.currentTarget.style.background = '#F1F5F9';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected && !isDayDisabled) {
                      e.currentTarget.style.background = isToday ? 'rgba(0, 87, 168, 0.08)' : 'transparent';
                    }
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Time Picker Section */}
          <div
            style={{
              padding: '10px 12px',
              borderRadius: '10px',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              marginBottom: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dark)' }}>
                <Clock size={14} color="var(--blue)" />
                Уақыты:
              </div>
              <span style={{ fontSize: '11px', color: '#64748B' }}>24 сағаттық</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {/* Hours Select */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '11px', color: '#64748B' }}>Сағат:</span>
                <select
                  value={selectedHour}
                  onChange={(e) => handleTimeChange(parseInt(e.target.value, 10), selectedMinute)}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: '1.5px solid #CBD5E1',
                    background: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'var(--text-dark)',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  {Array.from({ length: 24 }).map((_, h) => {
                    const isHourDisabled =
                      (disableFuture && isDaySelectedToday && h > currentActualHour) ||
                      (disablePast && isDaySelectedToday && h < currentActualHour);
                    return (
                      <option key={h} value={h} disabled={isHourDisabled}>
                        {String(h).padStart(2, '0')}
                      </option>
                    );
                  })}
                </select>
              </div>

              <span style={{ fontSize: '14px', fontWeight: 900, color: '#94A3B8' }}>:</span>

              {/* Minutes Select */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '11px', color: '#64748B' }}>Мин:</span>
                <select
                  value={selectedMinute}
                  onChange={(e) => handleTimeChange(selectedHour, parseInt(e.target.value, 10))}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: '1.5px solid #CBD5E1',
                    background: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'var(--text-dark)',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  {Array.from({ length: 60 }).map((_, m) => {
                    const isMinuteDisabled =
                      (disableFuture && isDaySelectedToday && selectedHour === currentActualHour && m > currentActualMinute) ||
                      (disablePast && isDaySelectedToday && selectedHour === currentActualHour && m < currentActualMinute);
                    return (
                      <option key={m} value={m} disabled={isMinuteDisabled}>
                        {String(m).padStart(2, '0')}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>

          {/* Quick Actions Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <button
              type="button"
              onClick={handleSetNow}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--text-mid)',
                cursor: 'pointer',
              }}
            >
              Қазіргі уақыт
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="btn-primary"
              style={{
                padding: '6px 16px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Check size={13} />
              Дайын
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const AdminNewsFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { articles, addArticle, updateArticle, getArticleById } = useNewsStore();
  const { showToast } = useToastStore();
  const { user, role } = useAuthStore();

  useEffect(() => {
    if (role !== 'admin' || !hasAdminPermission(user, 'news_manage')) {
      showToast('Бұл бөлімге кіруге рұқсатыңыз жоқ', 'error');
      navigate('/admin', { replace: true });
    }
  }, [role, user, navigate, showToast]);

  const isEditing = Boolean(id);
  const existingArticle = id ? getArticleById(id) || articles.find((a) => a.id === id) : null;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [publishDateTime, setPublishDateTime] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [isDraft, setIsDraft] = useState(false);

  const currentYear = new Date().getFullYear();

  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (existingArticle) {
      setTitle(existingArticle.title);
      setContent(existingArticle.content);
      setSummary(existingArticle.summary || '');
      const existingImages = existingArticle.images && existingArticle.images.length > 0
        ? existingArticle.images
        : (existingArticle.imageUrl ? [existingArticle.imageUrl] : []);
      setImages(existingImages);
      setLinkUrl(existingArticle.linkUrl || '');
      setLinkText(existingArticle.linkText || '');
      setAuthorName(existingArticle.authorName === 'Tanda News' ? '' : (existingArticle.authorName || ''));
      setPublishDateTime(existingArticle.publishedAt ? new Date(existingArticle.publishedAt).toISOString() : '');
      const hasScheduled = Boolean(existingArticle.scheduledAt && new Date(existingArticle.scheduledAt).getTime() > Date.now());
      setIsScheduled(hasScheduled);
      setScheduledDateTime(existingArticle.scheduledAt ? new Date(existingArticle.scheduledAt).toISOString() : '');
      setIsDraft(!existingArticle.isPublished);
    } else {
      setAuthorName('');
      setPublishDateTime('');
      setIsScheduled(false);
      setScheduledDateTime('');
      setIsDraft(false);
    }
  }, [existingArticle, user]);

  const handleImageFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingImage(true);
    try {
      const newImages: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
          const dataUrl = await resizeAndCompressImage(file, 1200, 0.85);
          newImages.push(dataUrl);
        }
      }
      if (newImages.length > 0) {
        setImages((prev) => [...prev, ...newImages]);
        showToast(`${newImages.length} сурет сәтті жүктелді!`, 'success');
      }
    } catch {
      showToast('Суреттерді жүктеу кезінде қате орын алды', 'error');
    } finally {
      setIsUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleAddUrlImage = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    setImages((prev) => [...prev, trimmed]);
    setUrlInput('');
    showToast('Сурет сілтеме бойынша қосылды!', 'success');
  };

  const removeImageAtIndex = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const moveImageToPrimary = (index: number) => {
    if (index === 0) return;
    setImages((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.unshift(item);
      return copy;
    });
    showToast('Басты мұқаба суреті ауыстырылды', 'info');
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
    const finalAuthor = authorName.trim() ? authorName.trim() : 'Tanda News';

    let finalPublishedAt: string = new Date().toISOString();
    if (publishDateTime.trim()) {
      const parsedDate = new Date(publishDateTime);
      if (!isNaN(parsedDate.getTime())) {
        if (!isScheduled && parsedDate.getTime() > Date.now()) {
          setFormError('Жоспарланбаған жаңалықтың сайтта көрсетілетін уақыты қазіргі уақыттан кейінгі (болашақ) бола алмайды');
          return;
        }
        if (parsedDate.getFullYear() > currentYear) {
          setFormError(`Сайтта көрсетілетін жыл ағымдағы жылдан (${currentYear}) аспауы тиіс`);
          return;
        }
        finalPublishedAt = parsedDate.toISOString();
      }
    }

    let finalScheduledAt: string | undefined = undefined;
    if (isScheduled && !isDraft) {
      if (!scheduledDateTime.trim()) {
        setFormError('Жоспарланған жариялаудың нақты уақытын күнтізбеден таңдаңыз');
        return;
      }
      const schedDate = new Date(scheduledDateTime);
      if (isNaN(schedDate.getTime())) {
        setFormError('Жоспарланған жариялау уақыты дұрыс емес');
        return;
      }
      if (schedDate.getTime() <= Date.now()) {
        setFormError('Жоспарланған уақыт қазіргі уақыттан кейінгі (болашақ) болуы тиіс');
        return;
      }
      finalScheduledAt = schedDate.toISOString();
      // Жоспарланған контент сайтта дәл осы белгіленген уақытта шығады және сайтта осы уақыт көрсетіледі
      finalPublishedAt = finalScheduledAt;
    }

    setIsSubmitting(true);

    try {
      // Алдын өтіп кеткен жаңалықтарға (өткен уақыт таңдалса) уведомление жіберілмейді
      const isPastPublishDate = publishDateTime.trim() && (Date.now() - new Date(publishDateTime).getTime() > 60000);

      if (isEditing && existingArticle) {
        const isNowPublishingImmediate = !isDraft && !finalScheduledAt && !existingArticle.notifiedAt && !isPastPublishDate;
        let finalNotifiedAt: string | undefined = undefined;
        if (finalScheduledAt || isDraft) {
          finalNotifiedAt = undefined;
        } else if (isNowPublishingImmediate || isPastPublishDate) {
          finalNotifiedAt = new Date().toISOString();
        } else {
          finalNotifiedAt = existingArticle.notifiedAt;
        }

        const res = await updateArticle(existingArticle.id, {
          title: title.trim(),
          content: content.trim(),
          summary: summary.trim() || undefined,
          imageUrl: images.length > 0 ? images[0] : undefined,
          images: images,
          linkUrl: linkUrl.trim() || undefined,
          linkText: linkText.trim() || undefined,
          authorName: finalAuthor,
          publishedAt: finalPublishedAt,
          scheduledAt: finalScheduledAt,
          isPublished: !isDraft,
          notifiedAt: finalNotifiedAt,
        });
        if (res.success) {
          if (isNowPublishingImmediate) {
            useMessageStore.getState().sendMessage({
              title: title.trim(),
              content: summary.trim() || (content.trim().length > 180 ? content.trim().substring(0, 180) + '...' : content.trim()),
              targetType: 'all',
              priority: 'news',
              senderName: finalAuthor,
              newsId: existingArticle.id,
              newsTitle: title.trim(),
              canReaderDelete: true,
            });
          }
          showToast('Жаңалық сәтті жаңартылды!', 'success');
          navigate('/admin/news');
        } else {
          setFormError(res.error || 'Қате орын алды');
        }
      } else {
        const isImmediatePublish = !isDraft && !finalScheduledAt && !isPastPublishDate;
        const res = await addArticle({
          title: title.trim(),
          content: content.trim(),
          summary: summary.trim() || undefined,
          imageUrl: images.length > 0 ? images[0] : undefined,
          images: images,
          linkUrl: linkUrl.trim() || undefined,
          linkText: linkText.trim() || undefined,
          authorName: finalAuthor,
          publishedAt: finalPublishedAt,
          scheduledAt: finalScheduledAt,
          isPublished: !isDraft,
        });
        if (res.success && res.article) {
          if (isImmediatePublish) {
            await updateArticle(res.article.id, { notifiedAt: new Date().toISOString() });
            useMessageStore.getState().sendMessage({
              title: title.trim(),
              content: summary.trim() || (content.trim().length > 180 ? content.trim().substring(0, 180) + '...' : content.trim()),
              targetType: 'all',
              priority: 'news',
              senderName: finalAuthor,
              newsId: res.article.id,
              newsTitle: title.trim(),
              canReaderDelete: true,
            });
          } else if (isPastPublishDate) {
            await updateArticle(res.article.id, { notifiedAt: new Date().toISOString() });
          }

          if (isDraft) {
            showToast('Кейінге сақталды!', 'success');
          } else if (finalScheduledAt) {
            showToast('Жаңалық белгіленген уақытқа жоспарланды!', 'success');
          } else {
            showToast('Жаңалық сәтті жарияланды!', 'success');
          }
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
    <section className="admin-page-section" style={{ minHeight: '85vh', paddingBottom: '120px' }}>
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
            marginBottom: '28px',
          }}
        >
          <h1 style={{ fontSize: '26px', fontWeight: 900, color: 'var(--text-dark)', margin: 0 }}>
            {isEditing ? 'Жаңалықты өңдеу' : 'Жаңа жаңалық'}
          </h1>
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

          {/* Secondary Card: Images (Multi-image management) */}
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
                <ImageIcon size={20} />
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>
                Суреттер
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Upload & Add URL controls */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  multiple
                  onChange={handleImageFilesChange}
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
                    padding: '10px 18px',
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

                <div style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '260px' }}>
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddUrlImage();
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '9px 14px',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '13px',
                      background: '#FFFFFF',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddUrlImage}
                    disabled={!urlInput.trim()}
                    style={{
                      padding: '9px 16px',
                      borderRadius: '8px',
                      background: urlInput.trim() ? 'var(--blue)' : '#E2E8F0',
                      color: urlInput.trim() ? '#FFFFFF' : '#94A3B8',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: urlInput.trim() ? 'pointer' : 'not-allowed',
                      transition: 'all 0.15s ease',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Plus size={14} />
                    Қосу
                  </button>
                </div>
              </div>

              {/* Images Grid */}
              {images.length > 0 ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '14px',
                    marginTop: '8px',
                  }}
                >
                  {images.map((imgSrc, idx) => (
                    <div
                      key={idx}
                      style={{
                        position: 'relative',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        border: '1.5px solid #CBD5E1',
                        background: '#F1F5F9',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      {/* Thumbnail Container */}
                      <div style={{ height: '140px', width: '100%', position: 'relative' }}>
                        <img
                          src={imgSrc}
                          alt={`Сурет ${idx + 1}`}
                          referrerPolicy="no-referrer"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />

                        {/* Position Badge */}
                        <div
                          style={{
                            position: 'absolute',
                            top: '8px',
                            left: '8px',
                            background: 'rgba(15, 23, 42, 0.85)',
                            color: '#FFFFFF',
                            fontSize: '12px',
                            fontWeight: 800,
                            minWidth: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0 6px',
                            borderRadius: '6px',
                            backdropFilter: 'blur(4px)',
                          }}
                        >
                          {idx + 1}
                        </div>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => removeImageAtIndex(idx)}
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            background: 'rgba(220, 38, 38, 0.85)',
                            backdropFilter: 'blur(4px)',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '50%',
                            width: '26px',
                            height: '26px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          title="Суретті өшіру"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      {/* Action to promote to primary */}
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => moveImageToPrimary(idx)}
                          style={{
                            padding: '7px',
                            background: '#FFFFFF',
                            borderTop: '1px solid #E2E8F0',
                            borderLeft: 'none',
                            borderRight: 'none',
                            borderBottom: 'none',
                            color: 'var(--blue)',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#EFF6FF')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = '#FFFFFF')}
                        >
                          Басты сурет (мұқаба) ету
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}

              {/* External Link Section */}
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
                  background: 'rgba(0, 87, 168, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--blue)',
                }}
              >
                <Sparkles size={20} />
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>
                Жариялау және Автор
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Row 1: Author & Standard Publish Date (when not scheduled) */}
              <div style={{ display: 'grid', gridTemplateColumns: !isScheduled ? 'repeat(auto-fit, minmax(280px, 1fr))' : '1fr', gap: '20px', alignItems: 'start' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '8px' }}>
                    Автор
                  </label>
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="Tanda news"
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

                {!isScheduled && (
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '8px' }}>
                      Күні
                    </label>
                    <CalendarDateTimePicker
                      value={publishDateTime}
                      onChange={(val) => setPublishDateTime(val)}
                      maxYear={currentYear}
                      disableFuture={true}
                      placeholder="Күнтізбеден таңдау"
                    />
                  </div>
                )}
              </div>

              {/* Row 2: Toggles Grid (Scheduled & Draft) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', alignItems: 'start' }}>
                {/* Scheduled Toggle Card with embedded Date/Time Picker */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '18px 20px',
                    borderRadius: '12px',
                    background: isScheduled && !isDraft ? 'rgba(0, 87, 168, 0.04)' : '#F8FAFC',
                    border: isScheduled && !isDraft ? '1.5px solid var(--blue)' : '1px solid #E2E8F0',
                    transition: 'all 0.2s ease',
                    boxShadow: isScheduled && !isDraft ? '0 4px 16px rgba(0, 87, 168, 0.08)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ paddingRight: '8px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: isScheduled && !isDraft ? 'var(--blue)' : 'var(--text-dark)' }}>
                        Жоспарланған контент
                      </div>
                    </div>

                    <label
                      style={{
                        position: 'relative',
                        display: 'inline-block',
                        width: '46px',
                        height: '24px',
                        cursor: isDraft ? 'not-allowed' : 'pointer',
                        opacity: isDraft ? 0.5 : 1,
                        flexShrink: 0,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isScheduled}
                        disabled={isDraft}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setIsScheduled(checked);
                          if (!checked && publishDateTime && new Date(publishDateTime).getTime() > Date.now()) {
                            setPublishDateTime(new Date().toISOString());
                          }
                        }}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          cursor: isDraft ? 'not-allowed' : 'pointer',
                          inset: 0,
                          backgroundColor: isScheduled && !isDraft ? 'var(--blue)' : '#CBD5E1',
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
                            left: isScheduled && !isDraft ? '24px' : '3px',
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

                  {/* Calendar Picker rendered directly when Scheduled is toggled ON */}
                  {isScheduled && !isDraft && (
                    <div
                      style={{
                        marginTop: '16px',
                        paddingTop: '16px',
                        borderTop: '1.5px dashed rgba(0, 87, 168, 0.25)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: 'var(--text-dark)' }}>
                        Қашан жарияланатынын таңдаңыз (Күн мен сағат) <span style={{ color: '#DC2626' }}>*</span>
                      </label>
                      <CalendarDateTimePicker
                        value={scheduledDateTime}
                        onChange={(val) => setScheduledDateTime(val)}
                        maxYear={currentYear + 5}
                        disablePast={true}
                        placeholder="Күнтізбеден болашақ уақытты таңдаңыз"
                        helperText={
                          scheduledDateTime
                            ? new Date(scheduledDateTime).getTime() > Date.now()
                              ? 'Жаңалық дәл осы уақытта сайтқа автоматты түрде шығады және сайтта осы уақыт көрсетіледі'
                              : 'Жоспарланған уақыт қазіргі уақыттан кейінгі (болашақ) болуы қажет'
                            : 'Күнтізбеден жарияланатын күн мен уақытты таңдаңыз'
                        }
                      />
                    </div>
                  )}
                </div>

                {/* Draft Toggle Card */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '18px 20px',
                    borderRadius: '12px',
                    background: isDraft ? 'rgba(100, 116, 139, 0.08)' : '#F8FAFC',
                    border: isDraft ? '1.5px solid #94A3B8' : '1px solid #E2E8F0',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ paddingRight: '12px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: isDraft ? '#475569' : 'var(--text-dark)' }}>
                      Кейінге сақтау
                    </div>
                  </div>

                  <label
                    style={{
                      position: 'relative',
                      display: 'inline-block',
                      width: '46px',
                      height: '24px',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isDraft}
                      onChange={(e) => {
                        setIsDraft(e.target.checked);
                      }}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        cursor: 'pointer',
                        inset: 0,
                        backgroundColor: isDraft ? '#64748B' : '#CBD5E1',
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
                          left: isDraft ? '24px' : '3px',
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
              {isSubmitting
                ? 'Сақталуда...'
                : isEditing
                ? 'Өзгерістерді сақтау'
                : 'Жариялау'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};
