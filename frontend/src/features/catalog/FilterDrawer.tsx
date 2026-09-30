import React, { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';

type SortBy = 'default' | 'popular' | 'newest' | 'alpha-asc' | 'alpha-desc';
type FormatFilter = 'all' | 'audio' | 'ebook';
type AccessFilter = 'all' | 'free' | 'premium';

export interface FilterState {
  selectedAuthor: string;
  selectedNarrator: string;
  formatFilter: FormatFilter;
  accessFilter: AccessFilter;
  sortBy: SortBy;
}

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onApply: (filters: FilterState) => void;
  authorsList: { name: string; count: number }[];
  narratorsList: { name: string; count: number }[];
}

type SectionKey = 'sort' | 'author' | 'narrator' | 'format' | 'access';

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'default', label: 'Әдепкі бойынша' },
  { value: 'popular', label: 'Танымалдығы бойынша' },
  { value: 'newest', label: 'Ең соңғы қосылғандар' },
  { value: 'alpha-asc', label: 'Атауы бойынша (А–Я)' },
  { value: 'alpha-desc', label: 'Атауы бойынша (Я–А)' },
];

const FORMAT_OPTIONS: { value: FormatFilter; label: string }[] = [
  { value: 'all', label: 'Барлық формат' },
  { value: 'audio', label: '🎧 Тек аудиокітаптар' },
  { value: 'ebook', label: '📖 Тек э-кітаптар' },
];

const ACCESS_OPTIONS: { value: AccessFilter; label: string }[] = [
  { value: 'all', label: 'Барлық кітаптар' },
  { value: 'free', label: 'Тегін кітаптар' },
  { value: 'premium', label: '👑 Tanda Premium' },
];

export const FilterDrawer: React.FC<FilterDrawerProps> = ({
  isOpen,
  onClose,
  filters,
  onApply,
  authorsList,
  narratorsList,
}) => {
  // Local draft state — only applied when user taps "Қолдану"
  const [draft, setDraft] = useState<FilterState>(filters);
  const [openSections, setOpenSections] = useState<Set<SectionKey>>(new Set(['sort']));
  const [isVisible, setIsVisible] = useState(false);

  // Sync draft when drawer opens
  useEffect(() => {
    if (isOpen) {
      setDraft(filters);
      setIsVisible(true);
    }
  }, [isOpen, filters]);

  // Animate out before unmounting
  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 280);
  };

  const toggleSection = (key: SectionKey) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const resetDraft = () => {
    setDraft({
      selectedAuthor: 'all',
      selectedNarrator: 'all',
      formatFilter: 'all',
      accessFilter: 'all',
      sortBy: 'default',
    });
  };

  const handleApply = () => {
    onApply(draft);
    handleClose();
  };

  const activeDraftCount = [
    draft.selectedAuthor !== 'all',
    draft.selectedNarrator !== 'all',
    draft.formatFilter !== 'all',
    draft.accessFilter !== 'all',
    draft.sortBy !== 'default',
  ].filter(Boolean).length;

  if (!isOpen && !isVisible) return null;

  const sectionHeader = (key: SectionKey, label: string, activeLabel?: string) => {
    const isExpanded = openSections.has(key);
    return (
      <button
        type="button"
        onClick={() => toggleSection(key)}
        className="w-full flex items-center justify-between py-4 px-0 text-left group"
        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <span
          className="font-bold text-base"
          style={{ color: activeLabel ? '#005494' : '#1E293B' }}
        >
          {label}
          {activeLabel && (
            <span
              className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(0,84,148,0.1)', color: '#005494' }}
            >
              {activeLabel}
            </span>
          )}
        </span>
        <span className="text-sm font-medium" style={{ color: '#94A3B8' }}>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </span>
      </button>
    );
  };

  const radioOption = <T extends string>(
    value: T,
    label: string,
    current: T,
    onChange: (v: T) => void,
  ) => {
    const checked = value === current;
    return (
      <label
        key={value}
        className="flex items-center gap-3 py-3 px-1 cursor-pointer"
        style={{ borderBottom: '1px solid #F1F5F9' }}
      >
        {/* Custom radio */}
        <span
          className="shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
          style={{
            borderColor: checked ? '#005494' : '#CBD5E1',
            background: checked ? '#005494' : '#fff',
          }}
          onClick={() => onChange(value)}
        >
          {checked && (
            <span className="w-2 h-2 rounded-full bg-white" />
          )}
        </span>
        <span
          className="text-sm font-semibold flex-1"
          style={{ color: checked ? '#005494' : '#334155' }}
          onClick={() => onChange(value)}
        >
          {label}
        </span>
      </label>
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[950] transition-opacity duration-280"
        style={{
          background: 'rgba(0,0,0,0.45)',
          opacity: isVisible ? 1 : 0,
          backdropFilter: 'blur(2px)',
        }}
        onClick={handleClose}
      />

      {/* Drawer panel — slides in from right */}
      <div
        className="fixed top-0 right-0 bottom-0 z-[960] flex flex-col"
        style={{
          width: 'min(100vw, 420px)',
          background: '#FFFFFF',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
          transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.28s cubic-bezier(0.32,0,0.67,0)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid #F1F5F9' }}
        >
          <button
            type="button"
            onClick={handleClose}
            className="flex items-center gap-2 font-bold text-base active:opacity-60 transition-opacity"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1E293B' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Сүзгі
            {activeDraftCount > 0 && (
              <span
                className="w-5 h-5 rounded-full text-white text-xs font-black flex items-center justify-center"
                style={{ background: '#005494' }}
              >
                {activeDraftCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={resetDraft}
            className="text-sm font-semibold active:opacity-60 transition-opacity"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF7E00' }}
          >
            Тазалау
          </button>
        </div>

        {/* Scrollable sections */}
        <div className="flex-1 overflow-y-auto px-5">

          {/* 1. Сұрыптау */}
          <div style={{ borderBottom: '1px solid #F1F5F9' }}>
            {sectionHeader(
              'sort',
              'Сұрыптау',
              draft.sortBy !== 'default'
                ? SORT_OPTIONS.find((o) => o.value === draft.sortBy)?.label
                : undefined,
            )}
            {openSections.has('sort') && (
              <div className="pb-2">
                {SORT_OPTIONS.map((opt) =>
                  radioOption(opt.value, opt.label, draft.sortBy, (v) =>
                    setDraft((d) => ({ ...d, sortBy: v })),
                  ),
                )}
              </div>
            )}
          </div>

          {/* 2. Автор */}
          <div style={{ borderBottom: '1px solid #F1F5F9' }}>
            {sectionHeader(
              'author',
              'Автор бойынша',
              draft.selectedAuthor !== 'all' ? draft.selectedAuthor : undefined,
            )}
            {openSections.has('author') && (
              <div className="pb-2">
                {radioOption('all', 'Барлық авторлар', draft.selectedAuthor, (v) =>
                  setDraft((d) => ({ ...d, selectedAuthor: v })),
                )}
                {authorsList.map((item) =>
                  radioOption(
                    item.name,
                    `${item.name} (${item.count})`,
                    draft.selectedAuthor,
                    (v) => setDraft((d) => ({ ...d, selectedAuthor: v })),
                  ),
                )}
              </div>
            )}
          </div>

          {/* 3. Диктор */}
          {narratorsList.length > 0 && (
            <div style={{ borderBottom: '1px solid #F1F5F9' }}>
              {sectionHeader(
                'narrator',
                'Диктор бойынша',
                draft.selectedNarrator !== 'all' ? draft.selectedNarrator : undefined,
              )}
              {openSections.has('narrator') && (
                <div className="pb-2">
                  {radioOption('all', 'Барлық дикторлар', draft.selectedNarrator, (v) =>
                    setDraft((d) => ({ ...d, selectedNarrator: v })),
                  )}
                  {narratorsList.map((item) =>
                    radioOption(
                      item.name,
                      `${item.name} (${item.count})`,
                      draft.selectedNarrator,
                      (v) => setDraft((d) => ({ ...d, selectedNarrator: v })),
                    ),
                  )}
                </div>
              )}
            </div>
          )}

          {/* 4. Формат */}
          <div style={{ borderBottom: '1px solid #F1F5F9' }}>
            {sectionHeader(
              'format',
              'Форматы',
              draft.formatFilter !== 'all'
                ? FORMAT_OPTIONS.find((o) => o.value === draft.formatFilter)?.label
                : undefined,
            )}
            {openSections.has('format') && (
              <div className="pb-2">
                {FORMAT_OPTIONS.map((opt) =>
                  radioOption(opt.value, opt.label, draft.formatFilter, (v) =>
                    setDraft((d) => ({ ...d, formatFilter: v })),
                  ),
                )}
              </div>
            )}
          </div>

          {/* 5. Қолжетімділік */}
          <div style={{ borderBottom: '1px solid #F1F5F9' }}>
            {sectionHeader(
              'access',
              'Қолжетімділік',
              draft.accessFilter !== 'all'
                ? ACCESS_OPTIONS.find((o) => o.value === draft.accessFilter)?.label
                : undefined,
            )}
            {openSections.has('access') && (
              <div className="pb-2">
                {ACCESS_OPTIONS.map((opt) =>
                  radioOption(opt.value, opt.label, draft.accessFilter, (v) =>
                    setDraft((d) => ({ ...d, accessFilter: v })),
                  ),
                )}
              </div>
            )}
          </div>

          {/* Bottom padding */}
          <div className="h-6" />
        </div>

        {/* Apply Button */}
        <div
          className="shrink-0 px-5 py-4"
          style={{ borderTop: '1px solid #F1F5F9', background: '#FFFFFF' }}
        >
          <button
            type="button"
            onClick={handleApply}
            className="w-full py-3.5 rounded-2xl font-black text-white text-base active:scale-[0.98] transition-all"
            style={{
              background: 'linear-gradient(135deg, #005494 0%, #002D50 100%)',
              boxShadow: '0 4px 16px rgba(0,84,148,0.3)',
            }}
          >
            Қолдану
            {activeDraftCount > 0 && ` • ${activeDraftCount} сүзгі`}
          </button>
        </div>
      </div>
    </>
  );
};
