import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Filter } from 'lucide-react';
import { mockReferralsAPI } from '@/services/mockAPI';
import { Referral } from '@/types';

const Referrals: React.FC = () => {
  const navigate = useNavigate();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filteredReferrals, setFilteredReferrals] = useState<Referral[]>([]);

  useEffect(() => {
    loadReferrals();
  }, []);

  useEffect(() => {
    if (filterStatus === 'all') {
      setFilteredReferrals(referrals);
    } else {
      setFilteredReferrals(referrals.filter(r => r.status === filterStatus));
    }
  }, [filterStatus, referrals]);

  const loadReferrals = async () => {
    const data = await mockReferralsAPI.getAll();
    setReferrals(data);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-gray-100 text-gray-700',
      routed: 'bg-primary-100 text-primary-700',
      accepted: 'bg-success-100 text-success-700',
      denied: 'bg-danger-100 text-danger-700',
      rerouted: 'bg-warning-100 text-warning-700',
      completed: 'bg-success-100 text-success-700',
      archived: 'bg-gray-100 text-gray-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getUrgencyColor = (urgency: string) => {
    const colors: Record<string, string> = {
      Emergency: 'bg-danger-500 text-white',
      Urgent: 'bg-warning-500 text-white',
      Routine: 'bg-primary-500 text-white',
    };
    return colors[urgency] || 'bg-gray-500 text-white';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Referrals</h1>
          <p className="text-gray-600 mt-1">Manage specialist referrals and track workflow progress</p>
        </div>
        <button
          onClick={() => navigate('/referrals/new')}
          className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Referral
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-4 mb-6">
          <Filter className="w-5 h-5 text-gray-500" />
          <div className="flex gap-2 flex-wrap">
            {['all', 'pending', 'routed', 'accepted', 'denied', 'completed'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                  filterStatus === status
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filteredReferrals.map((referral) => (
            <div
              key={referral.id}
              onClick={() => navigate(`/patients/${referral.patientId}`)}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-primary-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{referral.referralNumber}</h3>
                    <p className="text-sm text-gray-600">{referral.patientName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getUrgencyColor(referral.urgency)}`}>
                    {referral.urgency}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${getStatusColor(referral.status)}`}>
                    {referral.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 text-xs">Specialty</p>
                  <p className="font-medium text-gray-900">{referral.requestedSpecialty}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Primary Doctor</p>
                  <p className="font-medium text-gray-900">{referral.primaryDoctorName}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Specialist</p>
                  <p className="font-medium text-gray-900">{referral.specialistName || 'Pending'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Created</p>
                  <p className="font-medium text-gray-900">
                    {new Date(referral.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Reason:</span> {referral.referralReason}
                </p>
              </div>

              {referral.workflowRunId && (
                <div className="mt-2">
                  <span className="text-xs text-gray-500">
                    Workflow: {referral.workflowRunId}
                  </span>
                </div>
              )}

              {referral.appointmentDetails && (
                <div className="mt-2 flex items-center gap-4 text-xs text-gray-600">
                  <span>📅 Appointment: {new Date(referral.appointmentDetails.date).toLocaleDateString()} at {referral.appointmentDetails.time}</span>
                  {referral.attendanceStatus && (
                    <span className={`px-2 py-1 rounded ${
                      referral.attendanceStatus === 'attended' ? 'bg-success-100 text-success-700' :
                      referral.attendanceStatus === 'missed' ? 'bg-danger-100 text-danger-700' :
                      'bg-warning-100 text-warning-700'
                    }`}>
                      {referral.attendanceStatus}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}

          {filteredReferrals.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No referrals found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Referrals;
