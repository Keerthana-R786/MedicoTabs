import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Clock, AlertTriangle, CheckCircle, XCircle,
  ChevronDown, ChevronUp, User, Building2, Stethoscope,
  Calendar, MessageSquare,
} from 'lucide-react';
import { mockReferralsAPI } from '@/services/mockAPI';
import { useAuth } from '@/contexts/AuthContext';
import { Referral } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { formatError, formatSuccess } from '@/utils/messages';

const IncomingReferrals: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [activeTab, setActiveTab] = useState<'pending' | 'accepted' | 'completed'>('pending');
  const [pendingReferrals, setPendingReferrals] = useState<Referral[]>([]);
  const [acceptedReferrals, setAcceptedReferrals] = useState<Referral[]>([]);
  const [completedReferrals, setCompletedReferrals] = useState<Referral[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => { if (user) loadReferrals(); }, [user]);

  const loadReferrals = async () => {
    if (!user) return;
    setPendingReferrals(await mockReferralsAPI.getIncomingForSpecialist(user.id));
    setAcceptedReferrals(await mockReferralsAPI.getAcceptedForSpecialist(user.id));
    setCompletedReferrals(await mockReferralsAPI.getCompletedForSpecialist(user.id));
  };

  const handleAccept = async (id: string) => {
    setActionLoading(id);
    try {
      await mockReferralsAPI.acceptReferral(id);
      await loadReferrals();
      const msg = formatSuccess('referral-accepted');
      success(msg.title, msg.description);
    } catch (err: any) {
      const msg = formatError(err.message);
      showError(msg.title, msg.description);
    }
    finally { setActionLoading(null); }
  };

  const handleDeny = async (id: string) => {
    const reason = prompt('Reason for declining:');
    if (reason === null) return;
    setActionLoading(id);
    try {
      await mockReferralsAPI.denyReferral(id, reason);
      await loadReferrals();
      const msg = formatSuccess('referral-declined');
      success(msg.title, msg.description);
    } catch (err: any) {
      const msg = formatError(err.message);
      showError(msg.title, msg.description);
    }
    finally { setActionLoading(null); }
  };

  const urgencyConfig = (urgency: string) => ({
    Emergency: { border: 'border-danger-400', badge: 'bg-danger-500 text-white', icon: <AlertTriangle className="w-4 h-4" />, sla: '30 min window', pulse: true },
    Urgent: { border: 'border-warning-400', badge: 'bg-warning-500 text-white', icon: <Clock className="w-4 h-4" />, sla: '4 hour window', pulse: false },
    Routine: { border: 'border-primary-300', badge: 'bg-primary-500 text-white', icon: <Clock className="w-4 h-4" />, sla: '24 hour window', pulse: false },
  }[urgency] || { border: 'border-base-300', badge: 'bg-base-500 text-white', icon: <Clock className="w-4 h-4" />, sla: '', pulse: false });

  const timeRemaining = (deadline: string) => {
    const diff = new Date(deadline).getTime() - Date.now();
    if (diff <= 0) return { text: 'SLA breached', urgent: true };
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return h > 0
      ? { text: `${h}h ${m}m left`, urgent: h < 1 }
      : { text: `${m}m left`, urgent: true };
  };

  const tabs = [
    { key: 'pending' as const, label: 'Pending Review', count: pendingReferrals.length },
    { key: 'accepted' as const, label: 'Accepted', count: acceptedReferrals.length },
    { key: 'completed' as const, label: 'Completed', count: completedReferrals.length },
  ];

  const current = activeTab === 'pending' ? pendingReferrals : activeTab === 'accepted' ? acceptedReferrals : completedReferrals;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-base-800 tracking-tight">Incoming Referrals</h1>
        <p className="text-base-500 mt-1 text-sm">Review and manage referrals routed to you</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { count: pendingReferrals.length, label: 'Pending Review', accent: 'bg-warning-500' },
          { count: acceptedReferrals.length, label: 'Accepted', accent: 'bg-success-500' },
          { count: completedReferrals.length, label: 'Completed', accent: 'bg-base-500' },
        ].map((s) => (
          <div key={s.label} className="neu-card p-4 flex items-center gap-3">
            <div className={`w-10 h-10 ${s.accent} rounded-xl flex items-center justify-center  `}>
              <span className="text-white font-bold text-sm">{s.count}</span>
            </div>
            <p className="text-sm font-semibold text-base-700">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs + Content */}
      <div className="neu-card overflow-hidden">
        <div className="p-2 mx-6 mt-4 neu-pressed rounded-xl flex gap-1">
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                activeTab === tab.key
                  ? 'bg-primary-50 text-primary-700 border border-primary-100'
                  : 'text-base-500 hover:text-base-700'
              }`}>
              {tab.label}
              <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                activeTab === tab.key ? 'bg-primary-100 text-primary-700' : 'bg-base-300 text-base-500'
              }`}>{tab.count}</span>
            </button>
          ))}
        </div>

        <div className="p-6">
          {current.length === 0 ? (
            <div className="neu-pressed rounded-2xl text-center py-16">
              <FileText className="w-14 h-14 text-base-300 mx-auto mb-3" />
              <p className="text-base-500">
                {activeTab === 'pending' ? 'No pending referrals to review' :
                 activeTab === 'accepted' ? 'No accepted referrals' : 'No completed referrals'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {current.map((ref) => {
                const uc = urgencyConfig(ref.urgency);
                const sla = ref.status === 'routed' && ref.acknowledgmentDeadline
                  ? timeRemaining(ref.acknowledgmentDeadline) : null;

                return (
                  <div key={ref.id}
                    className={`rounded-2xl overflow-hidden transition-all ${
                      ref.status === 'routed'
                        ? `border-2 ${uc.border} bg-base-200 ${uc.pulse ? 'animate-pulse' : ''}`
                        : 'border border-base-300 bg-base-200'
                    }`}
                    className={ref.status === 'routed' ? 'ring-2 ring-primary-200' : ''}>

                    {/* Main row */}
                    <div className="p-5 cursor-pointer" onClick={() => setExpandedId(expandedId === ref.id ? null : ref.id)}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="w-11 h-11 bg-base-200 rounded-xl flex items-center justify-center   flex-shrink-0">
                            <FileText className="w-5 h-5 text-primary-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-base-800">{ref.referralNumber}</h3>
                              <span className={`neu-badge ${uc.badge}`}>{ref.urgency}</span>
                              {sla && (
                                <span className={`neu-badge ${sla.urgent ? 'bg-danger-100 text-danger-700 animate-pulse' : 'bg-base-300 text-base-600'}`}>
                                  ⏱ {sla.text}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-base-600">
                              <span className="font-semibold">Patient:</span> {ref.patientName} &nbsp;•&nbsp;
                              <span className="font-semibold">From:</span> {ref.primaryDoctorName} ({ref.primaryOrganization})
                            </p>
                            <p className="text-xs text-base-500 mt-0.5 line-clamp-1">
                              <span className="font-semibold">Reason:</span> {ref.referralReason}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          {ref.status === 'routed' && (
                            <div className="flex gap-2">
                              <button onClick={(e) => { e.stopPropagation(); handleAccept(ref.id); }}
                                disabled={actionLoading === ref.id}
                                className="neu-btn-success flex items-center gap-1.5 py-2 px-4 text-xs disabled:opacity-50">
                                <CheckCircle className="w-3.5 h-3.5" />
                                {actionLoading === ref.id ? '...' : 'Accept'}
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleDeny(ref.id); }}
                                disabled={actionLoading === ref.id}
                                className="neu-btn-danger flex items-center gap-1.5 py-2 px-4 text-xs disabled:opacity-50">
                                <XCircle className="w-3.5 h-3.5" /> Decline
                              </button>
                            </div>
                          )}
                          {ref.status === 'accepted' && (
                            <span className="neu-badge bg-success-100 text-success-700 flex items-center gap-1 py-1.5 px-3">
                              <CheckCircle className="w-3 h-3" /> Accepted
                            </span>
                          )}
                          {expandedId === ref.id
                            ? <ChevronUp className="w-4 h-4 text-base-400" />
                            : <ChevronDown className="w-4 h-4 text-base-400" />}
                        </div>
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {expandedId === ref.id && (
                      <div className="px-5 pb-5 border-t border-base-300/50">
                        <div className="pt-4 grid grid-cols-2 lg:grid-cols-3 gap-3">
                          {[
                            { icon: Stethoscope, label: 'Specialty', val: ref.requestedSpecialty },
                            { icon: User, label: 'Patient', val: ref.patientName },
                            { icon: Building2, label: 'Referring Doctor', val: ref.primaryDoctorName },
                            ...(ref.serviceType ? [{ icon: FileText, label: 'Service Type', val: ref.serviceType }] : []),
                            { icon: Calendar, label: 'Created', val: new Date(ref.createdAt).toLocaleString() },
                            ...(ref.acknowledgmentDeadline ? [{
                              icon: Clock, label: 'Deadline',
                              val: new Date(ref.acknowledgmentDeadline).toLocaleString(),
                              sub: uc.sla,
                            }] : []),
                          ].map((item) => (
                            <div key={item.label} className="flex items-start gap-2">
                              <item.icon className="w-3.5 h-3.5 text-base-400 mt-0.5" />
                              <div>
                                <p className="text-[10px] text-base-400 uppercase tracking-wider">{item.label}</p>
                                <p className="text-xs font-semibold text-base-800">{item.val}</p>
                                {'sub' in item && item.sub && <p className="text-[10px] text-base-500">{item.sub}</p>}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="mt-4 neu-pressed rounded-xl p-4">
                          <p className="text-[10px] text-base-400 uppercase tracking-wider mb-1">Referral Reason</p>
                          <p className="text-xs text-base-700">{ref.referralReason}</p>
                        </div>

                        {ref.status === 'accepted' && (
                          <div className="mt-4 flex gap-3">
                            <button onClick={() => navigate(`/patients/${ref.patientId}`)}
                              className="neu-btn flex items-center gap-2 text-xs">
                              <User className="w-3.5 h-3.5" /> Patient Record
                            </button>
                            <button onClick={() => navigate('/messages')}
                              className="neu-btn flex items-center gap-2 text-xs">
                              <MessageSquare className="w-3.5 h-3.5" /> Message
                            </button>
                          </div>
                        )}

                        {ref.workflowRunId && (
                          <p className="mt-3 text-[10px] text-base-400">Workflow: {ref.workflowRunId}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IncomingReferrals;
