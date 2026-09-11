import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useToastStore } from '../../store/useToastStore';
import { User } from '../../types';

const USERS_REGISTRY_KEY = 'tanda_users_registry_v1';

function getStoredUsers(): User[] {
  try {
    const raw = localStorage.getItem(USERS_REGISTRY_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) return list;
    }
  } catch {}
  return [];
}

function saveStoredUsers(users: User[]) {
  try {
    localStorage.setItem(USERS_REGISTRY_KEY, JSON.stringify(users));
  } catch {}
}

export const ReadersPage: React.FC = () => {
  const { showToast } = useToastStore();

  const [readers, setReaders] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const fetchReaders = () => {
    setIsLoading(true);
    try {
      const allUsers = getStoredUsers();
      const clients = allUsers.filter((u) => u.role === 'client');
      setReaders(clients);
    } catch {
      showToast('Оқырмандар тізімін жүктеу мүмкін болмады', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReaders();
  }, []);

  // Apply search query
  const filteredReaders = useMemo(() => {
    if (!searchQuery.trim()) return readers;
    const q = searchQuery.toLowerCase().trim();
    const cleanQ = q.replace(/[\s\-_:]+/g, '').replace(/^id/i, '');

    return readers.filter((r) => {
      const name = (r.name || '').toLowerCase();
      const email = (r.email || '').toLowerCase();
      const rawIdNum = (r.idNumber || '').toLowerCase();
      const cleanIdNum = rawIdNum.replace(/[\s\-_:]+/g, '').replace(/^id/i, '');
      const rawUserId = (r.id || '').toLowerCase();

      if (name.includes(q) || email.includes(q) || rawIdNum.includes(q) || rawUserId.includes(q)) {
        return true;
      }

      if (cleanQ.length > 0 && cleanIdNum.length > 0) {
        if (cleanIdNum.includes(cleanQ) || cleanQ.includes(cleanIdNum)) {
          return true;
        }
      }

      return false;
    });
  }, [readers, searchQuery]);

  const confirmDelete = () => {
    if (userToDelete) {
      try {
        const allUsers = getStoredUsers();
        const updated = allUsers.filter((u) => u.id !== userToDelete.id);
        saveStoredUsers(updated);
        setReaders((prev) => prev.filter((u) => u.id !== userToDelete.id));
        showToast(`"${userToDelete.name || userToDelete.email}" оқырманы тізімнен өшірілді`, 'info');
      } catch {
        showToast('Оқырманды өшіру сәтсіз аяқталды', 'error');
      } finally {
        setUserToDelete(null);
      }
    }
  };

  return (
    <section className="admin-page-section" id="readers-section">
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        {/* Breadcrumb Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748B' }}>
            <Link to="/admin" style={{ color: 'var(--blue)', fontWeight: 600, textDecoration: 'none' }}>
              Басқару панелі
            </Link>
            <span>/</span>
            <span style={{ color: 'var(--text-dark)', fontWeight: 700 }}>
              Оқырмандар тізімі
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
              color: 'var(--blue)',
              textDecoration: 'none',
              padding: '7px 14px',
              borderRadius: '8px',
              background: '#FFFFFF',
              border: '1.5px solid #CBD5E1',
              transition: 'all 0.15s',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Басқару панеліне қайту
          </Link>
        </div>

        {/* Main Card */}
        <div className="admin-card">
          {/* Header Row */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-dark)', margin: 0 }}>
                Оқырмандар тізімі
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-mid)', marginTop: '4px' }}>
                Барлық тіркелген оқырмандар саны: <span style={{ fontWeight: 700, color: 'var(--blue)' }}>{readers.length}</span> оқырман
              </p>
            </div>

            {/* Search Box */}
            <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Оқырман аты, ID, пошта..."
                style={{
                  width: '100%',
                  padding: '9px 14px 9px 34px',
                  borderRadius: '8px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '13px',
                  outline: 'none',
                  background: '#F8FAFC',
                  color: 'var(--text-dark)',
                  boxSizing: 'border-box',
                }}
              />
              <svg
                style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#64748B', pointerEvents: 'none' }}
                width="15"
                height="15"
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

          {/* Readers Table */}
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: '45px', textAlign: 'center' }}>№</th>
                  <th style={{ width: '140px', whiteSpace: 'nowrap' }}>ID нөмірі</th>
                  <th>Аты-жөні</th>
                  <th>Электрондық поштасы</th>
                  <th style={{ width: '130px', whiteSpace: 'nowrap' }}>Тіркелген күні</th>
                  <th style={{ width: '110px', whiteSpace: 'nowrap' }}>Мәртебесі</th>
                  <th style={{ width: '90px', textAlign: 'right', whiteSpace: 'nowrap' }}>Әрекеттер</th>
                </tr>
              </thead>
              <tbody>
                {filteredReaders.map((reader, index) => {
                  const initial = reader.name ? reader.name.trim().charAt(0).toUpperCase() : 'О';
                  const dateStr = reader.createdAt ? new Date(reader.createdAt).toLocaleDateString('kk-KZ') : '2026-09-01';
                  return (
                    <tr key={reader.id}>
                      {/* Sequential Number */}
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#64748B', fontSize: '12px' }}>
                        {index + 1}
                      </td>

                      {/* ID Number */}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 800,
                            fontFamily: 'monospace',
                            background: 'rgba(0, 84, 148, 0.1)',
                            color: 'var(--blue)',
                            padding: '3px 10px',
                            borderRadius: '4px',
                            letterSpacing: '0.04em',
                            display: 'inline-block',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          ID: {reader.idNumber || `001 00${index + 1}`}
                        </span>
                      </td>

                      {/* Name & Avatar */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, var(--blue), var(--orange))',
                              color: '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '13px',
                              flexShrink: 0,
                            }}
                          >
                            {initial}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: 'var(--text-dark)', fontSize: '14px' }}>
                              {reader.name || 'Оқырман'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td>
                        <div style={{ color: 'var(--text-mid)', fontSize: '13px' }}>
                          {reader.email}
                        </div>
                      </td>

                      {/* Registration Date */}
                      <td>
                        <div style={{ color: '#475569', fontSize: '13px', fontWeight: 600 }}>
                          {dateStr}
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '20px',
                            background: '#D1FAE5',
                            color: '#047857',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }}></span>
                          Оқырман
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => setUserToDelete(reader)}
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: 700,
                            background: '#FEF2F2',
                            color: '#B91C1C',
                            borderRadius: '6px',
                            border: '1px solid #FECACA',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                        >
                          Өшіру
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!isLoading && filteredReaders.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-mid)' }}>
              Оқырмандар табылмады немесе тізім бос.
            </div>
          )}

          {/* Pagination summary */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '20px',
              paddingTop: '16px',
              borderTop: '1px solid #E2E8F0',
            }}
          >
            <div style={{ fontSize: '13px', color: 'var(--text-mid)', fontWeight: 600 }}>
              1-{filteredReaders.length} оқырман көрсетілуде (Барлығы: {readers.length})
            </div>
          </div>
        </div>
      </div>

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(13,27,42,0.7)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '440px',
              width: '100%',
              padding: '30px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            }}
          >
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '12px' }}>
              Оқырманды өшіру
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-mid)', lineHeight: 1.6, marginBottom: '24px' }}>
              Сіз шынымен <strong style={{ color: 'var(--text-dark)' }}>{userToDelete.name || userToDelete.email}</strong> (ID: {userToDelete.idNumber}) оқырманын тіркеуден өшіргіңіз келе ме?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                style={{
                  padding: '9px 18px',
                  borderRadius: '50px',
                  border: '1px solid #CBD5E1',
                  background: '#FFF',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Болдырмау
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                style={{
                  padding: '9px 22px',
                  borderRadius: '50px',
                  border: 'none',
                  background: '#DC2626',
                  color: '#FFF',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Иә, өшіру
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
