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
  { value: 'audio', label: 'Тек аудиокітаптар' },
  { value: 'ebook', label: 'Тек э-кітаптар' },
];

const ACCESS_OPTIONS: { value: AccessFilter; label: string }[] = [
  { value: 'all', label: 'Барлық кітаптар' },
  { value: 'free', label: 'Тегін кітаптар' },
  { value: 'premium', label: 'Tanda Premium' },
];

export const FilterDrawer: React.FC<FilterDrawerProps> = ({
  isOpen,
  onClose,
  filters,
  onApply,
  authorsList,
  narratorsList,
}) => {
  const [openSections, setOpenSections] = useState<Set<SectionKey>>(new Set(['sort']));
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const frame = requestAnimationFrame(() => {
        setIsVisible(true);
      });
      return () => cancelAnimationFrame(frame);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 320);
  };

  const toggleSection = (key: SectionKey) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const resetAll = () => {
    onApply({
      selectedAuthors: [],
      selectedNarrators: [],
      formatFilter: 'all',
      accessFilter: 'all',
      sortBy: 'default',
    });
  };

  const activeCount = [
    filters.selectedAuthors.length > 0,
    filters.selectedNarrators.length > 0,
    filters.formatFilter !== 'all',
    filters.accessFilter !== 'all',
    filters.sortBy !== 'default',
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
    const next = filters.selectedAuthors.includes(name)
      ? filters.selectedAuthors.filter((a) => a !== name)
      : [...filters.selectedAuthors, name];
    onApply({ ...filters, selectedAuthors: next });
  };

  const toggleNarrator = (name: string) => {
    const next = filters.selectedNarrators.includes(name)
      ? filters.selectedNarrators.filter((n) => n !== name)
      : [...filters.selectedNarrators, name];
    onApply({ ...filters, selectedNarrators: next });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[950]"
        style={{
          background: 'rgba(0,0,0,0.45)',
          opacity: isVisible ? 1 : 0,
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          transition: 'opacity 0.32s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={handleClose}
      />

      {/* Drawer — slides in from right */}
      <div
        className="fixed top-0 right-0 bottom-0 z-[960] flex flex-col w-full sm:w-[420px] sm:max-w-[420px]"
        style={{
          background: '#FFFFFF',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.16)',
          transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.32s cubic-bezier(0.16, 1, 0.3, 1)',
          willChange: 'transform',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{
            borderBottom: '1px solid #F1F5F9',
            paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 12px), 16px)',
          }}
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
            {activeCount > 0 && (
              <span
                className="w-5 h-5 rounded-full text-white text-xs font-black flex items-center justify-center"
                style={{ background: '#005494' }}
              >
                {activeCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={resetAll}
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
              badge={filters.sortBy !== 'default' ? SORT_OPTIONS.find((o) => o.value === filters.sortBy)?.label : undefined}
            />
            {openSections.has('sort') && (
              <div className="pb-2">
                {SORT_OPTIONS.map((opt) => (
                  <RadioOption
                    key={opt.value}
                    value={opt.value}
                    label={opt.label}
                    current={filters.sortBy}
                    onChange={(v) => onApply({ ...filters, sortBy: v })}
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
              badge={filters.selectedAuthors.length > 0 ? filters.selectedAuthors.length : undefined}
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
                      borderColor: filters.selectedAuthors.length === 0 ? '#005494' : '#CBD5E1',
                      background: filters.selectedAuthors.length === 0 ? '#005494' : '#fff',
                    }}
                    onClick={() => onApply({ ...filters, selectedAuthors: [] })}
                  >
                    {filters.selectedAuthors.length === 0 && (
                      <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                        <path d="M1 4L4 7L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span
                    className="text-sm font-semibold flex-1"
                    style={{ color: filters.selectedAuthors.length === 0 ? '#005494' : '#334155' }}
                    onClick={() => onApply({ ...filters, selectedAuthors: [] })}
                  >
                    Барлық авторлар
                  </span>
                </label>
                {authorsList.map((item) => (
                  <CheckboxOption
                    key={item.name}
                    value={item.name}
                    label={`${item.name} (${item.count})`}
                    selected={filters.selectedAuthors.includes(item.name)}
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
                badge={filters.selectedNarrators.length > 0 ? filters.selectedNarrators.length : undefined}
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
                        borderColor: filters.selectedNarrators.length === 0 ? '#005494' : '#CBD5E1',
                        background: filters.selectedNarrators.length === 0 ? '#005494' : '#fff',
                      }}
                      onClick={() => onApply({ ...filters, selectedNarrators: [] })}
                    >
                      {filters.selectedNarrators.length === 0 && (
                        <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                          <path d="M1 4L4 7L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <span
                      className="text-sm font-semibold flex-1"
                      style={{ color: filters.selectedNarrators.length === 0 ? '#005494' : '#334155' }}
                      onClick={() => onApply({ ...filters, selectedNarrators: [] })}
                    >
                      Барлық дикторлар
                    </span>
                  </label>
                  {narratorsList.map((item) => (
                    <CheckboxOption
                      key={item.name}
                      value={item.name}
                      label={`${item.name} (${item.count})`}
                      selected={filters.selectedNarrators.includes(item.name)}
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
              badge={filters.formatFilter !== 'all' ? FORMAT_OPTIONS.find((o) => o.value === filters.formatFilter)?.label : undefined}
            />
            {openSections.has('format') && (
              <div className="pb-2">
                {FORMAT_OPTIONS.map((opt) => (
                  <RadioOption
                    key={opt.value}
                    value={opt.value}
                    label={opt.label}
                    current={filters.formatFilter}
                    onChange={(v) => onApply({ ...filters, formatFilter: v })}
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
              badge={filters.accessFilter !== 'all' ? ACCESS_OPTIONS.find((o) => o.value === filters.accessFilter)?.label : undefined}
            />
            {openSections.has('access') && (
              <div className="pb-2">
                {ACCESS_OPTIONS.map((opt) => (
                  <RadioOption
                    key={opt.value}
                    value={opt.value}
                    label={opt.label}
                    current={filters.accessFilter}
                    onChange={(v) => onApply({ ...filters, accessFilter: v })}
                  />
                ))}
              </div>
            )}
          </div>

          <div style={{ height: 'max(calc(env(safe-area-inset-bottom, 0px) + 24px), 40px)' }} />
        </div>
      </div>
    </>
  );
};
