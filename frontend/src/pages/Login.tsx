import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import InlineAlert from '@/components/ui/InlineAlert';
import HeroBackdrop from '@/components/HeroBackdrop';
import { formatError } from '@/utils/messages';

const Login: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<{ title: string; description: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

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

  return (
    <div className="auth-hero">
      <HeroBackdrop variant="auth" />
      <div className="auth-hero__content flex justify-center">
      <div className="neu-card w-full max-w-md p-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
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
    </div>
  );
};

export default Login;
