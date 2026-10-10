import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Headphones,
  Plus,
  Play,
  Pause,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Waves,
  CloudRain,
  Flame,
  Trees,
  Moon,
  Coffee,
  Wind,
  Music,
  ArrowUpDown,
  ExternalLink,
} from 'lucide-react';
import { ambientSoundApi, AmbientSound, AmbientSoundRequest } from '../../shared/api/ambientSound.api';
import { useToastStore } from '../../store/useToastStore';
import { formatAudioUrl } from '../../utils/mediaUtils';

const AVAILABLE_ICONS = [
  { name: 'Waves', label: 'Теңіз/Су', icon: Waves },
  { name: 'CloudRain', label: 'Жаңбыр', icon: CloudRain },
  { name: 'Flame', label: 'Камин/От', icon: Flame },
  { name: 'Trees', label: 'Орман/Табиғат', icon: Trees },
  { name: 'Moon', label: 'Түн/Самал', icon: Moon },
  { name: 'Coffee', label: 'Кофехана', icon: Coffee },
  { name: 'Wind', label: 'Жел', icon: Wind },
  { name: 'Headphones', label: 'Құлаққап', icon: Headphones },
];

export const AdminAmbientSoundsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToastStore();

  const [previewSoundId, setPreviewSoundId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingSound, setEditingSound] = useState<AmbientSound | null>(null);

  // Form State
  const [formData, setFormData] = useState<AmbientSoundRequest>({
    name: '',
    audioUrl: '',
    icon: 'Waves',
    sortOrder: 0,
    isActive: true,
  });

  const { data: sounds = [], isLoading } = useQuery<AmbientSound[]>({
    queryKey: ['adminAmbientSounds'],
    queryFn: ambientSoundApi.getAllAdminSounds,
  });

  const createMutation = useMutation({
    mutationFn: ambientSoundApi.createSound,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAmbientSounds'] });
      queryClient.invalidateQueries({ queryKey: ['ambientSounds'] });
      showToast('Атмосфералық дыбыс сәтті қосылды!', 'success');
      closeModal();
    },
    onError: () => {
      showToast('Қосу кезінде қате орын алды', 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: AmbientSoundRequest }) =>
      ambientSoundApi.updateSound(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAmbientSounds'] });
      queryClient.invalidateQueries({ queryKey: ['ambientSounds'] });
      showToast('Дыбыс мәліметтері жаңартылды!', 'success');
      closeModal();
    },
    onError: () => {
      showToast('Жаңарту кезінде қате орын алды', 'error');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ambientSoundApi.toggleActive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAmbientSounds'] });
      queryClient.invalidateQueries({ queryKey: ['ambientSounds'] });
      showToast('Күйі өзгертілді', 'success');
    },
    onError: () => {
      showToast('Қате орын алды', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ambientSoundApi.deleteSound,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAmbientSounds'] });
      queryClient.invalidateQueries({ queryKey: ['ambientSounds'] });
      showToast('Дыбыс өшірілді', 'success');
    },
    onError: () => {
      showToast('Өшіру кезінде қате орын алды', 'error');
    },
  });

  const handlePreview = (sound: AmbientSound) => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    if (previewSoundId === sound.id) {
      audioRef.current.pause();
      setPreviewSoundId(null);
      return;
    }

    audioRef.current.src = formatAudioUrl(sound.audioUrl);
    audioRef.current.play().catch(() => {
      showToast('Аудио ойнату сәтсіз аяқталды (URL тексеріңіз)', 'error');
    });
    setPreviewSoundId(sound.id);

    audioRef.current.onended = () => {
      setPreviewSoundId(null);
    };
  };

  const openCreateModal = () => {
    setEditingSound(null);
    setFormData({
      name: '',
      audioUrl: '',
      icon: 'Waves',
      sortOrder: (sounds.length + 1) * 1,
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (sound: AmbientSound) => {
    setEditingSound(sound);
    setFormData({
      name: sound.name,
      audioUrl: sound.audioUrl,
      icon: sound.icon || 'Waves',
      sortOrder: sound.sortOrder,
      isActive: sound.isActive,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSound(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.audioUrl.trim()) {
      showToast('Атауы мен аудио сілтемесін толтырыңыз', 'error');
      return;
    }

    if (editingSound) {
      updateMutation.mutate({ id: editingSound.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const renderIconComponent = (iconName?: string) => {
    const found = AVAILABLE_ICONS.find((i) => i.name.toLowerCase() === iconName?.toLowerCase());
    const IconComp = found ? found.icon : Waves;
    return <IconComp className="w-5 h-5 text-[#F08000]" />;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fadeIn pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/15 text-[#F08000] flex items-center justify-center font-bold">
            <Headphones className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Парақта: Атмосфералық дыбыстар
            </h1>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-[#F08000] to-orange-500 hover:from-orange-500 hover:to-[#F08000] text-white font-bold text-sm shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Жаңа дыбыс қосу
        </button>
      </div>

      {/* Sounds List Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Music className="w-4 h-4 text-orange-500" /> Барлық дыбыстар ({sounds.length})
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-sm text-slate-400">Жүктелуде...</div>
        ) : sounds.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Headphones className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
            <div className="text-sm font-bold text-slate-600 dark:text-slate-400">Әзірге дыбыстар жоқ</div>
            <button
              onClick={openCreateModal}
              className="text-xs text-[#F08000] font-bold hover:underline"
            >
              Бірінші дыбысты қосу
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-5">Реті</th>
                  <th className="py-3.5 px-5">Иконка & Атауы</th>
                  <th className="py-3.5 px-5">Аудио URL</th>
                  <th className="py-3.5 px-5 text-center">Тыңдау</th>
                  <th className="py-3.5 px-5 text-center">Күйі</th>
                  <th className="py-3.5 px-5 text-right">Әрекеттер</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sounds.map((sound: AmbientSound) => {
                  const isAudioPreviewing = previewSoundId === sound.id;

                  return (
                    <tr
                      key={sound.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-4 px-5 font-mono text-xs text-slate-400">
                        #{sound.sortOrder}
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                            {renderIconComponent(sound.icon)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">
                              {sound.name}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Иконка: {sound.icon || 'Waves'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <a
                          href={sound.audioUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-slate-500 hover:text-orange-500 flex items-center gap-1 truncate max-w-xs"
                        >
                          <span className="truncate">{sound.audioUrl}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </td>
                      <td className="py-4 px-5 text-center">
                        <button
                          type="button"
                          onClick={() => handlePreview(sound)}
                          className={`w-9 h-9 rounded-xl inline-flex items-center justify-center transition-all cursor-pointer ${
                            isAudioPreviewing
                              ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30 animate-pulse'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-orange-500 hover:text-white'
                          }`}
                          title={isAudioPreviewing ? 'Тоқтату' : 'Тыңдап көру'}
                        >
                          {isAudioPreviewing ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          )}
                        </button>
                      </td>
                      <td className="py-4 px-5 text-center">
                        <button
                          type="button"
                          onClick={() => toggleMutation.mutate(sound.id)}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            sound.isActive
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {sound.isActive ? 'Белсенді' : 'Өшірулі'}
                        </button>
                      </td>
                      <td className="py-4 px-5 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(sound)}
                          className="p-2 rounded-xl text-slate-400 hover:text-orange-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Өңдеу"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`«${sound.name}» дыбысын өшіруге сенімдісіз бе?`)) {
                              deleteMutation.mutate(sound.id);
                            }
                          }}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                          title="Өшіру"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create or Edit Sound */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {editingSound ? 'Дыбысты өңдеу' : 'Жаңа атмосфералық дыбыс'}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Атауы
                </label>
                <input
                  type="text"
                  required
                  placeholder="Теңіз толқыны"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Аудио сілтемесі
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://tandamen.kz/api/v1/media/telegram/... немесе файл ID"
                  value={formData.audioUrl}
                  onChange={(e) => setFormData({ ...formData, audioUrl: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-orange-500 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Иконка таңдау
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {AVAILABLE_ICONS.map((item) => {
                    const isSelected = formData.icon === item.name;
                    const IconComponent = item.icon;
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon: item.name })}
                        className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-orange-500 bg-orange-500/10 text-[#F08000]'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        <IconComponent className="w-4 h-4" />
                        <span className="text-[10px] font-semibold">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Реттік саны (Sort)
                  </label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Күйі
                  </label>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                    />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Белсенді
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-200 cursor-pointer"
                >
                  Болдырмау
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 py-3 bg-gradient-to-r from-[#F08000] to-orange-500 text-white font-bold text-xs rounded-xl shadow-md hover:from-orange-500 hover:to-[#F08000] cursor-pointer"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Сақталуда...'
                    : editingSound
                    ? 'Сақтау'
                    : 'Қосу'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
