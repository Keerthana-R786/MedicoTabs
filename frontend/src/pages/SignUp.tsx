import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Stethoscope, Eye, EyeOff } from 'lucide-react';
import InlineAlert from '@/components/ui/InlineAlert';
import HeroBackdrop from '@/components/HeroBackdrop';
import { formatError } from '@/utils/messages';

const SignUp: React.FC = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'primary_doctor' as 'primary_doctor' | 'specialist_doctor' | 'coordinator',
    organization: '',
    specialization: '',
    licenseNumber: '',
    phone: '',
  });
  const [error, setError] = useState<{ title: string; description: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (formData.password !== formData.confirmPassword) {
      setError(formatError('Passwords do not match'));
      return;
    }
    if (formData.password.length < 6) {
      setError(formatError('Password must be at least 6 characters'));
      return;
    }
    setLoading(true);
    try {
      await signup({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role,
        organization: formData.organization,
        specialization: formData.specialization || undefined,
        licenseNumber: formData.licenseNumber,
        phone: formData.phone,
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(formatError(err.message || 'Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  const showSpecialization = formData.role === 'specialist_doctor';

  return (
    <div className="auth-hero">
      <HeroBackdrop variant="auth" />
      <div className="auth-hero__content flex justify-center">
      <div className="neu-card w-full max-w-lg p-8">
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 bg-primary-800 rounded-2xl flex items-center justify-center mb-4">
            <Stethoscope className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-base-800">Create Account</h1>
          <p className="text-base-500 mt-1 text-sm">Join MedicoTabs</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <InlineAlert
              tone="error"
              title={error.title}
              description={error.description}
              onDismiss={() => setError(null)}
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-base-600 mb-2 uppercase tracking-wider">First Name *</label>
              <input name="firstName" type="text" value={formData.firstName} onChange={handleChange}
                className="neu-input w-full" placeholder="John" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-base-600 mb-2 uppercase tracking-wider">Last Name *</label>
              <input name="lastName" type="text" value={formData.lastName} onChange={handleChange}
                className="neu-input w-full" placeholder="Smith" required />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-base-600 mb-2 uppercase tracking-wider">Email *</label>
            <input name="email" type="email" value={formData.email} onChange={handleChange}
              className="neu-input w-full" placeholder="doctor@hospital.com" required />
          </div>

          <div>
            <label className="block text-xs font-semibold text-base-600 mb-2 uppercase tracking-wider">Password *</label>
            <div className="relative">
              <input name="password" type={showPassword ? 'text' : 'password'} value={formData.password} onChange={handleChange}
                className="neu-input w-full pr-10" placeholder="••••••••" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-base-400 hover:text-base-600 transition-colors">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-base-600 mb-2 uppercase tracking-wider">Confirm Password *</label>
            <input name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange}
              className="neu-input w-full" placeholder="••••••••" required />
          </div>

          <div>
            <label className="block text-xs font-semibold text-base-600 mb-2 uppercase tracking-wider">Role *</label>
            <select name="role" value={formData.role} onChange={handleChange}
              className="neu-input w-full appearance-none" required>
              <option value="primary_doctor">Primary Care Doctor</option>
              <option value="specialist_doctor">Specialist Doctor</option>
              <option value="coordinator">Care Coordinator</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-base-600 mb-2 uppercase tracking-wider">Organization *</label>
            <input name="organization" type="text" value={formData.organization} onChange={handleChange}
              className="neu-input w-full" placeholder="e.g. North Harbor Family Medicine" required />
          </div>

          {showSpecialization && (
            <div>
              <label className="block text-xs font-semibold text-base-600 mb-2 uppercase tracking-wider">Specialization *</label>
              <select name="specialization" value={formData.specialization} onChange={handleChange}
                className="neu-input w-full appearance-none" required>
                <option value="">Select specialty</option>
                <option value="Cardiology">Cardiology</option>
                <option value="Dermatology">Dermatology</option>
                <option value="Gastroenterology">Gastroenterology</option>
                <option value="Neurology">Neurology</option>
                <option value="Oncology">Oncology</option>
                <option value="Orthopedics">Orthopedics</option>
                <option value="Pediatrics">Pediatrics</option>
                <option value="Psychiatry">Psychiatry</option>
                <option value="Radiology">Radiology</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-base-600 mb-2 uppercase tracking-wider">License Number *</label>
            <input name="licenseNumber" type="text" value={formData.licenseNumber} onChange={handleChange}
              className="neu-input w-full" placeholder="e.g. MD-12345" required />
          </div>

          <div>
            <label className="block text-xs font-semibold text-base-600 mb-2 uppercase tracking-wider">Phone *</label>
            <input name="phone" type="tel" value={formData.phone} onChange={handleChange}
              className="neu-input w-full" placeholder="+1-555-0000" required />
          </div>

          <button type="submit" disabled={loading} className="neu-btn-primary w-full mt-2">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-5 text-center">
          <p className="text-sm text-base-500">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-500 hover:text-primary-600 font-semibold">Sign In</Link>
          </p>
        </div>
      </div>
      </div>
    </div>
  );
};

export default SignUp;
