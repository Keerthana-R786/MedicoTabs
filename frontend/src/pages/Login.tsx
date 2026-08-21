import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Stethoscope, Eye, EyeOff, X, ChevronRight } from 'lucide-react';
import InlineAlert from '@/components/ui/InlineAlert';
import HeroBackdrop from '@/components/HeroBackdrop';
import { formatError } from '@/utils/messages';

const DEMO_ACCOUNTS = [
  { email: 'dr.smith@northharbor.com', name: 'Dr. John Smith', role: 'Primary Care Doctor' },
  { email: 'dr.shah@lakeside.com', name: 'Dr. Priya Shah', role: 'Specialist — Gastroenterology' },
  { email: 'coordinator@harborcare.com', name: 'Sarah Johnson', role: 'Care Coordinator' },
];

const Login: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<{ title: string; description: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!showDemoModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowDemoModal(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showDemoModal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(formatError(err.message || 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string) => {
    setError(null);
    setLoading(true);
    setShowDemoModal(false);
    try {
      await login(demoEmail, 'demo');
      navigate('/dashboard');
    } catch (err: any) {
      setError(formatError(err.message || 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-hero">
      <HeroBackdrop variant="auth" />
      <div className="auth-hero__content flex justify-center">
      <div className="neu-card w-full max-w-md p-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5 bg-primary-800">
            <Stethoscope className="w-11 h-11 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-base-800 tracking-tight">MedicoTabs</h1>
          <p className="text-base-500 mt-1.5 text-sm font-medium">The Referral That Never Goes Dark</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 p-1 rounded-xl neu-pressed">
          <button
            type="button"
            onClick={() => { setActiveTab('login'); setError(null); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === 'login'
                ? 'bg-base-200 text-primary-700 shadow-neu-btn'
                : 'text-base-500 hover:text-base-700'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('signup'); setError(null); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === 'signup'
                ? 'bg-base-200 text-primary-700 shadow-neu-btn'
                : 'text-base-500 hover:text-base-700'
            }`}
          >
            Create Account
          </button>
        </div>

        {activeTab === 'login' ? (
          <>
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
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="neu-input w-full"
                  placeholder="doctor@hospital.com"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-base-600 mb-2 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="neu-input w-full pr-10"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-base-400 hover:text-base-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="neu-btn-primary w-full mt-2"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-7">
              <button
                type="button"
                onClick={() => setShowDemoModal(true)}
                disabled={loading}
                className="neu-btn w-full flex items-center justify-between px-4 py-3.5 text-left disabled:opacity-50"
              >
                <div>
                  <p className="text-xs font-bold text-primary-700 uppercase tracking-wider">
                    Quick Demo Access
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-primary-600 shrink-0" aria-hidden />
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-6">
            <p className="text-base-500 mb-5 text-sm">Create a new account to get started</p>
            <Link
              to="/signup"
              className="neu-btn-primary inline-block w-full text-center"
            >
              Go to Sign Up
            </Link>
            <p className="text-xs text-base-500 mt-5">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setActiveTab('login')}
                className="text-primary-500 hover:text-primary-600 font-semibold transition-colors"
              >
                Sign In
              </button>
            </p>
          </div>
        )}
      </div>
      </div>

      {showDemoModal && (
        <div
          className="demo-modal-backdrop"
          role="presentation"
          onClick={() => setShowDemoModal(false)}
        >
          <div
            className="demo-modal neu-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <h2 id="demo-modal-title" className="font-display text-lg font-bold text-base-800 tracking-tight">
                  Quick Demo Access
                </h2>
                <p className="text-xs text-base-500 mt-1">
                  Choose a role to sign in instantly
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDemoModal(false)}
                className="neu-btn w-9 h-9 flex items-center justify-center rounded-full p-0 shrink-0"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-base-500" />
              </button>
            </div>

            <div className="space-y-2.5">
              {DEMO_ACCOUNTS.map((demo) => (
                <button
                  key={demo.email}
                  type="button"
                  onClick={() => handleDemoLogin(demo.email)}
                  disabled={loading}
                  className="neu-btn w-full flex items-center justify-between px-4 py-3.5 text-left disabled:opacity-50"
                >
                  <div>
                    <p className="text-sm font-semibold text-base-800">{demo.name}</p>
                    <p className="text-xs text-base-500 mt-0.5">{demo.role}</p>
                  </div>
                  <span className="text-xs text-primary-600 font-semibold shrink-0">Sign in</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
