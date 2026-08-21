import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { patientsAPI } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { formatError, formatSuccess } from '@/utils/messages';

const CreatePatient: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', dateOfBirth: '',
    gender: 'female' as 'male' | 'female' | 'other',
    contactNumber: '', email: '', address: '',
    bloodGroup: '', allergies: '',
    insuranceProvider: '', policyNumber: '', memberId: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const p = await patientsAPI.create({
        firstName: formData.firstName, lastName: formData.lastName,
        dateOfBirth: formData.dateOfBirth, gender: formData.gender,
        contactNumber: formData.contactNumber, email: formData.email,
        address: formData.address, bloodGroup: formData.bloodGroup || undefined,
        allergies: formData.allergies ? formData.allergies.split(',').map(a => a.trim()) : [],
        insurance: { provider: formData.insuranceProvider, policyNumber: formData.policyNumber, memberId: formData.memberId },
        primaryDoctorId: user?.id || 'user-001',
      });
      const msg = formatSuccess('patient-created', p.referralId);
      success(msg.title, msg.description);
      navigate(`/patients/${p.id}`);
    } catch (err: any) {
      const msg = formatError(err.message);
      showError(msg.title, msg.description);
    }
    finally { setLoading(false); }
  };

  const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div>
      <h3 className="text-sm font-bold text-base-700 uppercase tracking-wider mb-3">{title}</h3>
      <div className="neu-pressed rounded-2xl p-5 space-y-4">
        {children}
      </div>
    </div>
  );

  const Field: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({ label, required, children }) => (
    <div>
      <label className="block text-[10px] font-semibold text-base-500 mb-1.5 uppercase tracking-wider">
        {label} {required && <span className="text-danger-500">*</span>}
      </label>
      {children}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/patients')}
          className="neu-btn w-10 h-10 flex items-center justify-center rounded-full p-0">
          <ArrowLeft className="w-5 h-5 text-base-500" />
        </button>
        <div>
          <h1 className="page-title">New Patient Record</h1>
          <p className="text-base-500 mt-1 text-sm">Create a new patient in the system</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="neu-card p-6 space-y-6">
        <Section title="Personal Information">
          <div className="grid grid-cols-2 gap-4">
            <Field label="First Name" required>
              <input name="firstName" value={formData.firstName} onChange={handleChange} className="neu-input w-full" required />
            </Field>
            <Field label="Last Name" required>
              <input name="lastName" value={formData.lastName} onChange={handleChange} className="neu-input w-full" required />
            </Field>
            <Field label="Date of Birth" required>
              <input name="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={handleChange} className="neu-input w-full" required />
            </Field>
            <Field label="Gender" required>
              <select name="gender" value={formData.gender} onChange={handleChange} className="neu-input w-full" required>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Contact Number" required>
              <input name="contactNumber" type="tel" value={formData.contactNumber} onChange={handleChange} className="neu-input w-full" placeholder="+1-555-0000" required />
            </Field>
            <Field label="Email" required>
              <input name="email" type="email" value={formData.email} onChange={handleChange} className="neu-input w-full" required />
            </Field>
            <div className="col-span-2">
              <Field label="Address" required>
                <input name="address" value={formData.address} onChange={handleChange} className="neu-input w-full" required />
              </Field>
            </div>
          </div>
        </Section>

        <Section title="Medical Information">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Blood Group">
              <select name="bloodGroup" value={formData.bloodGroup} onChange={handleChange} className="neu-input w-full">
                <option value="">Select</option>
                {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="Allergies">
              <input name="allergies" value={formData.allergies} onChange={handleChange}
                className="neu-input w-full" placeholder="Penicillin, Sulfa drugs" />
            </Field>
          </div>
        </Section>

        <Section title="Insurance Information">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Insurance Provider" required>
              <input name="insuranceProvider" value={formData.insuranceProvider} onChange={handleChange}
                className="neu-input w-full" placeholder="HarborCare PPO" required />
            </Field>
            <Field label="Policy Number" required>
              <input name="policyNumber" value={formData.policyNumber} onChange={handleChange}
                className="neu-input w-full" required />
            </Field>
            <Field label="Member ID" required>
              <input name="memberId" value={formData.memberId} onChange={handleChange}
                className="neu-input w-full" required />
            </Field>
          </div>
        </Section>

        <div className="flex gap-4 pt-2">
          <button type="button" onClick={() => navigate('/patients')} className="neu-btn flex-1">Cancel</button>
          <button type="submit" disabled={loading} className="neu-btn-primary flex-1 flex items-center justify-center gap-2">
            <Save className="w-4 h-4" /> {loading ? 'Creating...' : 'Create Patient'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePatient;
