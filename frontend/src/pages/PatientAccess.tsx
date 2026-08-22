import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { HeartPulse } from 'lucide-react';
import { usePatientAuth } from '@/contexts/PatientAuthContext';
import InlineAlert from '@/components/ui/InlineAlert';
import HeroBackdrop from '@/components/HeroBackdrop';
import { formatError } from '@/utils/messages';

const PatientAccess: React.FC = () => {
  const [referralId, setReferralId] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [error, setError] = useState<{ title: string; description: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = usePatientAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(referralId.trim(), dateOfBirth);
      navigate('/patient-portal');
    } catch (err: any) {
      const serverMessage = err.response?.data?.error;
      setError(formatError(serverMessage || err.message || 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-hero">
      <HeroBackdrop variant="auth" />
      <div className="auth-hero__content flex justify-center">
        <div className="neu-card w-full max-w-md p-10">
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5 bg-primary-800">
              <HeartPulse className="w-11 h-11 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-base-800 tracking-tight">Patient Access</h1>
            <p className="text-base-500 mt-1.5 text-sm font-medium text-center">
              View your records, referral status, and care summary
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <InlineAlert
                tone="error"
                title={error.title}
                description={error.description}
                onDismiss={() => setError(null)}
              />
            )}

            <div>
              <label className="block text-xs font-semibold text-base-600 mb-2 uppercase tracking-wider">
                Referral ID
              </label>
              <input
                type="text"
                value={referralId}
                onChange={(e) => setReferralId(e.target.value)}
                className="neu-input w-full"
                placeholder="RFL-2026-00000"
                required
              />
              <p className="text-[11px] text-base-400 mt-1.5">
                Found on your referral paperwork or care team communication
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-base-600 mb-2 uppercase tracking-wider">
                Date of Birth
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="neu-input w-full"
                required
              />
            </div>

            <button type="submit" disabled={loading} className="neu-btn-primary w-full mt-2">
              {loading ? 'Verifying...' : 'View My Records'}
            </button>
          </form>

          <p className="text-center text-xs text-base-500 mt-7">
            Are you a clinician?{' '}
            <Link to="/login" className="text-primary-500 hover:text-primary-600 font-semibold transition-colors">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PatientAccess;
