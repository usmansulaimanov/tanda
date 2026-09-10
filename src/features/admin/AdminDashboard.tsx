import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Archive,
  ArchiveRestore,
  Edit2,
  Trash2,
  BookOpen,
  Headphones,
  CheckCircle,
  Eye,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { useBookStore } from '../../store/useBookStore';
import { useToastStore } from '../../store/useToastStore';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Book } from '../../types';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { books, toggleArchive, deleteBook, resetToDefaults } = useBookStore();
  const { showToast } = useToastStore();

  const [adminSearch, setAdminSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'archived'>('all');
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);

  // Filtered books for admin table
  const filteredBooks = useMemo(() => {
    return books.filter((book) => {
      // Status filter
      if (filterStatus === 'active' && book.isArchived) return false;
      if (filterStatus === 'archived' && !book.isArchived) return false;

      // Search filter
      if (adminSearch.trim()) {
        const q = adminSearch.toLowerCase();
        return (
          book.title.toLowerCase().includes(q) ||
          book.author.toLowerCase().includes(q) ||
          book.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [books, filterStatus, adminSearch]);

  const handleToggleArchive = (book: Book) => {
    toggleArchive(book.id);
    if (!book.isArchived) {
      showToast(`"${book.title}" архивке салынды (оқырмандарға көрінбейді)`, 'info');
    } else {
      showToast(`"${book.title}" архивтен шығарылды (оқырмандарға көрінеді)`, 'success');
    }
  };

  const confirmDelete = () => {
    if (bookToDelete) {
      deleteBook(bookToDelete.id);
      showToast(`"${bookToDelete.title}" кітабы біржола өшірілді`, 'info');
      setBookToDelete(null);
    }
  };

  const activeCount = books.filter((b) => !b.isArchived).length;
  const archivedCount = books.filter((b) => b.isArchived).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-[#0057A8] font-bold text-sm mb-1">
            <ShieldCheck className="w-4 h-4" /> Әкімші басқару панелі
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Кітаптар қоры ({books.length})
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Белсенді: <span className="font-semibold text-emerald-600">{activeCount}</span> &bull;
            Архивте: <span className="font-semibold text-slate-500">{archivedCount}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/admin/books/new">
            <Button variant="primary" className="gap-2 shadow-sm">
              <Plus className="w-4 h-4" /> Жаңа кітап қосу
            </Button>
          </Link>
        </div>
      </div>

      {/* Control / Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={adminSearch}
            onChange={(e) => setAdminSearch(e.target.value)}
            placeholder="Кітап, автор немесе санат іздеу..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 focus:border-[#0057A8] rounded-xl text-sm transition-all outline-none"
          />
        </div>

        {/* Status filters */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-medium">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterStatus === 'all' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600'
              }`}
            >
              Барлығы ({books.length})
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterStatus === 'active' ? 'bg-white text-emerald-700 shadow-sm font-semibold' : 'text-slate-600'
              }`}
            >
              Белсенді ({activeCount})
            </button>
            <button
              onClick={() => setFilterStatus('archived')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterStatus === 'archived' ? 'bg-white text-slate-800 shadow-sm font-semibold' : 'text-slate-600'
              }`}
            >
              Архивте ({archivedCount})
            </button>
          </div>
        </div>
      </div>

      {/* Books Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200/80 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-4 w-12 text-center">№</th>
                <th className="py-4 px-4 w-16">Мұқаба</th>
                <th className="py-4 px-4">Атауы мен авторы</th>
                <th className="py-4 px-4">Санаты</th>
                <th className="py-4 px-4">Форматы</th>
                <th className="py-4 px-4">Бағасы</th>
                <th className="py-4 px-4 text-center">Мәртебесі</th>
                <th className="py-4 px-4 text-right">Әрекеттер</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBooks.map((book, index) => (
                <tr
                  key={book.id}
                  className={`hover:bg-slate-50/60 transition-colors ${
                    book.isArchived ? 'bg-slate-50/40 opacity-70' : ''
                  }`}
                >
                  {/* Sequential Number */}
                  <td className="py-3 px-4 text-center font-mono text-xs font-bold text-slate-400">
                    {index + 1}
                  </td>

                  {/* Thumbnail */}
                  <td className="py-3 px-4">
                    <div
                      className="w-10 h-14 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm overflow-hidden text-[9px] font-bold"
                      style={{
                        background: book.coverImage
                          ? `url(${book.coverImage}) center/cover`
                          : (book.gradient || '#0057A8'),
                      }}
                    >
                      {!book.coverImage && <BookOpen className="w-4 h-4 opacity-75" />}
                    </div>
                  </td>

                  {/* Title & Author */}
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900 line-clamp-1">{book.title}</div>
                    <div className="text-xs text-slate-500 line-clamp-1">{book.author}</div>
                  </td>

                  {/* Category */}
                  <td className="py-3 px-4">
                    <Badge variant="blue" size="sm">
                      {book.category}
                    </Badge>
                  </td>

                  {/* Format */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      {book.hasAudio && (
                        <span className="inline-flex items-center gap-1 text-[#F08000] font-medium" title="Аудиокітап">
                          <Headphones className="w-3.5 h-3.5" />
                          Аудио
                        </span>
                      )}
                      {book.pages && (
                        <span className="text-slate-500">
                          {book.pages} бет
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Price */}
                  <td className="py-3 px-4">
                    <Badge variant={book.isFree ? 'green' : 'orange'} size="sm">
                      {book.isFree ? 'Тегін' : 'Премиум'}
                    </Badge>
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4 text-center">
                    {book.isArchived ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                        Архивтелген
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                        Белсенді
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      {/* View button */}
                      <Link
                        to={`/book/${book.id}`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                        title="Көру"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>

                      {/* Edit button */}
                      <Link
                        to={`/admin/books/${book.id}/edit`}
                        className="p-1.5 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                        title="Өңдеу"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Link>

                      {/* Archive toggle */}
                      <button
                        onClick={() => handleToggleArchive(book)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          book.isArchived
                            ? 'text-emerald-600 hover:bg-emerald-50'
                            : 'text-amber-600 hover:bg-amber-50'
                        }`}
                        title={book.isArchived ? 'Архивтен шығару' : 'Архивке салу'}
                      >
                        {book.isArchived ? (
                          <ArchiveRestore className="w-4 h-4" />
                        ) : (
                          <Archive className="w-4 h-4" />
                        )}
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => setBookToDelete(book)}
                        className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                        title="Өшіру"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredBooks.length === 0 && (
          <div className="py-12 text-center text-slate-400">
            Сәйкес кітаптар табылмады
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(bookToDelete)}
        onClose={() => setBookToDelete(null)}
        title="Кітапты өшіру"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Сіз шынымен <strong className="text-slate-900">{bookToDelete?.title}</strong> кітабын өшіргіңіз келе ме? Бұл әрекетті қайтару мүмкін емес.
          </p>
          <div className="flex items-center justify-end gap-3 pt-3">
            <Button variant="outline" size="sm" onClick={() => setBookToDelete(null)}>
              Болдырмау
            </Button>
            <Button variant="danger" size="sm" onClick={confirmDelete}>
              Иә, өшіру
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
