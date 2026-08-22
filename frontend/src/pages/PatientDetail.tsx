import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Upload, Plus, FileText, Plane, Trash2 } from 'lucide-react';
import { patientsAPI, documentsAPI, flightTrackerAPI, referralsAPI } from '@/services/api';
import { Patient, PatientDocument, FlightTracker, Referral } from '@/types';
import FlightTrackerView from '@/components/FlightTracker/FlightTrackerView';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';

const DOCUMENT_CATEGORIES: { value: PatientDocument['category']; label: string }[] = [
  { value: 'lab_result', label: 'Lab Result' },
  { value: 'imaging', label: 'Imaging' },
  { value: 'prescription', label: 'Prescription' },
  { value: 'referral', label: 'Referral' },
  { value: 'medical_history', label: 'Medical History' },
  { value: 'other', label: 'Other' },
];

const PatientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const { user } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [trackers, setTrackers] = useState<FlightTracker[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'documents' | 'trackers'>('info');
  const [uploadCategory, setUploadCategory] = useState<PatientDocument['category']>('other');
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [signingOffId, setSigningOffId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (id) loadPatientData(); }, [id]);

  const loadPatientData = async () => {
    if (!id) return;
    try {
      setPatient(await patientsAPI.getById(id));
      setDocuments(await documentsAPI.getByPatientId(id));
      setTrackers(await flightTrackerAPI.getByPatientId(id));
      setReferrals(await referralsAPI.getByPatientId(id));
    } catch (error) {
      console.error('Error loading patient data:', error);
      // If patient not found or error, navigate back
      navigate('/patients');
    }
  };

  const handleStartTracking = async () => {
    if (!patient) return;
    const visitReason = prompt('Enter visit reason:');
    if (!visitReason) return;
    const tracker = await flightTrackerAPI.create({
      patientId: patient.id, visitReason, urgency: 'Routine',
    });
    setTrackers([...trackers, tracker]);
    setActiveTab('trackers');
  };

  const handleSignOff = async (tracker: FlightTracker) => {
    if (!user) return;
    setSigningOffId(tracker.id);
    try {
      const updated = await flightTrackerAPI.signOff(tracker.id, user.id);
      setTrackers(trackers.map((t) => (t.id === tracker.id ? updated : t)));
      success('Tracker signed off', 'This referral journey is marked complete.');
    } catch (err) {
      showError('Sign-off failed', 'Could not sign off this tracker. Please try again.');
    } finally {
      setSigningOffId(null);
    }
  };

  const handleDownload = async (doc: PatientDocument) => {
    try {
      const blob = await documentsAPI.download(doc.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = doc.fileName; a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      showError('Download failed', 'Could not retrieve this document. Please try again.');
    }
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !patient) return;

    setUploading(true);
    try {
      const doc = await documentsAPI.upload(patient.id, file, uploadCategory);
      setDocuments([doc, ...documents]);
      success('Document uploaded', file.name);
    } catch (err: any) {
      showError('Upload failed', err.response?.data?.error || 'Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (doc: PatientDocument) => {
    setDeletingId(doc.id);
    try {
      await documentsAPI.delete(doc.id);
      setDocuments(documents.filter((d) => d.id !== doc.id));
      success('Document removed', doc.fileName);
    } catch (err) {
      showError('Delete failed', 'Could not remove this document. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  if (!patient) return <div className="text-base-500 p-10 text-center">Loading...</div>;

  const tabs = [
    { key: 'info' as const, label: 'Info' },
    { key: 'documents' as const, label: 'Documents' },
    { key: 'trackers' as const, label: 'Trackers' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/patients')}
          className="neu-btn w-10 h-10 flex items-center justify-center rounded-full p-0">
          <ArrowLeft className="w-5 h-5 text-base-500" />
        </button>
        <div className="flex-1">
          <h1 className="page-title">
            {patient.firstName} {patient.lastName}
          </h1>
          <p className="text-base-500 text-sm mt-0.5">{patient.referralId}</p>
        </div>
        <button onClick={handleStartTracking}
          className="neu-btn-success flex items-center gap-2 text-sm">
          <Plane className="w-4 h-4" /> Start Tracking
        </button>
        <button onClick={() => navigate(`/referrals/new?patientId=${patient?.id}`)}
          className="neu-btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Create Referral
        </button>
      </div>

      <div className="neu-card overflow-hidden">
        {/* Tab bar — inset */}
        <div className="p-2 mx-6 mt-4 neu-pressed rounded-xl flex gap-1">
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === tab.key
                  ? 'bg-primary-50 text-primary-700 border border-primary-100'
                  : 'text-base-500 hover:text-base-700'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'info' && (
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold text-base-800 mb-3 text-sm uppercase tracking-wider">Personal Information</h3>
                <div className="neu-pressed rounded-2xl p-4 space-y-3">
                  {[
                    ['Date of Birth', new Date(patient.dateOfBirth).toLocaleDateString()],
                    ['Gender', patient.gender],
                    ['Contact', patient.contactNumber],
                    ['Email', patient.email],
                    ['Address', patient.address],
                  ].map(([label, val]) => (
                    <div key={label}>
                      <p className="text-[10px] text-base-400 uppercase tracking-wider">{label}</p>
                      <p className="text-sm font-medium text-base-800">{val}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-bold text-base-800 mb-3 text-sm uppercase tracking-wider">Medical Information</h3>
                <div className="neu-pressed rounded-2xl p-4 space-y-3">
                  {[
                    ['Blood Group', patient.bloodGroup || 'N/A'],
                    ['Allergies', patient.allergies?.length ? patient.allergies.join(', ') : 'None'],
                    ['Insurance', patient.insurance.provider],
                    ['Policy', patient.insurance.policyNumber],
                    ['Member ID', patient.insurance.memberId],
                  ].map(([label, val]) => (
                    <div key={label}>
                      <p className="text-[10px] text-base-400 uppercase tracking-wider">{label}</p>
                      <p className="text-sm font-medium text-base-800">{val}</p>
                    </div>
                  ))}
                </div>
              </div>
              {referrals.length > 0 && (
                <div className="col-span-2">
                  <h3 className="font-bold text-base-800 mb-3 text-sm uppercase tracking-wider">Referral History</h3>
                  <div className="space-y-2">
                    {referrals.map(ref => (
                      <div key={ref.id} className="neu-flat rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-sm text-base-800">{ref.referralNumber}</p>
                            <p className="text-xs text-base-500 mt-0.5">{ref.referralReason}</p>
                          </div>
                          <span className={`neu-badge ${
                            ref.status === 'completed' ? 'bg-success-100 text-success-700' :
                            ref.status === 'accepted' ? 'bg-primary-100 text-primary-700' :
                            'bg-warning-100 text-warning-700'
                          }`}>
                            {ref.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'documents' && (
            <div>
              <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <h3 className="font-bold text-base-800 text-sm uppercase tracking-wider">Documents</h3>
                <div className="flex items-center gap-2">
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value as PatientDocument['category'])}
                    className="neu-input text-sm py-2"
                  >
                    {DOCUMENT_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileSelected}
                  />
                  <button
                    onClick={handleUploadClick}
                    disabled={uploading}
                    className="neu-btn-primary flex items-center gap-2 text-sm py-2 px-4 disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="neu-flat flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-base-800">{doc.fileName}</p>
                        <p className="text-xs text-base-500">
                          {doc.category.replace('_', ' ')} • {(doc.size / 1024).toFixed(0)} KB •{' '}
                          {new Date(doc.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleDownload(doc)}
                        className="neu-btn w-9 h-9 flex items-center justify-center rounded-full p-0">
                        <Download className="w-4 h-4 text-base-500" />
                      </button>
                      <button
                        onClick={() => handleDeleteDocument(doc)}
                        disabled={deletingId === doc.id}
                        className="neu-btn w-9 h-9 flex items-center justify-center rounded-full p-0 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4 text-danger-500" />
                      </button>
                    </div>
                  </div>
                ))}
                {documents.length === 0 && (
                  <div className="neu-pressed rounded-2xl text-center py-12">
                    <FileText className="w-14 h-14 text-base-300 mx-auto mb-3" />
                    <p className="text-base-500 text-sm">No documents uploaded</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'trackers' && (
            <div className="space-y-6">
              {trackers.map((tracker) => (
                <div key={tracker.id}>
                  <FlightTrackerView tracker={tracker} />
                  {!tracker.signedOffAt && (
                    <div className="flex justify-end mt-3">
                      <button
                        onClick={() => handleSignOff(tracker)}
                        disabled={signingOffId === tracker.id}
                        className="neu-btn-success flex items-center gap-2 text-sm disabled:opacity-50"
                      >
                        {signingOffId === tracker.id ? 'Signing off...' : 'Sign Off — Mark Complete'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {trackers.length === 0 && (
                <div className="neu-pressed rounded-2xl text-center py-12">
                  <Plane className="w-14 h-14 text-base-300 mx-auto mb-3" />
                  <p className="text-base-500 text-sm">No active trackers</p>
                  <button onClick={handleStartTracking}
                    className="mt-3 text-primary-500 hover:text-primary-600 font-semibold text-sm transition-colors">
                    Start tracking a visit
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientDetail;
