import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { mockPatientsAPI, mockReferralsAPI, mockFlightTrackerAPI } from '@/services/mockAPI';
import { Patient, UrgencyLevel } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

const CreateReferral: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    patientId: searchParams.get('patientId') || '',
    requestedSpecialty: '',
    specialistPreference: '',
    referralReason: '',
    serviceType: '',
    urgency: 'Routine' as UrgencyLevel,
  });

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    const data = await mockPatientsAPI.getAll();
    setPatients(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const patient = patients.find(p => p.id === formData.patientId);
      if (!patient || !user) return;

      // Create referral - this triggers YOXA workflow
      const { referral, workflowRunId } = await mockReferralsAPI.create({
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

      // Create flight tracker linked to the referral
      await mockFlightTrackerAPI.create({
        patientId: formData.patientId,
        visitReason: `${formData.requestedSpecialty} - ${formData.referralReason}`,
        urgency: formData.urgency,
        workflowRunId,
      });

      alert(`Referral created successfully!\nReferral #: ${referral.referralNumber}\nWorkflow Run ID: ${workflowRunId}\n\nThe multiagent workflow will now handle:\n- Routing to specialist\n- Document exchange\n- Coverage verification\n- Scheduling\n- And more...`);
      
      navigate(`/patients/${formData.patientId}`);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create Referral</h1>
          <p className="text-gray-600 mt-1">Refer patient for specialist consultation</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Patient <span className="text-danger-500">*</span>
          </label>
          <select
            value={formData.patientId}
            onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          >
            <option value="">Select a patient</option>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.firstName} {patient.lastName} ({patient.referralId})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Requested Specialty <span className="text-danger-500">*</span>
            </label>
            <select
              value={formData.requestedSpecialty}
              onChange={(e) => setFormData({ ...formData, requestedSpecialty: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            >
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Specialist Preference (Optional)
            </label>
            <input
              type="text"
              value={formData.specialistPreference}
              onChange={(e) => setFormData({ ...formData, specialistPreference: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Dr. Name or facility"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Referral Reason <span className="text-danger-500">*</span>
          </label>
          <textarea
            value={formData.referralReason}
            onChange={(e) => setFormData({ ...formData, referralReason: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            rows={4}
            placeholder="Describe the reason for referral..."
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Service Type (Optional)
            </label>
            <input
              type="text"
              value={formData.serviceType}
              onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="e.g., Endoscopic evaluation"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Urgency <span className="text-danger-500">*</span>
            </label>
            <select
              value={formData.urgency}
              onChange={(e) => setFormData({ ...formData, urgency: e.target.value as UrgencyLevel })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="Routine">Routine (24h response)</option>
              <option value="Urgent">Urgent (4h response)</option>
              <option value="Emergency">Emergency (30min response)</option>
            </select>
          </div>
        </div>

        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
          <p className="text-sm text-primary-800 font-medium mb-2">🤖 Multiagent Workflow Integration</p>
          <p className="text-sm text-primary-700">
            Upon submission, the YOXA multiagent workflow will automatically:
          </p>
          <ul className="text-sm text-primary-700 list-disc list-inside mt-2 space-y-1">
            <li>Route referral through FHIR to specialist</li>
            <li>Send specialist alerts and track acknowledgment</li>
            <li>Exchange targeted documents securely</li>
            <li>Verify insurance coverage and pre-approval</li>
            <li>Schedule and confirm appointment</li>
            <li>Track attendance and completion</li>
          </ul>
        </div>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-lg transition-colors disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
            {loading ? 'Creating...' : 'Create Referral & Start Workflow'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateReferral;
