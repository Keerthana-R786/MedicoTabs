import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, FileText, CheckCircle, Clock, AlertCircle,
  Inbox, ArrowRight, Stethoscope, MessageSquare,
} from 'lucide-react';
import { statsAPI, referralsAPI } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardStats, Referral } from '@/types';
import LoadError from '@/components/ui/LoadError';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pendingIncoming, setPendingIncoming] = useState<Referral[]>([]);
  const [recentReferrals, setRecentReferrals] = useState<Referral[]>([]);
  const [statsError, setStatsError] = useState(false);
  const [incomingError, setIncomingError] = useState(false);
  const [recentError, setRecentError] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const isSpecialist = user?.role === 'specialist_doctor';

  useEffect(() => {
    loadStats();
    if (isSpecialist && user) loadIncomingReferrals();
    if (!isSpecialist && user) loadRecentActivity();
  }, [user, isSpecialist]);

  const loadStats = async () => {
    setStatsError(false);
    try {
      const data = await statsAPI.getDashboard();
      setStats(data);
    } catch {
      setStatsError(true);
    }
  };

  const loadIncomingReferrals = async () => {
    if (!user) return;
    setIncomingError(false);
    try {
      const incoming = await referralsAPI.getAll(); // Backend will filter
      setPendingIncoming(incoming);
    } catch {
      setIncomingError(true);
    }
  };

  const loadRecentActivity = async () => {
    if (!user) return;
    setRecentError(false);
    try {
      const all = await referralsAPI.getAll();
      const sorted = [...all].sort(
        (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
      );
      setRecentReferrals(sorted.slice(0, 3));
    } catch {
      setRecentError(true);
    }
  };

  const activityLine = (r: Referral): string => {
    switch (r.status) {
      case 'accepted': return `Accepted by ${r.specialistName || 'specialist'}`;
      case 'denied': return 'Referral declined';
      case 'completed': return 'Referral completed';
      case 'archived': return 'Referral archived';
      case 'routed': return 'Routed to specialist';
      default: return 'Referral pending';
    }
  };

  const handleRetry = async () => {
    setRetrying(true);
    await Promise.all([
      loadStats(),
      isSpecialist && user ? loadIncomingReferrals() : Promise.resolve(),
      !isSpecialist && user ? loadRecentActivity() : Promise.resolve(),
    ]);
    setRetrying(false);
  };

  const urgencyBadge = (urgency: string) => {
    const c: Record<string, string> = {
      Emergency: 'bg-danger-500 text-white',
      Urgent: 'bg-warning-500 text-white',
      Routine: 'bg-primary-500 text-white',
    };
    return c[urgency] || 'bg-base-500 text-white';
  };

  // ── Specialist Dashboard ───────────────────────────────────────
  if (isSpecialist) {
    const urgentCount = pendingIncoming.filter(
      (r) => r.urgency === 'Urgent' || r.urgency === 'Emergency'
    ).length;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="page-title">
            Welcome back, Dr. {user?.lastName}
          </h1>
          <p className="text-base-500 mt-1 text-sm">
            {user?.specialization && `${user.specialization} • `}{user?.organization}
          </p>
        </div>

        {pendingIncoming.some((r) => r.urgency === 'Emergency') && (
          <div className="neu-card p-5 border-l-4 border-danger-500 flex items-center gap-4">
            <div className="w-12 h-12 bg-danger-500 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-danger-700">Emergency Referral — Immediate Attention</p>
              <p className="text-sm text-danger-600">Within the 30-minute SLA window.</p>
            </div>
            <button onClick={() => navigate('/incoming-referrals')}
              className="neu-btn-danger text-sm flex items-center gap-1.5 flex-shrink-0">
              Review Now <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {statsError && (
          <LoadError
            title="Couldn’t load your stats"
            description="The dashboard numbers below may be out of date."
            onRetry={handleRetry}
            retrying={retrying}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <button
            type="button"
            onClick={() => navigate('/incoming-referrals')}
            className="stat-card stat-card--interactive stat-card--amber"
          >
            <div className="stat-card__top">
              <div className="stat-card__icon">
                <Inbox className="w-[18px] h-[18px]" />
              </div>
              <ArrowRight className="w-4 h-4 text-base-400" />
            </div>
            <div className="stat-card__body">
              <p className="stat-card__value">{pendingIncoming.length}</p>
              <p className="stat-card__label">Pending Review</p>
            </div>
            <p className="stat-card__hint">{urgentCount} urgent / emergency</p>
          </button>

          <div className="stat-card stat-card--moss">
            <div className="stat-card__top">
              <div className="stat-card__icon">
                <CheckCircle className="w-[18px] h-[18px]" />
              </div>
              <span className="stat-card__meta">Live</span>
            </div>
            <div className="stat-card__body">
              <p className="stat-card__value">{stats?.activeReferrals || 0}</p>
              <p className="stat-card__label">Active Cases</p>
            </div>
          </div>

          <div className="stat-card stat-card--teal">
            <div className="stat-card__top">
              <div className="stat-card__icon">
                <FileText className="w-[18px] h-[18px]" />
              </div>
              <span className="stat-card__meta">Queue</span>
            </div>
            <div className="stat-card__body">
              <p className="stat-card__value">{stats?.pendingApprovals || 0}</p>
              <p className="stat-card__label">Pending Approvals</p>
            </div>
          </div>
        </div>

        <div className="neu-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-lg font-bold text-base-900">Incoming Referrals</h2>
            <button onClick={() => navigate('/incoming-referrals')}
              className="text-primary-500 hover:text-primary-600 text-sm font-semibold flex items-center gap-1 transition-colors">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {incomingError ? (
            <LoadError
              title="Couldn’t load incoming referrals"
              onRetry={loadIncomingReferrals}
            />
          ) : pendingIncoming.length === 0 ? (
            <div className="neu-pressed rounded-2xl text-center py-12">
              <Stethoscope className="w-12 h-12 text-base-300 mx-auto mb-3" />
              <p className="text-base-500 text-sm">No incoming referrals right now</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingIncoming.map((ref) => (
                <button key={ref.id} onClick={() => navigate('/incoming-referrals')}
                  className="neu-btn w-full flex items-center justify-between px-5 py-4 text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-base-800">{ref.referralNumber}</p>
                        <span className={`neu-badge ${urgencyBadge(ref.urgency)}`}>{ref.urgency}</span>
                      </div>
                      <p className="text-xs text-base-500 mt-0.5">
                        {ref.patientName} • {ref.primaryDoctorName}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-base-400">
                      {new Date(ref.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-[10px] text-base-400">{ref.requestedSpecialty}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="neu-card p-6">
          <h2 className="font-display text-lg font-bold text-base-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Inbox, label: 'Review Referrals', action: () => navigate('/incoming-referrals') },
              { icon: MessageSquare, label: 'Messages', action: () => navigate('/messages') },
              { icon: Users, label: 'Patient Records', action: () => navigate('/patients') },
              { icon: CheckCircle, label: 'Approvals', action: () => navigate('/approvals') },
            ].map((item) => (
              <button key={item.label} onClick={item.action} className="neu-btn flex flex-col items-center gap-2 py-5">
                <item.icon className="w-7 h-7 text-primary-500" />
                <p className="text-xs font-semibold text-base-700">{item.label}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Primary Doctor Dashboard ──────────────────────────────────
  const statCards = [
    { label: 'Total Patients', value: stats?.totalPatients || 0, icon: Users, tone: 'teal', meta: 'Census' },
    { label: 'Active Referrals', value: stats?.activeReferrals || 0, icon: FileText, tone: 'moss', meta: 'Open' },
    { label: 'Pending Approvals', value: stats?.pendingApprovals || 0, icon: CheckCircle, tone: 'amber', meta: 'HITL' },
    { label: 'Completed Today', value: stats?.completedToday || 0, icon: Clock, tone: 'deep', meta: 'Today' },
    { label: 'Urgent Cases', value: stats?.urgentCases || 0, icon: AlertCircle, tone: 'rose', meta: 'Priority' },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="text-base-500 mt-1 text-sm">Overview of your medical practice</p>
      </div>

      {statsError && (
        <LoadError
          title="Couldn’t load your stats"
          description="The dashboard numbers below may be out of date."
          onRetry={handleRetry}
          retrying={retrying}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`stat-card stat-card--${stat.tone}`}>
              <div className="stat-card__top">
                <div className="stat-card__icon">
                  <Icon className="w-[18px] h-[18px]" />
                </div>
                <span className="stat-card__meta">{stat.meta}</span>
              </div>
              <div className="stat-card__body">
                <p className="stat-card__value">{stat.value}</p>
                <p className="stat-card__label">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="neu-card p-6">
          <h2 className="font-display text-lg font-bold text-base-900 mb-4">Recent Activity</h2>
          {recentError ? (
            <LoadError title="Couldn’t load recent activity" onRetry={loadRecentActivity} />
          ) : recentReferrals.length === 0 ? (
            <div className="neu-pressed rounded-2xl text-center py-10">
              <p className="text-base-500 text-sm">No referral activity yet</p>
            </div>
          ) : (
            <div className="neu-pressed rounded-2xl p-4 space-y-3">
              {recentReferrals.map((r) => (
                <div key={r.id} className="flex items-start gap-3">
                  <div className={`w-2 h-2 ${
                    r.status === 'denied' ? 'bg-danger-500' :
                    r.status === 'accepted' || r.status === 'completed' ? 'bg-success-500' :
                    'bg-primary-500'
                  } rounded-full mt-2 flex-shrink-0`} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-base-800">{activityLine(r)}</p>
                    <p className="text-xs text-base-500 mt-0.5">{r.patientName} — {r.requestedSpecialty}</p>
                    <p className="text-[10px] text-base-400 mt-0.5">
                      {new Date(r.updatedAt || r.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="neu-card p-6">
          <h2 className="font-display text-lg font-bold text-base-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Users, label: 'New Patient', action: () => navigate('/patients/new') },
              { icon: FileText, label: 'Create Referral', action: () => navigate('/referrals/new') },
              { icon: CheckCircle, label: 'Pending Approvals', action: () => navigate('/approvals') },
              { icon: Clock, label: 'View Referrals', action: () => navigate('/referrals') },
            ].map((item) => (
              <button key={item.label} onClick={item.action} className="neu-btn flex flex-col items-center gap-2 py-5">
                <item.icon className="w-7 h-7 text-primary-500" />
                <p className="text-xs font-semibold text-base-700">{item.label}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
