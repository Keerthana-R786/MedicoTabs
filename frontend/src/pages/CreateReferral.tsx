import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { patientsAPI, referralsAPI, flightTrackerAPI } from '@/services/api';
import { Patient, UrgencyLevel } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { formatError, formatSuccess } from '@/utils/messages';

// Move Field component outside to prevent re-creation on every render
const Field: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({ label, required, children }) => (
  <div>
    <label className="block text-[10px] font-semibold text-base-500 mb-1.5 uppercase tracking-wider">
      {label} {required && <span className="text-danger-500">*</span>}
    </label>
    {children}
  </div>
);

const CreateReferral: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    patientId: searchParams.get('patientId') || '',
    requestedSpecialty: '', specialistPreference: '',
    referralReason: '', serviceType: '',
    urgency: 'Routine' as UrgencyLevel,
  });

  useEffect(() => { loadPatients(); }, []);

  const loadPatients = async () => { setPatients(await patientsAPI.getAll()); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const patient = patients.find(p => p.id === formData.patientId);
      if (!patient || !user) return;
      const { referral, workflowRunId } = await referralsAPI.create({
        patientId: formData.patientId,
        patientName: `${patient.firstName} ${patient.lastName}`,
        primaryDoctorId: user.id,
        primaryDoctorName: `Dr. ${user.firstName} ${user.lastName}`,
        primaryOrganization: user.organization,
        requestedSpecialty: formData.requestedSpecialty,
        specialistPreference: formData.specialistPreference || undefined,
        referralReason: formData.referralReason,
        serviceType: formData.serviceType || undefined,
        urgency: formData.urgency,
      });
      await flightTrackerAPI.create({
        patientId: formData.patientId,
        visitReason: `${formData.requestedSpecialty} — ${formData.referralReason}`,
        urgency: formData.urgency,
        workflowRunId,
      });
      const msg = formatSuccess(
        'referral-created',
        `${referral.referralNumber} · workflow ${workflowRunId}`
      );
      success(msg.title, msg.description);
      navigate(`/patients/${formData.patientId}`);
    } catch (err: any) {
      const msg = formatError(err.message);
      showError(msg.title, msg.description);
    }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)}
          className="neu-btn w-10 h-10 flex items-center justify-center rounded-full p-0">
          <ArrowLeft className="w-5 h-5 text-base-500" />
        </button>
        <div>
          <h1 className="page-title">Create Referral</h1>
          <p className="text-base-500 mt-1 text-sm">Refer patient for specialist consultation</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="neu-card p-6 space-y-6">
        <Field label="Patient" required>
          <select value={formData.patientId} onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
            className="neu-input w-full" required>
            <option value="">Select a patient</option>
            {patients.map(p => (
              <option key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.referralId})</option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-5">
          <Field label="Requested Specialty" required>
            <select value={formData.requestedSpecialty} onChange={(e) => setFormData({ ...formData, requestedSpecialty: e.target.value })}
              className="neu-input w-full" required>
              <option value="">Select specialty</option>
              {['Cardiology','Dermatology','Gastroenterology','Neurology','Oncology','Orthopedics','Pediatrics','Psychiatry','Radiology'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Specialist Preference">
            <input type="text" value={formData.specialistPreference}
              onChange={(e) => setFormData({ ...formData, specialistPreference: e.target.value })}
              className="neu-input w-full" placeholder="Dr. Name or facility" />
          </Field>
        </div>

        <Field label="Referral Reason" required>
          <textarea value={formData.referralReason}
            onChange={(e) => setFormData({ ...formData, referralReason: e.target.value })}
            className="neu-input w-full resize-none" rows={4}
            placeholder="Describe the reason for referral..." required />
        </Field>

        <div className="grid grid-cols-2 gap-5">
          <Field label="Service Type">
            <input type="text" value={formData.serviceType}
              onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
              className="neu-input w-full" placeholder="e.g. Endoscopic evaluation" />
          </Field>
          <Field label="Urgency" required>
            <select value={formData.urgency}
              onChange={(e) => setFormData({ ...formData, urgency: e.target.value as UrgencyLevel })}
              className="neu-input w-full" required>
              <option value="Routine">Routine (24h response)</option>
              <option value="Urgent">Urgent (4h response)</option>
              <option value="Emergency">Emergency (30min response)</option>
            </select>
          </Field>
        </div>

        {/* Workflow info */}
        <div className="neu-pressed rounded-2xl p-5">
          <p className="text-xs font-bold text-primary-600 uppercase tracking-wider mb-2">Multiagent Workflow</p>
          <p className="text-xs text-base-500">On submission, YOXA agents handle routing, document exchange, coverage, scheduling, and completion tracking automatically.</p>
        </div>

        <div className="flex gap-4">
          <button type="button" onClick={() => navigate(-1)} className="neu-btn flex-1">Cancel</button>
          <button type="submit" disabled={loading}
            className="neu-btn-primary flex-1 flex items-center justify-center gap-2">
            <Send className="w-4 h-4" /> {loading ? 'Creating...' : 'Create & Start Workflow'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateReferral;
