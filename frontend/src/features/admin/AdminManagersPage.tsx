import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuthStore, DEFAULT_MANAGER_AVATAR } from '../../store/useAuthStore';
import { useBookStore } from '../../store/useBookStore';
import { useToastStore } from '../../store/useToastStore';
import { User, AdminPermission } from '../../types';
import { ALL_PERMISSIONS, PERMISSION_CATEGORIES, hasAdminPermission } from '../../utils/permissions';
import { resizeAndCompressImage } from '../../utils/imageUtils';
import { AdminRoyaltyTab } from './AdminRoyaltyTab';

const formatPhoneNumber = (val: string): string => {
  if (!val) return '';
  const isPrefixed = val.trim().startsWith('+');
  const digits = val.replace(/\D/g, '');
  if (!digits) return '';

  let national = '';
  if (isPrefixed) {
    national = digits.substring(1, 11);
  } else if ((digits.startsWith('8') || digits.startsWith('7')) && digits.length === 11) {
    national = digits.substring(1, 11);
  } else if (digits === '8' && digits.length === 1) {
    return '';
  } else {
    national = digits.substring(0, 10);
  }

  if (!national) return '';

  let res = '+7 (';
  res += national.substring(0, Math.min(3, national.length));
  if (national.length > 3) {
    res += ') ' + national.substring(3, Math.min(6, national.length));
  }
  if (national.length > 6) {
    res += '-' + national.substring(6, Math.min(8, national.length));
  }
  if (national.length > 8) {
    res += '-' + national.substring(8, Math.min(10, national.length));
  }
  return res;
};

export const AdminManagersPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  const {
    user: currentUser,
    role,
    fetchManagers,
    fetchAuthors,
    getAllManagers,
    getAllAuthors,
    checkIdNumberAvailable,
    createManagerByAdmin,
    updateManagerPermissions,
    deleteManager,
    createAuthorByAdmin,
    updateAuthorByAdmin,
    deleteAuthor,
  } = useAuthStore();
  const { books, fetchBooks } = useBookStore();
  const { showToast } = useToastStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const authorFileInputRef = useRef<HTMLInputElement>(null);

  const editAuthorIdParam = searchParams.get('editAuthor');

  const getInitialTab = (): 'managers' | 'authors' | 'royalty' => {
    if (editAuthorIdParam) return 'authors';
    if (tabParam === 'authors' || tabParam === 'royalty' || tabParam === 'managers') {
      return tabParam;
    }
    try {
      const saved = localStorage.getItem('tanda_admin_managers_active_tab');
      if (saved === 'authors' || saved === 'royalty' || saved === 'managers') {
        return saved;
      }
    } catch {}
    return 'managers';
  };

  // Active Tab: 'managers' | 'authors' | 'royalty'
  const [activeTab, setActiveTabState] = useState<'managers' | 'authors' | 'royalty'>(getInitialTab);

  const handleTabChange = (tab: 'managers' | 'authors' | 'royalty') => {
    setActiveTabState(tab);
    setSearchParams({ tab }, { replace: true });
    try {
      localStorage.setItem('tanda_admin_managers_active_tab', tab);
    } catch {}
  };

  useEffect(() => {
    if (tabParam === 'authors' || tabParam === 'royalty' || tabParam === 'managers') {
      if (tabParam !== activeTab) {
        setActiveTabState(tabParam);
      }
      try {
        localStorage.setItem('tanda_admin_managers_active_tab', tabParam);
      } catch {}
    }
  }, [tabParam]);

  // Managers state
  const [managers, setManagers] = useState<User[]>(() => getAllManagers());
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingManager, setEditingManager] = useState<User | null>(null);
  const [managerToDelete, setManagerToDelete] = useState<User | null>(null);

  // Manager form fields
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [formDuty, setFormDuty] = useState('');
  const [formIdNumber, setFormIdNumber] = useState('');
  const [formIdNumberError, setFormIdNumberError] = useState('');
  const [formAvatarUrl, setFormAvatarUrl] = useState<string | null>(DEFAULT_MANAGER_AVATAR);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [formPermissions, setFormPermissions] = useState<AdminPermission[]>([]);
  const [formIsActive, setFormIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Authors state
  const [authors, setAuthors] = useState<User[]>(() => getAllAuthors());
  const [authorSearchQuery, setAuthorSearchQuery] = useState('');
  const [isAuthorModalOpen, setIsAuthorModalOpen] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState<User | null>(null);
  const [authorToDelete, setAuthorToDelete] = useState<User | null>(null);

  // Author form fields
  const [authorName, setAuthorName] = useState('');
  const [authorAssignedName, setAuthorAssignedName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [authorPhone, setAuthorPhone] = useState('');
  const [authorPassword, setAuthorPassword] = useState('');
  const [showAuthorPassword, setShowAuthorPassword] = useState(false);
  const [authorIdNumber, setAuthorIdNumber] = useState('');
  const [authorIdNumberError, setAuthorIdNumberError] = useState('');
  const [authorAvatarUrl, setAuthorAvatarUrl] = useState<string | null>(DEFAULT_MANAGER_AVATAR);
  const [isUploadingAuthorAvatar, setIsUploadingAuthorAvatar] = useState(false);
  const [authorAssignedBookIds, setAuthorAssignedBookIds] = useState<string[]>([]);
  const [bookSearchInModal, setBookSearchInModal] = useState('');
  const [authorIsActive, setAuthorIsActive] = useState(true);
  const [isAuthorSubmitting, setIsAuthorSubmitting] = useState(false);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  // Refresh managers & authors list
  const refreshList = async () => {
    try {
      const [m, a] = await Promise.all([fetchManagers(), fetchAuthors()]);
      setManagers(m);
      setAuthors(a);
    } catch {
      setManagers(getAllManagers());
      setAuthors(getAllAuthors());
    }
  };

  useEffect(() => {
    refreshList();
  }, []);

  // Redirect if not super admin or lacks managers_manage permission
  useEffect(() => {
    if (role !== 'admin' || !hasAdminPermission(currentUser, 'managers_manage')) {
      showToast('Бұл бетке кіру үшін Бас әкімші рұқсаты қажет', 'error');
      navigate('/admin', { replace: true });
    }
  }, [role, currentUser, navigate, showToast]);

  const superAdmin = useMemo(() => {
    return managers.find((m) => m.isSuperAdmin || m.id === '001007' || m.email === 'admin@tanda.kz') || managers[0];
  }, [managers]);

  const assistants = useMemo(() => {
    return managers.filter((m) => !(m.isSuperAdmin || m.id === '001007' || m.email === 'admin@tanda.kz'));
  }, [managers]);

  const filteredAssistants = useMemo(() => {
    if (!searchQuery.trim()) return assistants;
    const q = searchQuery.toLowerCase().trim();
    return assistants.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        (a.duty && a.duty.toLowerCase().includes(q)) ||
        (a.idNumber && a.idNumber.toLowerCase().includes(q))
    );
  }, [assistants, searchQuery]);

  // Unique author names present in the book catalog
  const catalogAuthorNames = useMemo(() => {
    const set = new Set<string>();
    books.forEach((b) => {
      if (b.author && b.author.trim()) {
        set.add(b.author.trim());
      }
    });
    return Array.from(set).sort();
  }, [books]);

  // Authors with filtered search & calculated stats
  const filteredAuthors = useMemo(() => {
    const list = authors.map((author) => {
      const matchName = (author.assignedAuthorName || author.name).toLowerCase().trim();
      const authorBooks = books.filter((b) => {
        const matchesName = b.author && b.author.toLowerCase().trim() === matchName;
        const matchesId = author.assignedBookIds && author.assignedBookIds.includes(b.id);
        return matchesName || matchesId;
      });

      const totalReads = authorBooks.reduce((acc, b) => acc + (b.readsCount || 0), 0);
      const totalViews = authorBooks.reduce((acc, b) => acc + (b.viewsCount || 0), 0);
      const totalAudios = authorBooks.filter((b) => b.audioUrl).length;

      return {
        ...author,
        booksCount: authorBooks.length,
        totalReads,
        totalViews,
        totalAudios,
      };
    });

    if (!authorSearchQuery.trim()) return list;
    const q = authorSearchQuery.toLowerCase().trim();
    return list.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        (a.phone && a.phone.toLowerCase().includes(q)) ||
        (a.assignedAuthorName && a.assignedAuthorName.toLowerCase().includes(q)) ||
        (a.idNumber && a.idNumber.toLowerCase().includes(q))
    );
  }, [authors, books, authorSearchQuery]);

  const handleOpenCreateModal = () => {
    setEditingManager(null);
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setShowFormPassword(false);
    setFormDuty('');
    setFormIdNumber('');
    setFormIdNumberError('');
    setFormAvatarUrl(DEFAULT_MANAGER_AVATAR);
    setFormPermissions([]);
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (mgr: User) => {
    setEditingManager(mgr);
    setFormName(mgr.name);
    setFormEmail(mgr.email);
    setFormPassword(mgr.password || '');
    setShowFormPassword(false);
    setFormDuty(mgr.duty || '');
    setFormIdNumber(mgr.idNumber || '');
    setFormIdNumberError('');
    setFormAvatarUrl(mgr.avatarUrl || DEFAULT_MANAGER_AVATAR);
    setFormPermissions(mgr.permissions || []);
    setFormIsActive(mgr.isActive !== false);
    setIsModalOpen(true);
  };

  const handleIdNumberChange = (val: string) => {
    setFormIdNumber(val);
    const trimmed = val.trim();
    if (!trimmed) {
      setFormIdNumberError('');
      return;
    }
    const res = checkIdNumberAvailable(trimmed, editingManager?.id);
    if (!res.available) {
      setFormIdNumberError(res.error || 'Бұл ID нөмірі бос емес, басқасын таңдаңыз');
    } else {
      setFormIdNumberError('');
    }
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingAvatar(true);
      const compressed = await resizeAndCompressImage(file, 400, 0.85);
      setFormAvatarUrl(compressed);
      showToast('Сурет сәтті таңдалды', 'success');
    } catch (err: any) {
      showToast(err.message || 'Суретті жүктеу сәтсіз аяқталды', 'error');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAvatar = () => {
    setFormAvatarUrl(DEFAULT_MANAGER_AVATAR);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTogglePermission = (perm: AdminPermission) => {
    setFormPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const handleSelectAllPermissions = () => {
    setFormPermissions(ALL_PERMISSIONS.map((p) => p.key));
  };

  const handleClearAllPermissions = () => {
    setFormPermissions([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formName.trim()) {
      showToast('Көмекшінің аты-жөнін жазыңыз', 'error');
      return;
    }
    if (!formEmail.trim() || !formEmail.includes('@')) {
      showToast('Жарамды Google аккаунт немесе электронды пошта енгізіңіз', 'error');
      return;
    }
    if (formPermissions.length === 0) {
      showToast('Кем дегенде бір функцияға рұқсат белгілеңіз', 'error');
      return;
    }
    if (formIdNumber.trim()) {
      const idCheck = checkIdNumberAvailable(formIdNumber.trim(), editingManager?.id);
      if (!idCheck.available) {
        setFormIdNumberError(idCheck.error || 'Бұл ID нөмірі бос емес, басқасын таңдаңыз');
        showToast(idCheck.error || 'Бұл ID нөмірі бос емес, басқасын таңдаңыз', 'error');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (editingManager) {
        const res = await updateManagerPermissions(editingManager.id, {
          name: formName.trim(),
          email: formEmail.trim().toLowerCase(),
          password: formPassword.trim() || undefined,
          duty: formDuty.trim() || undefined,
          idNumber: formIdNumber.trim() || undefined,
          avatarUrl: formAvatarUrl,
          permissions: formPermissions,
          isActive: formIsActive,
        });
        if (res.success) {
          showToast(`«${formName}» көмекшісінің рұқсаттары сәтті жаңартылды!`, 'success');
          setIsModalOpen(false);
          refreshList();
        } else {
          showToast(res.error || 'Қате орын алды', 'error');
        }
      } else {
        const res = await createManagerByAdmin({
          name: formName.trim(),
          email: formEmail.trim().toLowerCase(),
          password: formPassword.trim() || undefined,
          duty: formDuty.trim() || undefined,
          idNumber: formIdNumber.trim() || undefined,
          avatarUrl: formAvatarUrl,
          permissions: formPermissions,
        });
        if (res.success) {
          showToast(`Жаңа көмекші «${formName}» сәтті қосылды!`, 'success');
          setIsModalOpen(false);
          refreshList();
        } else {
          showToast(res.error || 'Қате орын алды', 'error');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!managerToDelete) return;
    const res = await deleteManager(managerToDelete.id);
    if (res.success) {
      showToast(`«${managerToDelete.name}» көмекшісі өшірілді`, 'info');
      setManagerToDelete(null);
      refreshList();
    } else {
      showToast(res.error || 'Өшіру мүмкін болмады', 'error');
    }
  };

  // Author Handlers
  const handleOpenAuthorCreateModal = () => {
    setEditingAuthor(null);
    setAuthorName('');
    setAuthorAssignedName('');
    setAuthorEmail('');
    setAuthorPhone('');
    setAuthorPassword('');
    setShowAuthorPassword(false);
    setAuthorIdNumber('');
    setAuthorIdNumberError('');
    setAuthorAvatarUrl(DEFAULT_MANAGER_AVATAR);
    setAuthorAssignedBookIds([]);
    setBookSearchInModal('');
    setAuthorIsActive(true);
    setIsAuthorModalOpen(true);
  };

  const handleOpenAuthorEditModal = (aut: User) => {
    setEditingAuthor(aut);
    setAuthorName(aut.name);
    setAuthorAssignedName(aut.assignedAuthorName || aut.name);
    setAuthorEmail(aut.email);
    setAuthorPhone(formatPhoneNumber(aut.phone || ''));
    setAuthorPassword(aut.password || '');
    setShowAuthorPassword(false);
    setAuthorIdNumber(aut.idNumber || '');
    setAuthorIdNumberError('');
    setAuthorAvatarUrl(aut.avatarUrl || DEFAULT_MANAGER_AVATAR);
    setAuthorAssignedBookIds(aut.assignedBookIds || []);
    setBookSearchInModal('');
    setAuthorIsActive(aut.isActive !== false);
    setIsAuthorModalOpen(true);
  };

  useEffect(() => {
    if (editAuthorIdParam && authors.length > 0) {
      const target = authors.find((a) => a.id === editAuthorIdParam || a.idNumber === editAuthorIdParam);
      if (target) {
        handleOpenAuthorEditModal(target);
        setSearchParams({ tab: 'authors' }, { replace: true });
      }
    }
  }, [editAuthorIdParam, authors]);

  const handleAuthorIdNumberChange = (val: string) => {
    setAuthorIdNumber(val);
    const trimmed = val.trim();
    if (!trimmed) {
      setAuthorIdNumberError('');
      return;
    }
    const res = checkIdNumberAvailable(trimmed, editingAuthor?.id);
    if (!res.available) {
      setAuthorIdNumberError(res.error || 'Бұл ID нөмірі бос емес, басқасын таңдаңыз');
    } else {
      setAuthorIdNumberError('');
    }
  };

  const handleAuthorAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingAuthorAvatar(true);
      const compressed = await resizeAndCompressImage(file, 400, 0.85);
      setAuthorAvatarUrl(compressed);
      showToast('Сурет сәтті таңдалды', 'success');
    } catch (err: any) {
      showToast(err.message || 'Суретті жүктеу сәтсіз аяқталды', 'error');
    } finally {
      setIsUploadingAuthorAvatar(false);
      if (authorFileInputRef.current) {
        authorFileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAuthorAvatar = () => {
    setAuthorAvatarUrl(DEFAULT_MANAGER_AVATAR);
    if (authorFileInputRef.current) {
      authorFileInputRef.current.value = '';
    }
  };

  const generateAuthorPassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let res = '';
    for (let i = 0; i < 8; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setAuthorPassword(res);
    setShowAuthorPassword(true);
    showToast('Кездейсоқ құпиясөз құрастырылды!', 'info');
  };

  const handleAuthorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuthorSubmitting) return;

    if (!authorName.trim()) {
      showToast('Автордың аты-жөнін жазыңыз', 'error');
      return;
    }
    if (!authorEmail.trim() || !authorEmail.includes('@')) {
      showToast('Жарамды электронды пошта енгізіңіз', 'error');
      return;
    }
    if (authorIdNumber.trim()) {
      const idCheck = checkIdNumberAvailable(authorIdNumber.trim(), editingAuthor?.id);
      if (!idCheck.available) {
        setAuthorIdNumberError(idCheck.error || 'Бұл ID нөмірі бос емес, басқасын таңдаңыз');
        showToast(idCheck.error || 'Бұл ID нөмірі бос емес, басқасын таңдаңыз', 'error');
        return;
      }
    }

    setIsAuthorSubmitting(true);
    try {
      if (editingAuthor) {
        const res = await updateAuthorByAdmin(editingAuthor.id, {
          name: authorName.trim(),
          email: authorEmail.trim().toLowerCase(),
          password: authorPassword.trim() || undefined,
          phone: authorPhone.trim() || undefined,
          idNumber: authorIdNumber.trim() || undefined,
          avatarUrl: authorAvatarUrl,
          assignedAuthorName: authorAssignedName.trim() || authorName.trim(),
          assignedBookIds: authorAssignedBookIds,
          isActive: authorIsActive,
        });
        if (res.success) {
          showToast(`«${authorName}» авторының деректері сәтті жаңартылды!`, 'success');
          setIsAuthorModalOpen(false);
          refreshList();
        } else {
          showToast(res.error || 'Қате орын алды', 'error');
        }
      } else {
        const res = await createAuthorByAdmin({
          name: authorName.trim(),
          email: authorEmail.trim().toLowerCase(),
          password: authorPassword.trim() || undefined,
          phone: authorPhone.trim() || undefined,
          idNumber: authorIdNumber.trim() || undefined,
          avatarUrl: authorAvatarUrl,
          assignedAuthorName: authorAssignedName.trim() || authorName.trim(),
          assignedBookIds: authorAssignedBookIds,
        });
        if (res.success) {
          showToast(`Жаңа автор «${authorName}» сәтті қосылды!`, 'success');
          setIsAuthorModalOpen(false);
          refreshList();
        } else {
          showToast(res.error || 'Қате орын алды', 'error');
        }
      }
    } finally {
      setIsAuthorSubmitting(false);
    }
  };

  const handleAuthorDeleteConfirm = async () => {
    if (!authorToDelete) return;
    const res = await deleteAuthor(authorToDelete.id);
    if (res.success) {
      showToast(`«${authorToDelete.name}» авторы өшірілді`, 'info');
      setAuthorToDelete(null);
      refreshList();
    } else {
      showToast(res.error || 'Өшіру мүмкін болмады', 'error');
    }
  };

  return (
    <section className="admin-page-section" id="admin-managers-section">
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 20px' }}>
        
        {/* Header Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #003763 0%, #005494 100%)',
            borderRadius: '24px',
            padding: '32px 36px',
            color: '#FFFFFF',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 12px 32px rgba(0, 55, 99, 0.18)',
            marginBottom: '24px',
          }}
        >
          <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>
                Басқару
              </h1>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', margin: '4px 0 0' }}>
                Жүйе көмекшілері мен кітап авторларын басқару орталығы
              </p>
            </div>

            {activeTab === 'managers' && (
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="btn-primary"
                style={{
                  padding: '12px 26px',
                  fontSize: '13.5px',
                  fontWeight: 800,
                  background: 'var(--orange)',
                  boxShadow: '0 6px 20px rgba(239, 126, 0, 0.4)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  borderRadius: '50px',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Жаңа көмекші қосу
              </button>
            )}

            {activeTab === 'authors' && (
              <button
                type="button"
                onClick={handleOpenAuthorCreateModal}
                className="btn-primary"
                style={{
                  padding: '12px 26px',
                  fontSize: '13.5px',
                  fontWeight: 800,
                  background: 'var(--orange)',
                  boxShadow: '0 6px 20px rgba(239, 126, 0, 0.4)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  borderRadius: '50px',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Жаңа автор қосу
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '24px',
            background: '#F1F5F9',
            padding: '6px',
            borderRadius: '16px',
            width: 'fit-content',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={() => handleTabChange('managers')}
            style={{
              padding: '10px 22px',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'managers' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'managers' ? 'var(--blue)' : '#64748B',
              boxShadow: activeTab === 'managers' ? '0 4px 12px rgba(0, 84, 148, 0.12)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            Көмекшілер: {assistants.length}
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('authors')}
            style={{
              padding: '10px 22px',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'authors' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'authors' ? 'var(--blue)' : '#64748B',
              boxShadow: activeTab === 'authors' ? '0 4px 12px rgba(0, 84, 148, 0.12)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
            Авторлар: {authors.length}
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('royalty')}
            style={{
              padding: '10px 22px',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'royalty' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'royalty' ? 'var(--blue)' : '#64748B',
              boxShadow: activeTab === 'royalty' ? '0 4px 12px rgba(0, 84, 148, 0.12)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
            Роялти есептеу
          </button>
        </div>

        {/* TAB 1: MANAGERS / ASSISTANTS */}
        {activeTab === 'managers' && (
          <div>
            {/* Super Admin Status Card */}
            {superAdmin && (
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: '20px',
                  padding: '22px 26px',
                  border: '1.5px solid #E2E8F0',
                  boxShadow: '0 4px 20px rgba(0, 84, 148, 0.05)',
                  marginBottom: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {(() => {
                    const superAvatar = superAdmin.avatarUrl || (currentUser?.id === superAdmin.id ? currentUser?.avatarUrl : '') || (currentUser?.email === superAdmin.email ? currentUser?.avatarUrl : '');
                    return (
                      <div
                        style={{
                          width: '54px',
                          height: '54px',
                          borderRadius: '50%',
                          background: superAvatar ? '#F1F5F9' : 'linear-gradient(135deg, #005494, #003366)',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 6px 16px rgba(0, 84, 148, 0.25)',
                          overflow: 'hidden',
                          flexShrink: 0,
                        }}
                      >
                        {superAvatar ? (
                          <img
                            src={superAvatar}
                            alt={superAdmin.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <svg
                            width="26"
                            height="26"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                          </svg>
                        )}
                      </div>
                    );
                  })()}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>
                        {superAdmin.name}
                      </h3>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-mid)', marginTop: '4px' }}>
                      {superAdmin.email} &bull; ID: {superAdmin.idNumber || '0000 0001'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F8FAFC', padding: '8px 16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10B981' }}></span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>Толық шексіз қолжетімділік</span>
                </div>
              </div>
            )}

            {/* Assistants Section */}
            <div className="admin-card" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h2 style={{ fontSize: '19px', fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>
                    Тағайындалған көмекшілер: {assistants.length}
                  </h2>
                  <p style={{ fontSize: '13px', color: 'var(--text-mid)', margin: '4px 0 0' }}>
                    Әрбір көмекшінің тек өзіне берілген рұқсаттары ғана белсенді болады.
                  </p>
                </div>

                {/* Search filter */}
                <div style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Көмекшіні іздеу..."
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 34px',
                      borderRadius: '50px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                  <svg
                    style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }}
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </div>
              </div>

              {filteredAssistants.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {filteredAssistants.map((assistant) => {
                    const perms = assistant.permissions || [];
                    const isActive = assistant.isActive !== false;

                    return (
                      <div
                        key={assistant.id}
                        style={{
                          background: '#FFFFFF',
                          borderRadius: '16px',
                          border: '1.5px solid #E2E8F0',
                          padding: '18px 22px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '16px',
                          transition: 'all 0.2s',
                        }}
                      >
                        {/* Left details */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', minWidth: '260px' }}>
                          <div
                            style={{
                              width: '46px',
                              height: '46px',
                              borderRadius: '50%',
                              background: '#F1F5F9',
                              color: 'var(--blue)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '18px',
                              fontWeight: 800,
                              flexShrink: 0,
                              overflow: 'hidden',
                            }}
                          >
                            <img
                              src={assistant.avatarUrl || DEFAULT_MANAGER_AVATAR}
                              alt={assistant.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '15.5px', fontWeight: 800, color: 'var(--text-dark)' }}>
                                {assistant.name}
                              </span>
                              {assistant.duty && (
                                <>
                                  <span style={{ color: '#94A3B8', fontWeight: 400 }}>|</span>
                                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>
                                    {assistant.duty}
                                  </span>
                                </>
                              )}
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: '50px',
                                  background: isActive ? '#ECFDF5' : '#FEF2F2',
                                  color: isActive ? '#059669' : '#DC2626',
                                }}
                              >
                                {isActive ? 'Белсенді' : 'Бұғатталған'}
                              </span>
                            </div>
                            <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
                              {assistant.email} &bull; ID: {assistant.idNumber || '0000 0002'}
                            </div>

                            {/* Permissions badges */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                              {perms.length > 0 ? (
                                perms.map((pKey) => {
                                  const pDef = ALL_PERMISSIONS.find((p) => p.key === pKey);
                                  return (
                                    <span
                                      key={pKey}
                                      style={{
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        padding: '3px 9px',
                                        borderRadius: '20px',
                                        background: '#F8FAFC',
                                        color: '#334155',
                                        border: '1px solid #E2E8F0',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                      }}
                                    >
                                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--blue)', flexShrink: 0 }}></span>
                                      {pDef?.label || pKey}
                                    </span>
                                  );
                                })
                              ) : (
                                <span style={{ fontSize: '12px', color: '#94A3B8', fontStyle: 'italic' }}>
                                  Рұқсат берілмеген
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(assistant)}
                            style={{
                              padding: '8px 14px',
                              fontSize: '12px',
                              fontWeight: 700,
                              borderRadius: '8px',
                              border: '1.5px solid #CBD5E1',
                              background: '#F8FAFC',
                              color: '#0F172A',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.15s',
                            }}
                            title="Көмекшіні өңдеу"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                            Өңдеу
                          </button>

                          <button
                            type="button"
                            onClick={() => setManagerToDelete(assistant)}
                            style={{
                              padding: '8px 12px',
                              fontSize: '12px',
                              fontWeight: 700,
                              borderRadius: '8px',
                              border: '1.5px solid #FEE2E2',
                              background: '#FFF5F5',
                              color: '#DC2626',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.15s',
                            }}
                            title="Көмекшіні өшіру"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            Өшіру
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '44px 20px',
                    background: '#F8FAFC',
                    borderRadius: '16px',
                    border: '2px dashed #CBD5E1',
                  }}
                >
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-dark)', margin: '0 0 6px' }}>
                    Әзірге көмекшілер тағайындалмаған
                  </h3>
                  <p style={{ fontSize: '13.5px', color: 'var(--text-mid)', maxWidth: '420px', margin: '0 auto 18px' }}>
                    Жоғарыдағы «Жаңа көмекші қосу» батырмасын басып, көмекші тағайындаңыз.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenCreateModal}
                    className="btn-primary"
                    style={{ padding: '9px 22px', fontSize: '13px' }}
                  >
                    + Жаңа көмекші қосу
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: AUTHORS */}
        {activeTab === 'authors' && (
          <div className="admin-card" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '19px', fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>
                  Тіркелген авторлар: {authors.length}
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-mid)', margin: '4px 0 0' }}>
                  Авторлар басқару парақшаларына кіре алмайды, тек өз кітаптарының статистикасын көреді.
                </p>
              </div>

              {/* Search filter */}
              <div style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
                <input
                  type="text"
                  value={authorSearchQuery}
                  onChange={(e) => setAuthorSearchQuery(e.target.value)}
                  placeholder="Авторды іздеу..."
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    borderRadius: '50px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
                <svg
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }}
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </div>
            </div>

            {filteredAuthors.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {filteredAuthors.map((author) => {
                  const isActive = author.isActive !== false;

                  return (
                    <div
                      key={author.id}
                      style={{
                        background: '#FFFFFF',
                        borderRadius: '16px',
                        border: '1.5px solid #E2E8F0',
                        padding: '18px 22px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '16px',
                        transition: 'all 0.2s',
                      }}
                    >
                      {/* Left details */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', minWidth: '280px' }}>
                        <div
                          style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            background: '#F1F5F9',
                            color: 'var(--blue)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            fontWeight: 800,
                            flexShrink: 0,
                            overflow: 'hidden',
                          }}
                        >
                          <img
                            src={author.avatarUrl || DEFAULT_MANAGER_AVATAR}
                            alt={author.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '15.5px', fontWeight: 800, color: 'var(--text-dark)' }}>
                              {author.name}
                            </span>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '50px',
                                background: '#EFF6FF',
                                color: 'var(--blue)',
                                border: '1px solid rgba(0, 84, 148, 0.2)',
                              }}
                            >
                              Автор
                            </span>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '50px',
                                background: isActive ? '#ECFDF5' : '#FEF2F2',
                                color: isActive ? '#059669' : '#DC2626',
                              }}
                            >
                              {isActive ? 'Белсенді' : 'Бұғатталған'}
                            </span>
                          </div>

                          <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
                            {author.email} {author.phone ? `• ${author.phone}` : ''} &bull; ID: {author.idNumber || '0000 0001'}
                          </div>

                          {/* Matching meta badges */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                            <span
                              style={{
                                fontSize: '11.5px',
                                fontWeight: 700,
                                padding: '3px 10px',
                                borderRadius: '20px',
                                background: '#F8FAFC',
                                color: '#334155',
                                border: '1px solid #CBD5E1',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                              }}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                              </svg>
                              Кітаптары: {author.booksCount} дана
                            </span>

                            {author.assignedAuthorName && author.assignedAuthorName !== author.name && (
                              <span
                                style={{
                                  fontSize: '11.5px',
                                  fontWeight: 600,
                                  padding: '3px 10px',
                                  borderRadius: '20px',
                                  background: '#FFFBEB',
                                  color: '#B45309',
                                  border: '1px solid #FDE68A',
                                }}
                              >
                                Каталогтағы аты: {author.assignedAuthorName}
                              </span>
                            )}

                            {author.assignedBookIds && author.assignedBookIds.length > 0 && (
                              <span
                                style={{
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                  padding: '3px 10px',
                                  borderRadius: '20px',
                                  background: 'rgba(0, 84, 148, 0.08)',
                                  color: 'var(--blue)',
                                  border: '1px solid #BFDBFE',
                                }}
                              >
                                Таңдалған кітаптары: {author.assignedBookIds.length} дана
                              </span>
                            )}

                            <span
                              style={{
                                fontSize: '11.5px',
                                fontWeight: 600,
                                padding: '3px 10px',
                                borderRadius: '20px',
                                background: '#F0FDF4',
                                color: '#166534',
                                border: '1px solid #BBF7D0',
                              }}
                            >
                              Оқылған саны: {author.totalReads}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Link
                          to={`/admin/authors/${author.id}`}
                          style={{
                            padding: '8px 14px',
                            fontSize: '12px',
                            fontWeight: 700,
                            borderRadius: '8px',
                            border: '1.5px solid #BFDBFE',
                            background: '#EFF6FF',
                            color: 'var(--blue)',
                            textDecoration: 'none',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.15s',
                          }}
                          title="Автордың толық статистикасын ашу"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="20" x2="18" y2="10"></line>
                            <line x1="12" y1="20" x2="12" y2="4"></line>
                            <line x1="6" y1="20" x2="6" y2="14"></line>
                          </svg>
                          Статистика
                        </Link>

                        <button
                          type="button"
                          onClick={() => handleOpenAuthorEditModal(author)}
                          style={{
                            padding: '8px 14px',
                            fontSize: '12px',
                            fontWeight: 700,
                            borderRadius: '8px',
                            border: '1.5px solid #CBD5E1',
                            background: '#F8FAFC',
                            color: '#0F172A',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.15s',
                          }}
                          title="Авторды өңдеу"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                          Өңдеу
                        </button>

                        <button
                          type="button"
                          onClick={() => setAuthorToDelete(author)}
                          style={{
                            padding: '8px 12px',
                            fontSize: '12px',
                            fontWeight: 700,
                            borderRadius: '8px',
                            border: '1.5px solid #FEE2E2',
                            background: '#FFF5F5',
                            color: '#DC2626',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.15s',
                          }}
                          title="Авторды өшіру"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                          Өшіру
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: '44px 20px',
                  background: '#F8FAFC',
                  borderRadius: '16px',
                  border: '2px dashed #CBD5E1',
                }}
              >
                <div
                  style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '50%',
                    background: '#EDF2F7',
                    color: '#94A3B8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                  }}
                >
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-dark)', margin: '0 0 6px' }}>
                  Әзірге авторлар қосылмаған
                </h3>
                <p style={{ fontSize: '13.5px', color: 'var(--text-mid)', maxWidth: '420px', margin: '0 auto 18px' }}>
                  Жоғарыдағы «Жаңа автор қосу» батырмасын басып, кітап авторын тіркеңіз.
                </p>
                <button
                  type="button"
                  onClick={handleOpenAuthorCreateModal}
                  className="btn-primary"
                  style={{ padding: '9px 22px', fontSize: '13px' }}
                >
                  + Жаңа автор қосу
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ROYALTY & EARNINGS (50/50) */}
        {activeTab === 'royalty' && (
          <AdminRoyaltyTab />
        )}

        {/* Modal: Create or Edit Manager */}
        {isModalOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000,
              background: 'rgba(0, 20, 45, 0.65)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              overflowY: 'auto',
            }}
            onClick={() => setIsModalOpen(false)}
          >
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '680px',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 24px 60px rgba(0, 0, 0, 0.3)',
                padding: '36px',
                position: 'relative',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <h3 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-dark)', margin: 0 }}>
                    {editingManager ? 'Көмекшіні өңдеу' : 'Жаңа көмекші тағайындау'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    background: '#F1F5F9',
                    border: 'none',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#64748B',
                  }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                {/* Avatar Upload Section */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    marginBottom: '22px',
                    padding: '14px 18px',
                    background: '#F8FAFC',
                    borderRadius: '14px',
                    border: '1.5px dashed #CBD5E1',
                  }}
                >
                  <div
                    style={{
                      width: '58px',
                      height: '58px',
                      borderRadius: '50%',
                      background: formAvatarUrl ? '#F1F5F9' : 'rgba(0, 84, 148, 0.08)',
                      color: 'var(--blue)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '22px',
                      fontWeight: 800,
                      flexShrink: 0,
                      overflow: 'hidden',
                      border: '1.5px solid #E2E8F0',
                    }}
                  >
                    <img
                      src={formAvatarUrl || DEFAULT_MANAGER_AVATAR}
                      alt="Avatar"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '4px' }}>
                      Профиль суреті
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/jpg"
                        style={{ display: 'none' }}
                        onChange={handleAvatarFileChange}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingAvatar}
                        style={{
                          padding: '7px 14px',
                          borderRadius: '8px',
                          border: '1.5px solid #CBD5E1',
                          background: '#FFFFFF',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          color: 'var(--text-dark)',
                          cursor: isUploadingAvatar ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="17 8 12 3 7 8"></polyline>
                          <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        {isUploadingAvatar ? 'Жүктелуде...' : formAvatarUrl && formAvatarUrl !== DEFAULT_MANAGER_AVATAR ? 'Суретті ауыстыру' : 'Сурет жүктеу'}
                      </button>

                      {formAvatarUrl && formAvatarUrl !== DEFAULT_MANAGER_AVATAR && (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          style={{
                            padding: '7px 12px',
                            borderRadius: '8px',
                            border: 'none',
                            background: '#FEE2E2',
                            fontSize: '12.5px',
                            fontWeight: 700,
                            color: '#DC2626',
                            cursor: 'pointer',
                          }}
                        >
                          Әдепкіге қайтару
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Basic inputs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '6px' }}>
                      Аты-жөні <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid #CBD5E1',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '6px' }}>
                      Пошта <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid #CBD5E1',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '6px' }}>
                      Құпия сөз
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showFormPassword ? 'text' : 'password'}
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '11px 40px 11px 14px',
                          borderRadius: '10px',
                          border: '1.5px solid #CBD5E1',
                          fontSize: '14px',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowFormPassword(!showFormPassword)}
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: '#64748B',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title={showFormPassword ? 'Жасыру' : 'Көрсету'}
                      >
                        {showFormPassword ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                            <line x1="1" y1="1" x2="23" y2="23"></line>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '6px' }}>
                      Міндеті
                    </label>
                    <input
                      type="text"
                      value={formDuty}
                      onChange={(e) => setFormDuty(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid #CBD5E1',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '6px' }}>
                      ID нөмірі
                    </label>
                    <input
                      type="text"
                      value={formIdNumber}
                      onChange={(e) => handleIdNumberChange(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '10px',
                        border: formIdNumberError ? '1.5px solid #EF4444' : '1.5px solid #CBD5E1',
                        boxShadow: formIdNumberError ? '0 0 0 3px rgba(239, 68, 68, 0.12)' : 'none',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        fontFamily: 'monospace',
                        fontWeight: 600,
                      }}
                    />
                    {formIdNumberError && (
                      <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#DC2626', marginTop: '6px' }}>
                        {formIdNumberError}
                      </span>
                    )}
                  </div>
                </div>

                {/* Permissions Section */}
                <div style={{ borderTop: '1.5px solid #E2E8F0', paddingTop: '20px', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>
                        Құқылы функцияларды таңдаңыз:
                      </h4>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={handleSelectAllPermissions}
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          background: '#F8FAFC',
                          color: 'var(--blue)',
                          cursor: 'pointer',
                        }}
                      >
                        Барлығын таңдау
                      </button>
                      <button
                        type="button"
                        onClick={handleClearAllPermissions}
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          background: '#F8FAFC',
                          color: '#64748B',
                          cursor: 'pointer',
                        }}
                      >
                        Тазалау
                      </button>
                    </div>
                  </div>

                  {/* Grouped Permission Checkboxes */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {PERMISSION_CATEGORIES.map((cat) => {
                      const permsInCat = ALL_PERMISSIONS.filter((p) => p.category === cat.key);

                      return (
                        <div
                          key={cat.key}
                          style={{
                            background: '#F8FAFC',
                            borderRadius: '12px',
                            border: '1px solid #E2E8F0',
                            padding: '14px 16px',
                          }}
                        >
                          <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '10px' }}>
                            {cat.title}
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                            {permsInCat.map((pDef) => {
                              const isChecked = formPermissions.includes(pDef.key);

                              return (
                                <label
                                  key={pDef.key}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '10px',
                                    padding: '8px 10px',
                                    borderRadius: '8px',
                                    background: isChecked ? 'rgba(0, 84, 148, 0.08)' : '#FFFFFF',
                                    border: isChecked ? '1px solid var(--blue)' : '1px solid #E2E8F0',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleTogglePermission(pDef.key)}
                                    style={{ marginTop: '2px', accentColor: 'var(--blue)', width: '16px', height: '16px', cursor: 'pointer' }}
                                  />
                                  <div>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: isChecked ? 'var(--blue)' : 'var(--text-dark)' }}>
                                      {pDef.label}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '1px' }}>
                                      {pDef.description}
                                    </div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Status Toggle (if editing) */}
                {editingManager && (
                  <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                      type="checkbox"
                      id="form-is-active"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--blue)' }}
                    />
                    <label htmlFor="form-is-active" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)', cursor: 'pointer' }}>
                      Көмекші аккаунты белсенді (жүйеге кіруге рұқсат етілген)
                    </label>
                  </div>
                )}

                {/* Modal Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    style={{
                      padding: '11px 22px',
                      fontSize: '13px',
                      fontWeight: 700,
                      borderRadius: '50px',
                      border: '1.5px solid #CBD5E1',
                      background: '#FFFFFF',
                      color: 'var(--text-mid)',
                      cursor: 'pointer',
                    }}
                  >
                    Бас тарту
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary"
                    style={{
                      padding: '11px 28px',
                      fontSize: '13px',
                      fontWeight: 800,
                      borderRadius: '50px',
                    }}
                  >
                    {isSubmitting ? 'Сақталуда...' : editingManager ? 'Өзгерістерді сақтау' : 'Көмекшіні тағайындау'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Delete Confirmation */}
        {managerToDelete && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000,
              background: 'rgba(0, 20, 45, 0.65)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
            onClick={() => setManagerToDelete(null)}
          >
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '20px',
                width: '100%',
                maxWidth: '440px',
                padding: '32px 28px',
                textAlign: 'center',
                boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: '#FEE2E2',
                  color: '#DC2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </div>

              <h3 style={{ fontSize: '19px', fontWeight: 800, color: 'var(--text-dark)', margin: '0 0 8px' }}>
                Көмекшіні өшіруді растайсыз ба?
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-mid)', margin: '0 0 24px', lineHeight: 1.5 }}>
                «<strong>{managerToDelete.name}</strong>» ({managerToDelete.email}) әкімшілік көмекшілер тізімінен өшіріледі және админ панельге кіре алмайтын болады.
              </p>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => setManagerToDelete(null)}
                  style={{
                    padding: '10px 22px',
                    fontSize: '13px',
                    fontWeight: 700,
                    borderRadius: '50px',
                    border: '1.5px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: 'var(--text-mid)',
                    cursor: 'pointer',
                  }}
                >
                  Бас тарту
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  style={{
                    padding: '10px 24px',
                    fontSize: '13px',
                    fontWeight: 800,
                    borderRadius: '50px',
                    border: 'none',
                    background: '#DC2626',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(220, 38, 38, 0.3)',
                  }}
                >
                  Иә, өшіру
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Create or Edit Author */}
        {isAuthorModalOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000,
              background: 'rgba(0, 20, 45, 0.65)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              overflowY: 'auto',
            }}
            onClick={() => setIsAuthorModalOpen(false)}
          >
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '640px',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 24px 60px rgba(0, 0, 0, 0.3)',
                padding: '36px',
                position: 'relative',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <h3 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-dark)', margin: 0 }}>
                    {editingAuthor ? 'Авторды өңдеу' : 'Жаңа автор қосу'}
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-mid)', margin: '4px 0 0' }}>
                    Автор өз жеке парақшасында кітаптарының оқылу мен тыңдалу статистикасын көреді.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAuthorModalOpen(false)}
                  style={{
                    background: '#F1F5F9',
                    border: 'none',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#64748B',
                  }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAuthorSubmit}>
                {/* Author Avatar Upload Section */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    marginBottom: '22px',
                    padding: '14px 18px',
                    background: '#F8FAFC',
                    borderRadius: '14px',
                    border: '1.5px dashed #CBD5E1',
                  }}
                >
                  <div
                    style={{
                      width: '58px',
                      height: '58px',
                      borderRadius: '50%',
                      background: authorAvatarUrl ? '#F1F5F9' : 'rgba(0, 84, 148, 0.08)',
                      color: 'var(--blue)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '22px',
                      fontWeight: 800,
                      flexShrink: 0,
                      overflow: 'hidden',
                      border: '1.5px solid #E2E8F0',
                    }}
                  >
                    <img
                      src={authorAvatarUrl || DEFAULT_MANAGER_AVATAR}
                      alt="Avatar"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '4px' }}>
                      Автор суреті
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <input
                        ref={authorFileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/jpg"
                        style={{ display: 'none' }}
                        onChange={handleAuthorAvatarFileChange}
                      />
                      <button
                        type="button"
                        onClick={() => authorFileInputRef.current?.click()}
                        disabled={isUploadingAuthorAvatar}
                        style={{
                          padding: '7px 14px',
                          borderRadius: '8px',
                          border: '1.5px solid #CBD5E1',
                          background: '#FFFFFF',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          color: 'var(--text-dark)',
                          cursor: isUploadingAuthorAvatar ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="17 8 12 3 7 8"></polyline>
                          <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        {isUploadingAuthorAvatar ? 'Жүктелуде...' : authorAvatarUrl && authorAvatarUrl !== DEFAULT_MANAGER_AVATAR ? 'Суретті ауыстыру' : 'Сурет жүктеу'}
                      </button>

                      {authorAvatarUrl && authorAvatarUrl !== DEFAULT_MANAGER_AVATAR && (
                        <button
                          type="button"
                          onClick={handleRemoveAuthorAvatar}
                          style={{
                            padding: '7px 12px',
                            borderRadius: '8px',
                            border: 'none',
                            background: '#FEE2E2',
                            fontSize: '12.5px',
                            fontWeight: 700,
                            color: '#DC2626',
                            cursor: 'pointer',
                          }}
                        >
                          Әдепкіге қайтару
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Author Name & Assigned Author Name */}
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '6px' }}>
                    Автордың аты-жөні <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Мысалы: Мұхтар Әуезов"
                    value={authorName}
                    onChange={(e) => {
                      setAuthorName(e.target.value);
                      setAuthorAssignedName(e.target.value);
                    }}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Email and Phone */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '18px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '6px' }}>
                      Электронды пошта (Логин) <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="author@example.com"
                      value={authorEmail}
                      onChange={(e) => setAuthorEmail(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid #CBD5E1',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '6px' }}>
                      Телефон нөмірі
                    </label>
                    <input
                      type="tel"
                      placeholder="+7 (701) 000-00-00"
                      value={authorPhone}
                      onChange={(e) => setAuthorPhone(formatPhoneNumber(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid #CBD5E1',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                {/* Password & ID Number */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)' }}>
                        Құпия сөз
                      </label>
                      <button
                        type="button"
                        onClick={generateAuthorPassword}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--blue)',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: 0,
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="23 4 23 10 17 10"></polyline>
                          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                        </svg>
                        Авто құрастыру
                      </button>
                    </div>

                    <div style={{ position: 'relative' }}>
                      <input
                        type={showAuthorPassword ? 'text' : 'password'}
                        placeholder="Кемінде 6 таңба"
                        value={authorPassword}
                        onChange={(e) => setAuthorPassword(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '11px 40px 11px 14px',
                          borderRadius: '10px',
                          border: '1.5px solid #CBD5E1',
                          fontSize: '14px',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowAuthorPassword(!showAuthorPassword)}
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: '#64748B',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title={showAuthorPassword ? 'Жасыру' : 'Көрсету'}
                      >
                        {showAuthorPassword ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                            <line x1="1" y1="1" x2="23" y2="23"></line>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '6px' }}>
                      ID нөмірі
                    </label>
                    <input
                      type="text"
                      placeholder="0000 0001"
                      value={authorIdNumber}
                      onChange={(e) => handleAuthorIdNumberChange(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '10px',
                        border: authorIdNumberError ? '1.5px solid #EF4444' : '1.5px solid #CBD5E1',
                        boxShadow: authorIdNumberError ? '0 0 0 3px rgba(239, 68, 68, 0.12)' : 'none',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        fontFamily: 'monospace',
                        fontWeight: 600,
                      }}
                    />
                    {authorIdNumberError && (
                      <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#DC2626', marginTop: '6px' }}>
                        {authorIdNumberError}
                      </span>
                    )}
                  </div>
                </div>

                {/* Assigned Books Multi-Select */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-dark)' }}>
                      Осы авторға тиесілі кітаптарды таңдау ({authorAssignedBookIds.length})
                    </label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setAuthorAssignedBookIds(books.map((b) => b.id))}
                        style={{ fontSize: '11.5px', color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                      >
                        Барлығын таңдау
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuthorAssignedBookIds([])}
                        style={{ fontSize: '11.5px', color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                      >
                        Тазалау
                      </button>
                    </div>
                  </div>

                  <input
                    type="text"
                    placeholder="Кітапты аты немесе авторы бойынша іздеу..."
                    value={bookSearchInModal}
                    onChange={(e) => setBookSearchInModal(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '12.5px',
                      marginBottom: '10px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />

                  <div
                    style={{
                      maxHeight: '180px',
                      overflowY: 'auto',
                      border: '1.5px solid #E2E8F0',
                      borderRadius: '12px',
                      padding: '8px',
                      background: '#F8FAFC',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    {books
                      .filter((b) => {
                        if (!bookSearchInModal.trim()) return true;
                        const q = bookSearchInModal.toLowerCase().trim();
                        return (
                          b.title.toLowerCase().includes(q) ||
                          (b.author && b.author.toLowerCase().includes(q)) ||
                          (b.category && b.category.toLowerCase().includes(q))
                        );
                      })
                      .map((b) => {
                        const isSelected = authorAssignedBookIds.includes(b.id);
                        const otherAuthor = authors.find(
                          (a) =>
                            a.id !== editingAuthor?.id &&
                            (a as any).authorId !== editingAuthor?.id &&
                            (a as any).userId !== editingAuthor?.id &&
                            a.assignedBookIds?.includes(b.id)
                        );
                        const isAssignedToOther = Boolean(otherAuthor);

                        return (
                          <label
                            key={b.id}
                            onClick={(e) => {
                              if (isAssignedToOther) {
                                e.preventDefault();
                                showToast(
                                  `«${b.title}» кітабы қазір ${otherAuthor?.assignedAuthorName || otherAuthor?.name} авторына бекітілген. Бір кітап тек бір авторға бекітілуі мүмкін!`,
                                  'error'
                                );
                              }
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '8px 10px',
                              borderRadius: '8px',
                              background: isSelected
                                ? '#EFF6FF'
                                : isAssignedToOther
                                ? '#F1F5F9'
                                : '#FFFFFF',
                              border: isSelected
                                ? '1.5px solid #93C5FD'
                                : isAssignedToOther
                                ? '1px dashed #CBD5E1'
                                : '1px solid #E2E8F0',
                              cursor: isAssignedToOther ? 'not-allowed' : 'pointer',
                              opacity: isAssignedToOther ? 0.75 : 1,
                              transition: 'all 0.15s',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={isAssignedToOther}
                              onChange={(e) => {
                                if (isAssignedToOther) return;
                                if (e.target.checked) {
                                  setAuthorAssignedBookIds([...authorAssignedBookIds, b.id]);
                                } else {
                                  setAuthorAssignedBookIds(authorAssignedBookIds.filter((id) => id !== b.id));
                                }
                              }}
                              style={{
                                width: '16px',
                                height: '16px',
                                accentColor: 'var(--blue)',
                                cursor: isAssignedToOther ? 'not-allowed' : 'pointer',
                              }}
                            />
                            <div
                              style={{
                                width: '28px',
                                height: '38px',
                                borderRadius: '4px',
                                background: b.gradient || '#005494',
                                flexShrink: 0,
                                overflow: 'hidden',
                              }}
                            >
                              {b.coverImage && (
                                <img src={b.coverImage} alt={b.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: '13px',
                                  fontWeight: 800,
                                  color: isAssignedToOther ? '#64748B' : 'var(--text-dark)',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {b.title}
                              </div>
                              <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
                                <span>{b.author || 'Авторсыз'}</span>
                                {b.hasAudio && <span style={{ color: '#2563EB', fontWeight: 700 }}>🎧 Аудио</span>}
                                {isAssignedToOther ? (
                                  <span
                                    style={{
                                      fontSize: '10.5px',
                                      fontWeight: 700,
                                      color: '#B91C1C',
                                      background: '#FEF2F2',
                                      border: '1px solid #FECACA',
                                      borderRadius: '4px',
                                      padding: '1px 6px',
                                    }}
                                  >
                                    🔒 Бекітілген: {otherAuthor?.assignedAuthorName || otherAuthor?.name}
                                  </span>
                                ) : isSelected ? (
                                  <span
                                    style={{
                                      fontSize: '10.5px',
                                      fontWeight: 700,
                                      color: '#15803D',
                                      background: '#F0FDF4',
                                      border: '1px solid #BBF7D0',
                                      borderRadius: '4px',
                                      padding: '1px 6px',
                                    }}
                                  >
                                    ✓ Таңдалды
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                  </div>
                </div>

                {/* Status Toggle (if editing) */}
                {editingAuthor && (
                  <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                      type="checkbox"
                      id="author-is-active"
                      checked={authorIsActive}
                      onChange={(e) => setAuthorIsActive(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--blue)' }}
                    />
                    <label htmlFor="author-is-active" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)', cursor: 'pointer' }}>
                      Автор аккаунты белсенді (статистика парақшасына кіруге рұқсат етілген)
                    </label>
                  </div>
                )}

                {/* Modal Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setIsAuthorModalOpen(false)}
                    style={{
                      padding: '11px 22px',
                      fontSize: '13px',
                      fontWeight: 700,
                      borderRadius: '50px',
                      border: '1.5px solid #CBD5E1',
                      background: '#FFFFFF',
                      color: 'var(--text-mid)',
                      cursor: 'pointer',
                    }}
                  >
                    Бас тарту
                  </button>

                  <button
                    type="submit"
                    disabled={isAuthorSubmitting}
                    className="btn-primary"
                    style={{
                      padding: '11px 28px',
                      fontSize: '13px',
                      fontWeight: 800,
                      borderRadius: '50px',
                    }}
                  >
                    {isAuthorSubmitting ? 'Сақталуда...' : editingAuthor ? 'Өзгерістерді сақтау' : 'Авторды қосу'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Delete Author Confirmation */}
        {authorToDelete && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000,
              background: 'rgba(0, 20, 45, 0.65)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
            onClick={() => setAuthorToDelete(null)}
          >
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '20px',
                width: '100%',
                maxWidth: '440px',
                padding: '32px 28px',
                textAlign: 'center',
                boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: '#FEE2E2',
                  color: '#DC2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </div>

              <h3 style={{ fontSize: '19px', fontWeight: 800, color: 'var(--text-dark)', margin: '0 0 8px' }}>
                Авторды өшіруді растайсыз ба?
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-mid)', margin: '0 0 24px', lineHeight: 1.5 }}>
                «<strong>{authorToDelete.name}</strong>» ({authorToDelete.email}) авторлар тізімінен өшіріледі.
              </p>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => setAuthorToDelete(null)}
                  style={{
                    padding: '10px 22px',
                    fontSize: '13px',
                    fontWeight: 700,
                    borderRadius: '50px',
                    border: '1.5px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: 'var(--text-mid)',
                    cursor: 'pointer',
                  }}
                >
                  Бас тарту
                </button>
                <button
                  type="button"
                  onClick={handleAuthorDeleteConfirm}
                  style={{
                    padding: '10px 24px',
                    fontSize: '13px',
                    fontWeight: 800,
                    borderRadius: '50px',
                    border: 'none',
                    background: '#DC2626',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(220, 38, 38, 0.3)',
                  }}
                >
                  Иә, өшіру
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </section>
  );
};
