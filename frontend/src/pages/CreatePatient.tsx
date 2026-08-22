import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Upload, FileText, X } from 'lucide-react';
import { patientsAPI, documentsAPI } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { formatError, formatSuccess } from '@/utils/messages';
import { PatientDocument } from '@/types';

const DOCUMENT_CATEGORIES: { value: PatientDocument['category']; label: string }[] = [
  { value: 'lab_result', label: 'Lab Result' },
  { value: 'imaging', label: 'Imaging' },
  { value: 'prescription', label: 'Prescription' },
  { value: 'referral', label: 'Referral' },
  { value: 'medical_history', label: 'Medical History' },
  { value: 'other', label: 'Other' },
];

type PendingDocument = { key: string; file: File; category: PatientDocument['category'] };

// Move these components outside to prevent re-creation on every render
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

const CreatePatient: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error: showError, toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', dateOfBirth: '',
    gender: 'female' as 'male' | 'female' | 'other',
    contactNumber: '', email: '', address: '',
    bloodGroup: '', allergies: '',
    insuranceProvider: '', policyNumber: '', memberId: '',
  });
  const [uploadCategory, setUploadCategory] = useState<PatientDocument['category']>('other');
  const [pendingDocuments, setPendingDocuments] = useState<PendingDocument[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleAddDocumentClick = () => fileInputRef.current?.click();

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPendingDocuments((prev) => [
      ...prev,
      { key: `${file.name}-${file.size}-${Date.now()}`, file, category: uploadCategory },
    ]);
  };

  const handleRemovePendingDocument = (key: string) =>
    setPendingDocuments((prev) => prev.filter((d) => d.key !== key));

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

      // Patient record exists now — attach any documents collected during registration.
      let uploadedCount = 0;
      let failedCount = 0;
      if (pendingDocuments.length > 0) {
        const results = await Promise.allSettled(
          pendingDocuments.map((d) => documentsAPI.upload(p.id, d.file, d.category))
        );
        uploadedCount = results.filter((r) => r.status === 'fulfilled').length;
        failedCount = results.length - uploadedCount;
      }

      const msg = formatSuccess('patient-created', p.referralId);
      success(msg.title, msg.description);
      if (failedCount > 0) {
        toast({
          tone: 'warning',
          title: `${uploadedCount}/${pendingDocuments.length} documents attached`,
          description: `${failedCount} document${failedCount > 1 ? 's' : ''} failed to upload. You can retry from the patient's Documents tab.`,
          durationMs: 7000,
        });
      }

      navigate(`/patients/${p.id}`);
    } catch (err: any) {
      const msg = formatError(err.message);
      showError(msg.title, msg.description);
    }
    finally { setLoading(false); }
  };

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

        <Section title="Documents">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-base-500">
              Attach ID, insurance card, referral letters, or prior records now — optional, and attached
              once the patient record is created below.
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value as PatientDocument['category'])}
                className="neu-input text-sm py-2"
              >
                {DOCUMENT_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} />
              <button type="button" onClick={handleAddDocumentClick}
                className="neu-btn flex items-center gap-2 text-sm py-2 px-4">
                <Upload className="w-4 h-4" /> Add Document
              </button>
            </div>
          </div>

          {pendingDocuments.length > 0 && (
            <div className="space-y-2 pt-1">
              {pendingDocuments.map((doc) => (
                <div key={doc.key} className="neu-flat flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 bg-primary-100 rounded-xl flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-primary-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-base-800 truncate">{doc.file.name}</p>
                      <p className="text-xs text-base-500">
                        {DOCUMENT_CATEGORIES.find((c) => c.value === doc.category)?.label} •{' '}
                        {(doc.file.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  </div>
                  <button type="button" onClick={() => handleRemovePendingDocument(doc.key)}
                    className="neu-btn w-8 h-8 flex items-center justify-center rounded-full p-0 shrink-0">
                    <X className="w-3.5 h-3.5 text-base-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Section>

        <div className="flex gap-4 pt-2">
          <button type="button" onClick={() => navigate('/patients')} className="neu-btn flex-1">Cancel</button>
          <button type="submit" disabled={loading} className="neu-btn-primary flex-1 flex items-center justify-center gap-2">
            <Save className="w-4 h-4" />
            {loading
              ? (pendingDocuments.length > 0 ? 'Creating & uploading...' : 'Creating...')
              : 'Create Patient'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePatient;
