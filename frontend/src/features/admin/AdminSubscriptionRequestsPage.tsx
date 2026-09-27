import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ExternalLink, 
  Search, 
  Filter, 
  RefreshCw,
  Crown,
  Eye,
  AlertCircle
} from 'lucide-react';
import { premiumApi } from '../../shared/api/premium.api';
import { SubscriptionPaymentRequest } from '../../types';
import { useToastStore } from '../../store/useToastStore';
import { Modal } from '../../components/ui/Modal';

export const AdminSubscriptionRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<SubscriptionPaymentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);

  // Reject modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const { showToast } = useToastStore();

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const data = await premiumApi.getAllSubscriptionRequestsAdmin(
        statusFilter === 'ALL' ? undefined : statusFilter
      );
      setRequests(data);
    } catch (err) {
      showToast('Төлем сұраныстарын жүктеу кезінде қате орын алды', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [statusFilter]);

  const handleApprove = async (id: string, name?: string) => {
    if (!window.confirm(`Бұл төлемді мақұлдап, ${name || 'оқырманға'} Премиум жазылымды қосқыңыз келе ме?`)) {
      return;
    }

    setIsProcessing(true);
    try {
      await premiumApi.approveSubscriptionRequestAdmin(id);
      showToast('Төлем сәтті мақұлданды! Оқырманға Премиум қосылды 👑', 'success');
      loadRequests();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Мақұлдау кезінде қате орын алды', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const openRejectModal = (id: string) => {
    setRejectingId(id);
    setRejectionReason('Kaspi-де төлем табылмады немесе сомасы сәйкес келмейді');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectingId) return;
    setIsProcessing(true);
    try {
      await premiumApi.rejectSubscriptionRequestAdmin(rejectingId, rejectionReason);
      showToast('Төлем сұранысы қабылданбады', 'info');
      setRejectModalOpen(false);
      setRejectingId(null);
      loadRequests();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Қате орын алды', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredRequests = requests.filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery = 
      (r.userName && r.userName.toLowerCase().includes(q)) ||
      (r.userEmail && r.userEmail.toLowerCase().includes(q)) ||
      (r.phoneOrAccount && r.phoneOrAccount.toLowerCase().includes(q)) ||
      (r.id && r.id.toLowerCase().includes(q));
    return matchesQuery;
  });

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900">Премиум төлемдері</h1>
            {pendingCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white animate-pulse">
                +{pendingCount} күтілуде
              </span>
            )}
          </div>
        </div>

        <button
          onClick={loadRequests}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold transition"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Жаңарту
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Оқырман аты, поштасы немесе Kaspi нөмірі бойынша іздеу..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          {[
            { label: 'Барлығы', val: 'ALL' },
            { label: 'Күтілуде', val: 'PENDING' },
            { label: 'Мақұлданған', val: 'APPROVED' },
            { label: 'Қабылданбаған', val: 'REJECTED' },
          ].map((tab) => (
            <button
              key={tab.val}
              onClick={() => setStatusFilter(tab.val)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                statusFilter === tab.val
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Жүктелуде...</div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            Сұраныстар табылмады
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-xs font-bold text-slate-500 uppercase">
                  <th className="py-3 px-4">Оқырман</th>
                  <th className="py-3 px-4">Тариф</th>
                  <th className="py-3 px-4">Сомасы</th>
                  <th className="py-3 px-4">Kaspi Чек</th>
                  <th className="py-3 px-4">Уақыты</th>
                  <th className="py-3 px-4">Статус</th>
                  <th className="py-3 px-4 text-right">Әрекет</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{req.userName || 'Аты көрсетілмеген'}</div>
                      <div className="text-xs text-slate-500">{req.userEmail}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 font-bold text-slate-800">
                        <Crown className="w-3.5 h-3.5 text-amber-500" />
                        {req.planDays} күн ({req.planName})
                      </span>
                    </td>
                    <td className="py-3 px-4 font-black text-slate-900">
                      {req.amountKzt.toLocaleString('kk-KZ')} ₸
                    </td>
                    <td className="py-3 px-4">
                      {req.receiptUrl ? (
                        <button
                          onClick={() => setSelectedReceiptUrl(req.receiptUrl || '')}
                          className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-lg transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Чекті көру
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">Чек жоқ</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      {req.createdAt ? new Date(req.createdAt).toLocaleString('kk-KZ') : '-'}
                    </td>
                    <td className="py-3 px-4">
                      {req.status === 'PENDING' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                          <Clock className="w-3 h-3" />
                          Күтілуде
                        </span>
                      )}
                      {req.status === 'APPROVED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          Мақұлданған
                        </span>
                      )}
                      {req.status === 'REJECTED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800">
                          <XCircle className="w-3 h-3" />
                          Қабылданбаған
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {req.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleApprove(req.id, req.userName)}
                            disabled={isProcessing}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition disabled:opacity-50"
                          >
                            Мақұлдау ✅
                          </button>
                          <button
                            onClick={() => openRejectModal(req.id)}
                            disabled={isProcessing}
                            className="px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs transition disabled:opacity-50"
                          >
                            Бас тарту
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Өңделген</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Receipt Image Preview Modal */}
      {selectedReceiptUrl && (
        <Modal
          isOpen={Boolean(selectedReceiptUrl)}
          onClose={() => setSelectedReceiptUrl(null)}
          title="Kaspi Чек қарау"
          maxWidth="lg"
        >
          <div className="text-center p-2">
            <img
              src={selectedReceiptUrl}
              alt="Kaspi Receipt"
              className="max-h-[75vh] mx-auto rounded-xl object-contain shadow-lg border border-slate-200"
            />
            <div className="mt-4 flex justify-center">
              <a
                href={selectedReceiptUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                <ExternalLink className="w-4 h-4" />
                Түпнұсқаны жаңа терезеде ашу
              </a>
            </div>
          </div>
        </Modal>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && (
        <Modal
          isOpen={rejectModalOpen}
          onClose={() => setRejectModalOpen(false)}
          title="Төлемнен бас тарту"
          maxWidth="md"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Оқырманға түсінікті болу үшін бас тарту себебін көрсетіңіз. Бұл оның хабарламаларына барады:
            </p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full p-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Болдырмау
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition disabled:opacity-50"
              >
                Бас тартуды растау
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
