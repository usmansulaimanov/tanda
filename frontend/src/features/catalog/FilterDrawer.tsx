import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

type SortBy = 'default' | 'popular' | 'newest' | 'alpha-asc' | 'alpha-desc';
type FormatFilter = 'all' | 'audio' | 'ebook';
type AccessFilter = 'all' | 'free' | 'premium';

export interface FilterState {
  selectedAuthors: string[];
  selectedNarrators: string[];
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
  const [draft, setDraft] = useState<FilterState>(filters);
  const [openSections, setOpenSections] = useState<Set<SectionKey>>(new Set(['sort']));
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDraft(filters);
      setIsVisible(true);
    }
  }, [isOpen, filters]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 280);
  };

  const toggleSection = (key: SectionKey) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const resetDraft = () => {
    setDraft({
      selectedAuthors: [],
      selectedNarrators: [],
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
    draft.selectedAuthors.length > 0,
    draft.selectedNarrators.length > 0,
    draft.formatFilter !== 'all',
    draft.accessFilter !== 'all',
    draft.sortBy !== 'default',
  ].filter(Boolean).length;

  if (!isOpen && !isVisible) return null;

  // --- Sub-components ---

  const SectionHeader = ({
    sectionKey,
    label,
    badge,
  }: {
    sectionKey: SectionKey;
    label: string;
    badge?: string | number;
  }) => {
    const isExpanded = openSections.has(sectionKey);
    return (
      <button
        type="button"
        onClick={() => toggleSection(sectionKey)}
        className="w-full flex items-center justify-between py-4 px-0 text-left"
        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <span className="flex items-center gap-2">
          <span
            className="font-bold text-base"
            style={{ color: badge !== undefined && badge !== '' ? '#005494' : '#1E293B' }}
          >
            {label}
          </span>
          {badge !== undefined && badge !== '' && (
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(0,84,148,0.1)', color: '#005494' }}
            >
              {badge}
            </span>
          )}
        </span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 shrink-0" style={{ color: '#94A3B8' }} />
        ) : (
          <ChevronDown className="w-4 h-4 shrink-0" style={{ color: '#94A3B8' }} />
        )}
      </button>
    );
  };

  /** Single-select radio row */
  const RadioOption = <T extends string>({
    value,
    label,
    current,
    onChange,
  }: {
    value: T;
    label: string;
    current: T;
    onChange: (v: T) => void;
  }) => {
    const checked = value === current;
    return (
      <label
        className="flex items-center gap-3 py-3 px-1 cursor-pointer"
        style={{ borderBottom: '1px solid #F1F5F9' }}
      >
        <span
          className="shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
          style={{
            borderColor: checked ? '#005494' : '#CBD5E1',
            background: checked ? '#005494' : '#fff',
          }}
          onClick={() => onChange(value)}
        >
          {checked && <span className="w-2 h-2 rounded-full bg-white" />}
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

  /** Multi-select checkbox row */
  const CheckboxOption = ({
    value,
    label,
    selected,
    onToggle,
  }: {
    value: string;
    label: string;
    selected: boolean;
    onToggle: (v: string) => void;
  }) => (
    <label
      className="flex items-center gap-3 py-3 px-1 cursor-pointer active:bg-slate-50 transition-colors"
      style={{ borderBottom: '1px solid #F1F5F9' }}
    >
      {/* Custom checkbox */}
      <span
        className="shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all"
        style={{
          borderColor: selected ? '#005494' : '#CBD5E1',
          background: selected ? '#005494' : '#fff',
        }}
        onClick={() => onToggle(value)}
      >
        {selected && (
          <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
            <path d="M1 4L4 7L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span
        className="text-sm font-semibold flex-1"
        style={{ color: selected ? '#005494' : '#334155' }}
        onClick={() => onToggle(value)}
      >
        {label}
      </span>
    </label>
  );

  const toggleAuthor = (name: string) => {
    setDraft((d) => ({
      ...d,
      selectedAuthors: d.selectedAuthors.includes(name)
        ? d.selectedAuthors.filter((a) => a !== name)
        : [...d.selectedAuthors, name],
    }));
  };

  const toggleNarrator = (name: string) => {
    setDraft((d) => ({
      ...d,
      selectedNarrators: d.selectedNarrators.includes(name)
        ? d.selectedNarrators.filter((n) => n !== name)
        : [...d.selectedNarrators, name],
    }));
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

      {/* Drawer — slides in from right */}
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

          {/* 1. Сұрыптау — radio (single) */}
          <div style={{ borderBottom: '1px solid #F1F5F9' }}>
            <SectionHeader
              sectionKey="sort"
              label="Сұрыптау"
              badge={draft.sortBy !== 'default' ? SORT_OPTIONS.find((o) => o.value === draft.sortBy)?.label : undefined}
            />
            {openSections.has('sort') && (
              <div className="pb-2">
                {SORT_OPTIONS.map((opt) => (
                  <RadioOption
                    key={opt.value}
                    value={opt.value}
                    label={opt.label}
                    current={draft.sortBy}
                    onChange={(v) => setDraft((d) => ({ ...d, sortBy: v }))}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 2. Автор — checkbox (multi) */}
          <div style={{ borderBottom: '1px solid #F1F5F9' }}>
            <SectionHeader
              sectionKey="author"
              label="Автор бойынша"
              badge={draft.selectedAuthors.length > 0 ? draft.selectedAuthors.length : undefined}
            />
            {openSections.has('author') && (
              <div className="pb-2">
                {/* «Барлығы» — deselects all */}
                <label
                  className="flex items-center gap-3 py-3 px-1 cursor-pointer"
                  style={{ borderBottom: '1px solid #F1F5F9' }}
                >
                  <span
                    className="shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all"
                    style={{
                      borderColor: draft.selectedAuthors.length === 0 ? '#005494' : '#CBD5E1',
                      background: draft.selectedAuthors.length === 0 ? '#005494' : '#fff',
                    }}
                    onClick={() => setDraft((d) => ({ ...d, selectedAuthors: [] }))}
                  >
                    {draft.selectedAuthors.length === 0 && (
                      <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                        <path d="M1 4L4 7L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span
                    className="text-sm font-semibold flex-1"
                    style={{ color: draft.selectedAuthors.length === 0 ? '#005494' : '#334155' }}
                    onClick={() => setDraft((d) => ({ ...d, selectedAuthors: [] }))}
                  >
                    Барлық авторлар
                  </span>
                </label>
                {authorsList.map((item) => (
                  <CheckboxOption
                    key={item.name}
                    value={item.name}
                    label={`${item.name} (${item.count})`}
                    selected={draft.selectedAuthors.includes(item.name)}
                    onToggle={toggleAuthor}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 3. Диктор — checkbox (multi) */}
          {narratorsList.length > 0 && (
            <div style={{ borderBottom: '1px solid #F1F5F9' }}>
              <SectionHeader
                sectionKey="narrator"
                label="Диктор бойынша"
                badge={draft.selectedNarrators.length > 0 ? draft.selectedNarrators.length : undefined}
              />
              {openSections.has('narrator') && (
                <div className="pb-2">
                  <label
                    className="flex items-center gap-3 py-3 px-1 cursor-pointer"
                    style={{ borderBottom: '1px solid #F1F5F9' }}
                  >
                    <span
                      className="shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all"
                      style={{
                        borderColor: draft.selectedNarrators.length === 0 ? '#005494' : '#CBD5E1',
                        background: draft.selectedNarrators.length === 0 ? '#005494' : '#fff',
                      }}
                      onClick={() => setDraft((d) => ({ ...d, selectedNarrators: [] }))}
                    >
                      {draft.selectedNarrators.length === 0 && (
                        <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                          <path d="M1 4L4 7L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <span
                      className="text-sm font-semibold flex-1"
                      style={{ color: draft.selectedNarrators.length === 0 ? '#005494' : '#334155' }}
                      onClick={() => setDraft((d) => ({ ...d, selectedNarrators: [] }))}
                    >
                      Барлық дикторлар
                    </span>
                  </label>
                  {narratorsList.map((item) => (
                    <CheckboxOption
                      key={item.name}
                      value={item.name}
                      label={`${item.name} (${item.count})`}
                      selected={draft.selectedNarrators.includes(item.name)}
                      onToggle={toggleNarrator}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. Формат — radio (single) */}
          <div style={{ borderBottom: '1px solid #F1F5F9' }}>
            <SectionHeader
              sectionKey="format"
              label="Форматы"
              badge={draft.formatFilter !== 'all' ? FORMAT_OPTIONS.find((o) => o.value === draft.formatFilter)?.label : undefined}
            />
            {openSections.has('format') && (
              <div className="pb-2">
                {FORMAT_OPTIONS.map((opt) => (
                  <RadioOption
                    key={opt.value}
                    value={opt.value}
                    label={opt.label}
                    current={draft.formatFilter}
                    onChange={(v) => setDraft((d) => ({ ...d, formatFilter: v }))}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 5. Қолжетімділік — radio (single) */}
          <div style={{ borderBottom: '1px solid #F1F5F9' }}>
            <SectionHeader
              sectionKey="access"
              label="Қолжетімділік"
              badge={draft.accessFilter !== 'all' ? ACCESS_OPTIONS.find((o) => o.value === draft.accessFilter)?.label : undefined}
            />
            {openSections.has('access') && (
              <div className="pb-2">
                {ACCESS_OPTIONS.map((opt) => (
                  <RadioOption
                    key={opt.value}
                    value={opt.value}
                    label={opt.label}
                    current={draft.accessFilter}
                    onChange={(v) => setDraft((d) => ({ ...d, accessFilter: v }))}
                  />
                ))}
              </div>
            )}
          </div>

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
            Қолдану{activeDraftCount > 0 ? ` • ${activeDraftCount} сүзгі` : ''}
          </button>
        </div>
      </div>
    </>
  );
};
