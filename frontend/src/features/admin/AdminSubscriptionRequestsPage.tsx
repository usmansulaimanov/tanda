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
  AlertCircle,
  AlertTriangle,
  FileX,
  Ban,
  HelpCircle,
  Send,
  MessageSquare
} from 'lucide-react';
import { premiumApi } from '../../shared/api/premium.api';
import { SubscriptionPaymentRequest } from '../../types';
import { useToastStore } from '../../store/useToastStore';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from '../../components/ui/Modal';

interface RejectionTemplate {
  id: string;
  title: string;
  description: string;
  reasonText: string;
  isWarning: boolean;
}

const REJECTION_TEMPLATES: RejectionTemplate[] = [
  {
    id: 'fake_receipt',
    title: 'Өтірік / жалған чек',
    description: 'Жіберілген түбіртек өңделген, фотошоп немесе бөгде төлем',
    reasonText: 'Жіберілген чек жарамсыз немесе жалған түбіртек деп танылды.',
    isWarning: false,
  },
  {
    id: 'no_payment',
    title: 'Төлем сомасы түспеген',
    description: 'Kaspi шотында көрсетілген сомадағы аударым табылмады',
    reasonText: 'Kaspi шотында көрсетілген сомадағы төлем табылмады.',
    isWarning: false,
  },
  {
    id: 'mismatched_data',
    title: 'Чек деректері сәйкес келмейді',
    description: 'Төлем күні, уақыты, сомасы немесе деректері сәйкес емес',
    reasonText: 'Төлем чегіндегі уақыт, сома немесе деректер сәйкес келмейді.',
    isWarning: false,
  },
  {
    id: 'final_warning',
    title: 'Соңғы ескерту (Блокқа кету қаупі)',
    description: 'Жалған чектер қайталанса, аккаунт автоматты түрде бұғатталады',
    reasonText: 'Соңғы ескерту: Тағы да жалған өтініш немесе жарамсыз чек жіберетін болсаңыз, аккаунтыңыз біржола бұғатталады!',
    isWarning: true,
  },
  {
    id: 'other',
    title: 'Басқа себеп',
    description: 'Төмендегі ескертпеге өз себебіңізді толық жазыңыз',
    reasonText: '',
    isWarning: false,
  },
];

export const AdminSubscriptionRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<SubscriptionPaymentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);

  // Reject modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingRequest, setRejectingRequest] = useState<SubscriptionPaymentRequest | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('fake_receipt');
  const [customNotes, setCustomNotes] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Revoke modal state
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [revokingRequest, setRevokingRequest] = useState<SubscriptionPaymentRequest | null>(null);
  const [revokeReason, setRevokeReason] = useState<string>('Чек жарамсыз немесе жалған деп танылды');

  const { showToast } = useToastStore();
  const queryClient = useQueryClient();


  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const data = await premiumApi.getAllSubscriptionRequestsAdmin(
        statusFilter === 'ALL' ? undefined : statusFilter
      );
      setRequests(data);
      queryClient.invalidateQueries({ queryKey: ['adminPendingSubscriptionRequests'] });
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
      showToast('Төлем сәтті мақұлданды! Оқырманға Премиум қосылды', 'success');
      queryClient.invalidateQueries({ queryKey: ['adminPendingSubscriptionRequests'] });
      loadRequests();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Мақұлдау кезінде қате орын алды', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const openRejectModal = (req: SubscriptionPaymentRequest) => {
    setRejectingRequest(req);
    setSelectedTemplateId('fake_receipt');
    setCustomNotes('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectingRequest) return;

    const template = REJECTION_TEMPLATES.find((t) => t.id === selectedTemplateId);
    let finalReason = template?.reasonText || '';

    if (customNotes.trim()) {
      if (finalReason) {
        finalReason = `${finalReason}\n\nҚосымша ескертпе: ${customNotes.trim()}`;
      } else {
        finalReason = customNotes.trim();
      }
    }

    if (!finalReason.trim()) {
      showToast('Бас тарту себебін таңдаңыз немесе ескертпе жазыңыз', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      await premiumApi.rejectSubscriptionRequestAdmin(rejectingRequest.id, finalReason);
      showToast('Төлемнен бас тартылды және оқырманға хабарлама жіберілді', 'info');
      setRejectModalOpen(false);
      setRejectingRequest(null);
      queryClient.invalidateQueries({ queryKey: ['adminPendingSubscriptionRequests'] });
      loadRequests();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Қате орын алды', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const openRevokeModal = (req: SubscriptionPaymentRequest) => {
    setRevokingRequest(req);
    setRevokeReason('Чек жарамсыз немесе жалған деп танылды');
    setRevokeModalOpen(true);
  };

  const handleConfirmRevoke = async () => {
    if (!revokingRequest) return;
    setIsProcessing(true);
    try {
      await premiumApi.revokeSubscriptionRequestAdmin(revokingRequest.id, revokeReason);
      showToast('Премиум жазылым тоқтатылды және жарамсыз етілді', 'success');
      setRevokeModalOpen(false);
      setRevokingRequest(null);
      queryClient.invalidateQueries({ queryKey: ['adminPendingSubscriptionRequests'] });
      loadRequests();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Қайтарып алу кезінде қате орын алды', 'error');
    } finally {
      setIsProcessing(false);
    }
  };


  const formatPlanName = (planName?: string, planDays?: number) => {
    if (planName === '1_MONTH' || planDays === 30) return '1 ай';
    if (planName === '3_MONTHS' || planDays === 90) return '3 ай';
    if (planName === '1_YEAR' || planDays === 365) return '1 жыл';
    if (planDays) return `${planDays} күн`;
    return planName || '1 ай';
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
  const approvedCount = requests.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = requests.filter((r) => r.status === 'REJECTED' || r.status === 'REVOKED').length;
  const duplicateCount = requests.filter((r) => r.aiStatus === 'DUPLICATE').length;
  const totalRevenue = requests
    .filter((r) => r.status === 'APPROVED')
    .reduce((sum, r) => sum + (r.amountKzt || 0), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900">Премиум төлемдері және AI Тексеру</h1>
            {pendingCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white animate-pulse">
                +{pendingCount} күтілуде
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            OpenAI Vision арқылы банк чектер автоматты тексеріледі және шын төлемдерге бірден Премиум беріледі
          </p>
        </div>

        <button
          onClick={loadRequests}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold transition"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Жаңарту
        </button>
      </div>

      {/* 4 Stat Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Барлық өтініштер</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{requests.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Мақұлданған (Шын)</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-emerald-950">{approvedCount}</span>
              <span className="text-xs font-bold text-emerald-600">({totalRevenue.toLocaleString('kk-KZ')} ₸)</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-rose-700 uppercase tracking-wider">Өтірік / Бас тартылған</p>
            <p className="text-2xl font-black text-rose-950 mt-1">{rejectedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <XCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-purple-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-purple-700 uppercase tracking-wider">Қайталанған (Дубликат)</p>
            <p className="text-2xl font-black text-purple-950 mt-1">{duplicateCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
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
            { label: 'Барлығы', val: 'ALL', count: requests.length },
            { label: 'Мақұлданған', val: 'APPROVED', count: approvedCount },
            { label: 'Бас тартылған', val: 'REJECTED', count: rejectedCount },
            { label: 'Күтілуде', val: 'PENDING', count: pendingCount },
          ].map((tab) => (
            <button
              key={tab.val}
              onClick={() => setStatusFilter(tab.val)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                statusFilter === tab.val
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === tab.val ? 'bg-slate-100 text-slate-800' : 'text-slate-400'}`}>
                {tab.count}
              </span>
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
                      {req.phoneOrAccount && req.phoneOrAccount.trim() && req.phoneOrAccount.trim() !== req.userEmail && (
                        <div className="text-xs text-slate-600 font-medium mt-0.5">
                          {req.phoneOrAccount}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-800">
                        {formatPlanName(req.planName, req.planDays)}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-black text-slate-900">
                      {req.amountKzt.toLocaleString('kk-KZ')} ₸
                    </td>
                    <td className="py-3 px-4">
                      {req.receiptUrl ? (
                        <div>
                          <button
                            onClick={() => setSelectedReceiptUrl(req.receiptUrl || '')}
                            className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-lg transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Чекті көру
                          </button>
                          {req.receiptNumber && (
                            <div className="text-[10px] text-slate-500 font-mono mt-1">
                              № {req.receiptNumber}
                            </div>
                          )}
                        </div>
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
                        <div>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            Мақұлданған
                          </span>
                          {req.reviewedBy === 'AI_AUTO' && (
                            <span className="block text-[10px] font-bold text-emerald-600 mt-0.5">
                              🤖 AI Авто-мақұлдаған
                            </span>
                          )}
                        </div>
                      )}
                      {req.status === 'REJECTED' && (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                            <XCircle className="w-3 h-3" />
                            Бас тартылған
                          </span>
                          {req.aiStatus === 'DUPLICATE' && (
                            <span className="block text-[10px] font-black text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded mt-0.5">
                              ⚠️ Дубликат чек
                            </span>
                          )}
                          {req.rejectionReason && (
                            <p className="text-[11px] text-rose-700 font-medium mt-1 max-w-xs leading-tight">
                              {req.rejectionReason}
                            </p>
                          )}
                        </div>
                      )}
                      {req.status === 'REVOKED' && (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-900 border border-rose-300">
                            <Ban className="w-3 h-3" />
                            Тоқтатылған (Жарамсыз)
                          </span>
                          {req.rejectionReason && (
                            <p className="text-[11px] text-rose-700 font-medium mt-1 max-w-xs leading-tight">
                              {req.rejectionReason}
                            </p>
                          )}
                        </div>
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
                            Мақұлдау
                          </button>
                          <button
                            onClick={() => openRejectModal(req)}
                            disabled={isProcessing}
                            className="px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs transition disabled:opacity-50"
                          >
                            Бас тарту
                          </button>
                        </div>
                      ) : req.status === 'APPROVED' ? (
                        <button
                          onClick={() => openRevokeModal(req)}
                          disabled={isProcessing}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition border border-rose-200 shadow-sm"
                        >
                          Премиумды тоқтату
                        </button>
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
            {selectedReceiptUrl.toLowerCase().endsWith('.pdf') || selectedReceiptUrl.toLowerCase().includes('.pdf') ? (
              <iframe
                src={selectedReceiptUrl}
                title="Kaspi Receipt PDF"
                className="w-full h-[75vh] rounded-xl border border-slate-200 shadow-lg"
              />
            ) : (
              <img
                src={selectedReceiptUrl}
                alt="Kaspi Receipt"
                className="max-h-[75vh] mx-auto rounded-xl object-contain shadow-lg border border-slate-200"
              />
            )}
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
      {rejectModalOpen && rejectingRequest && (
        <Modal
          isOpen={rejectModalOpen}
          onClose={() => {
            if (!isProcessing) {
              setRejectModalOpen(false);
              setRejectingRequest(null);
            }
          }}
          title="Төлемнен бас тарту"
          maxWidth="lg"
        >
          <div className="space-y-4 text-left">
            {/* Target Reader Card */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-slate-400 font-medium block">Оқырман:</span>
                <span className="font-black text-slate-900 text-sm">
                  {rejectingRequest.userName || 'Аты көрсетілмеген'}
                </span>
                <span className="text-slate-500 block text-[11px]">{rejectingRequest.userEmail}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 font-medium block">Тариф және сома:</span>
                <span className="font-bold text-slate-900">
                  {formatPlanName(rejectingRequest.planName, rejectingRequest.planDays)}
                </span>
                <span className="font-black text-emerald-600 block text-[13px]">
                  {rejectingRequest.amountKzt.toLocaleString('kk-KZ')} ₸
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Бас тарту себебін таңдаңыз (оқырманға хабарлама болып барады):
              </label>

              <div className="space-y-2">
                {REJECTION_TEMPLATES.map((tmpl) => {
                  const isSelected = selectedTemplateId === tmpl.id;
                  return (
                    <div
                      key={tmpl.id}
                      onClick={() => setSelectedTemplateId(tmpl.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                        isSelected
                          ? tmpl.isWarning
                            ? 'border-red-500 bg-red-50/60 shadow-sm ring-1 ring-red-500'
                            : 'border-[#EF7E00] bg-orange-50/50 shadow-sm ring-1 ring-[#EF7E00]'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        id={`template-${tmpl.id}`}
                        name="rejectionTemplate"
                        checked={isSelected}
                        onChange={() => setSelectedTemplateId(tmpl.id)}
                        className="mt-1 h-4 w-4 text-[#EF7E00] focus:ring-[#EF7E00] border-slate-300 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-black ${tmpl.isWarning ? 'text-red-700' : 'text-slate-900'}`}>
                            {tmpl.title}
                          </span>
                          {tmpl.isWarning && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-700 border border-red-200 flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              Қатаң ескерту
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                          {tmpl.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Additional Custom Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Қосымша ескертпе / Заметка (қаласаңыз жазыңыз):
              </label>
              <textarea
                rows={3}
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="Мысалы: Төлемді қайта тексеріп, нақты Kaspi түбіртегін қайта жүктеңіз..."
                className="w-full p-3 text-xs rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#EF7E00]/20 focus:border-[#EF7E00] bg-white"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Ескертпе жазылмаса, оқырманға тек таңдалған негізгі себеп бойынша хат барады.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setRejectModalOpen(false);
                  setRejectingRequest(null);
                }}
                disabled={isProcessing}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Болдырмау
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isProcessing}
                className="px-5 py-2.5 rounded-xl text-xs font-black bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20 transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {isProcessing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Жіберілуде...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Бас тарту және хат жіберу
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Revoke Approved Subscription Modal */}
      {revokeModalOpen && revokingRequest && (
        <Modal
          isOpen={revokeModalOpen}
          onClose={() => {
            setRevokeModalOpen(false);
            setRevokingRequest(null);
          }}
          title="Премиум жазылымды тоқтату (Жарамсыз ету)"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <p className="font-bold text-rose-900 mb-0.5">
                  Назар аударыңыз!
                </p>
                <p className="text-rose-800">
                  Бұл әрекет <strong>{revokingRequest.userName || revokingRequest.userEmail}</strong> пайдаланушысының барлық белсенді Премиум жазылымдарын бірден тоқтатады және мәртебесін жарамсыз етеді.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Тоқтату себебі (оқырманға хабарлама барады): <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="Мысалы: Төлем чегі қайта тексеріліп, жарамсыз/жалған деп танылды..."
                className="w-full p-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setRevokeModalOpen(false);
                  setRevokingRequest(null);
                }}
                disabled={isProcessing}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Болдырмау
              </button>
              <button
                type="button"
                onClick={handleConfirmRevoke}
                disabled={isProcessing || !revokeReason.trim()}
                className="px-5 py-2.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {isProcessing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Өңделуде...
                  </>
                ) : (
                  <>
                    <Ban className="w-3.5 h-3.5" />
                    Премиумды тоқтату
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

