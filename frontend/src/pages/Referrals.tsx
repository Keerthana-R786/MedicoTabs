import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Filter, Calendar } from 'lucide-react';
import { referralsAPI } from '@/services/api';
import { Referral } from '@/types';
import LoadError from '@/components/ui/LoadError';

const Referrals: React.FC = () => {
  const navigate = useNavigate();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filtered, setFiltered] = useState<Referral[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => { loadReferrals(); }, []);

  useEffect(() => {
    setFiltered(filterStatus === 'all' ? referrals : referrals.filter(r => r.status === filterStatus));
  }, [filterStatus, referrals]);

  const loadReferrals = async () => {
    setLoadFailed(false);
    try {
      setReferrals(await referralsAPI.getAll());
    } catch {
      setLoadFailed(true);
    }
  };

  const handleRetry = async () => {
    setRetrying(true);
    await loadReferrals();
    setRetrying(false);
  };

  const statusColor = (s: string) => ({
    pending: 'bg-base-300 text-base-600',
    routed: 'bg-primary-100 text-primary-700',
    accepted: 'bg-success-100 text-success-700',
    denied: 'bg-danger-100 text-danger-700',
    rerouted: 'bg-warning-100 text-warning-700',
    completed: 'bg-success-100 text-success-700',
    archived: 'bg-base-300 text-base-600',
  }[s] || 'bg-base-300 text-base-600');

  const urgencyColor = (u: string) => ({
    Emergency: 'bg-danger-500 text-white',
    Urgent: 'bg-warning-500 text-white',
    Routine: 'bg-primary-500 text-white',
  }[u] || 'bg-base-500 text-white');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Referrals</h1>
          <p className="text-base-500 mt-1 text-sm">Manage specialist referrals and track workflow progress</p>
        </div>
        <button onClick={() => navigate('/referrals/new')}
          className="neu-btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Referral
        </button>
      </div>

      <div className="neu-card p-6">
        {/* Filter bar — inset */}
        <div className="neu-pressed rounded-xl p-2 flex items-center gap-2 mb-5 flex-wrap">
          <Filter className="w-4 h-4 text-base-400 mx-2" />
          {['all', 'pending', 'routed', 'accepted', 'denied', 'completed'].map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold capitalize transition-all duration-200 ${
                filterStatus === s
                  ? 'bg-primary-50 text-primary-700 border border-primary-100'
                  : 'text-base-500 hover:text-base-700'
              }`}>
              {s}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filtered.map((ref) => (
            <button key={ref.id} onClick={() => navigate(`/patients/${ref.patientId}`)}
              className="neu-btn w-full text-left px-5 py-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base-800 text-sm">{ref.referralNumber}</h3>
                    <p className="text-xs text-base-500">{ref.patientName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`neu-badge ${urgencyColor(ref.urgency)}`}>{ref.urgency}</span>
                  <span className={`neu-badge capitalize ${statusColor(ref.status)}`}>{ref.status}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div>
                  <p className="text-base-400 uppercase tracking-wider text-[10px]">Specialty</p>
                  <p className="font-semibold text-base-800">{ref.requestedSpecialty}</p>
                </div>
                <div>
                  <p className="text-base-400 uppercase tracking-wider text-[10px]">Primary Doctor</p>
                  <p className="font-semibold text-base-800">{ref.primaryDoctorName}</p>
                </div>
                <div>
                  <p className="text-base-400 uppercase tracking-wider text-[10px]">Specialist</p>
                  <p className="font-semibold text-base-800">{ref.specialistName || 'Pending'}</p>
                </div>
                <div>
                  <p className="text-base-400 uppercase tracking-wider text-[10px]">Created</p>
                  <p className="font-semibold text-base-800">{new Date(ref.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-base-300/50">
                <p className="text-xs text-base-600">
                  <span className="font-semibold text-base-500">Reason:</span> {ref.referralReason}
                </p>
              </div>

              {ref.appointmentDetails && (
                <div className="mt-2 flex items-center gap-3 text-[10px] text-base-500">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" aria-hidden />
                    {new Date(ref.appointmentDetails.date).toLocaleDateString()} at {ref.appointmentDetails.time}
                  </span>
                  {ref.attendanceStatus && (
                    <span className={`neu-badge ${
                      ref.attendanceStatus === 'attended' ? 'bg-success-100 text-success-700' :
                      ref.attendanceStatus === 'missed' ? 'bg-danger-100 text-danger-700' :
                      'bg-warning-100 text-warning-700'
                    }`}>{ref.attendanceStatus}</span>
                  )}
                </div>
              )}
            </button>
          ))}

          {loadFailed ? (
            <LoadError title="Couldn’t load referrals" onRetry={handleRetry} retrying={retrying} />
          ) : filtered.length === 0 && (
            <div className="neu-pressed rounded-2xl text-center py-14">
              <FileText className="w-14 h-14 text-base-300 mx-auto mb-3" />
              <p className="text-base-500">No referrals found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Referrals;
