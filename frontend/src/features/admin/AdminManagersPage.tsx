import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import { User, AdminPermission } from '../../types';
import { ALL_PERMISSIONS, PERMISSION_CATEGORIES, hasAdminPermission } from '../../utils/permissions';
import { resizeAndCompressImage } from '../../utils/imageUtils';

export const AdminManagersPage: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser, role, getAllManagers, createManagerByAdmin, updateManagerPermissions, deleteManager } = useAuthStore();
  const { showToast } = useToastStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [managers, setManagers] = useState<User[]>(() => getAllManagers());
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingManager, setEditingManager] = useState<User | null>(null);
  const [managerToDelete, setManagerToDelete] = useState<User | null>(null);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [formDuty, setFormDuty] = useState('');
  const [formAvatarUrl, setFormAvatarUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [formPermissions, setFormPermissions] = useState<AdminPermission[]>([]);
  const [formIsActive, setFormIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Refresh managers list
  const refreshList = () => {
    setManagers(getAllManagers());
  };

  // Redirect if not super admin or lacks managers_manage permission
  React.useEffect(() => {
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

  const handleOpenCreateModal = () => {
    setEditingManager(null);
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setShowFormPassword(false);
    setFormDuty('');
    setFormAvatarUrl(null);
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
    setFormAvatarUrl(mgr.avatarUrl || null);
    setFormPermissions(mgr.permissions || []);
    setFormIsActive(mgr.isActive !== false);
    setIsModalOpen(true);
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
    setFormAvatarUrl(null);
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

    setIsSubmitting(true);
    try {
      if (editingManager) {
        const res = await updateManagerPermissions(editingManager.id, {
          name: formName.trim(),
          email: formEmail.trim().toLowerCase(),
          password: formPassword.trim() || undefined,
          duty: formDuty.trim() || undefined,
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

  return (
    <section className="admin-page-section" id="admin-managers-section">
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 20px' }}>
        
        {/* Header Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #003763 0%, #005494 100%)',
            borderRadius: '24px',
            padding: '36px 40px',
            color: '#FFFFFF',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 12px 32px rgba(0, 55, 99, 0.18)',
            marginBottom: '32px',
          }}
        >
          <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
            <h1 style={{ fontSize: '30px', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>
              Басқару
            </h1>

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="btn-primary"
              style={{
                padding: '13px 28px',
                fontSize: '14px',
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
          </div>
        </div>

        {/* Super Admin Status Card */}
        {superAdmin && (
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '24px 28px',
              border: '1.5px solid #E2E8F0',
              boxShadow: '0 4px 20px rgba(0, 84, 148, 0.05)',
              marginBottom: '28px',
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
                      width: '56px',
                      height: '56px',
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
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>
                    {superAdmin.name}
                  </h3>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-mid)', marginTop: '4px' }}>
                  {superAdmin.email} &bull; ID: {superAdmin.idNumber || '000 001'}
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
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>
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
                      padding: '20px 24px',
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
                          borderRadius: '12px',
                          background: assistant.avatarUrl ? '#F1F5F9' : 'rgba(0, 84, 148, 0.08)',
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
                        {assistant.avatarUrl ? (
                          <img
                            src={assistant.avatarUrl}
                            alt={assistant.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          assistant.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-dark)' }}>
                            {assistant.name}
                          </span>
                          {assistant.duty && (
                            <>
                              <span style={{ color: '#94A3B8', fontWeight: 400 }}>|</span>
                              <span style={{ fontSize: '15px', fontWeight: 600, color: '#475569' }}>
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
                        <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span>{assistant.email}</span>
                          <span style={{ color: '#CBD5E1' }}>•</span>
                          <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#475569', background: '#F1F5F9', padding: '1px 8px', borderRadius: '4px', fontFamily: 'monospace' }}>
                            ID: {assistant.idNumber || '000 002'}
                          </span>
                        </div>

                        {/* Permissions badges */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
                          {perms.length > 0 ? (
                            perms.map((pKey) => {
                              const pDef = ALL_PERMISSIONS.find((p) => p.key === pKey);
                              return (
                                <span
                                  key={pKey}
                                  style={{
                                    fontSize: '11.5px',
                                    fontWeight: 600,
                                    padding: '3px 10px',
                                    borderRadius: '20px',
                                    background: '#F8FAFC',
                                    color: '#334155',
                                    border: '1px solid #E2E8F0',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
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
                padding: '48px 20px',
                background: '#F8FAFC',
                borderRadius: '16px',
                border: '2px dashed #CBD5E1',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: '#EDF2F7',
                  color: '#94A3B8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <line x1="19" y1="8" x2="19" y2="14"></line>
                  <line x1="22" y1="11" x2="16" y2="11"></line>
                </svg>
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-dark)', margin: '0 0 6px' }}>
                Әзірге көмекшілер тағайындалмаған
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-mid)', maxWidth: '420px', margin: '0 auto 20px' }}>
                Жоғарыдағы «Жаңа көмекші қосу» батырмасын басып, Google аккаунты немесе поштасы арқылы модератор қосыңыз.
              </p>
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="btn-primary"
                style={{ padding: '10px 24px', fontSize: '13px' }}
              >
                + Жаңа көмекші қосу
              </button>
            </div>
          )}
        </div>

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
                      borderRadius: '14px',
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
                    {formAvatarUrl ? (
                      <img
                        src={formAvatarUrl}
                        alt="Avatar"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        referrerPolicy="no-referrer"
                      />
                    ) : formName.trim() ? (
                      formName.trim().charAt(0).toUpperCase()
                    ) : (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                    )}
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
                        {isUploadingAvatar ? 'Жүктелуде...' : formAvatarUrl ? 'Суретті ауыстыру' : 'Сурет жүктеу'}
                      </button>

                      {formAvatarUrl && (
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
                          Өшіру
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

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
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

      </div>
    </section>
  );
};
