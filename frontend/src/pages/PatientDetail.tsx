import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Upload, Plus, FileText, Plane } from 'lucide-react';
import { mockPatientsAPI, mockDocumentsAPI, mockFlightTrackerAPI, mockReferralsAPI } from '@/services/mockAPI';
import { Patient, PatientDocument, FlightTracker, Referral } from '@/types';
import FlightTrackerView from '@/components/FlightTracker/FlightTrackerView';

const PatientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [trackers, setTrackers] = useState<FlightTracker[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'documents' | 'trackers'>('info');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  useEffect(() => {
    if (id) loadPatientData();
  }, [id]);

  const loadPatientData = async () => {
    if (!id) return;
    const patientData = await mockPatientsAPI.getById(id);
    setPatient(patientData);
    
    const docs = await mockDocumentsAPI.getByPatientId(id);
    setDocuments(docs);
    
    const trackersData = await mockFlightTrackerAPI.getByPatientId(id);
    setTrackers(trackersData);

    const referralsData = await mockReferralsAPI.getByPatientId(id);
    setReferrals(referralsData);
  };

  const handleStartTracking = async () => {
    if (!patient) return;
    const visitReason = prompt('Enter visit reason:');
    if (!visitReason) return;
    
    const tracker = await mockFlightTrackerAPI.create({
      patientId: patient.id,
      visitReason,
      urgency: 'Routine',
    });
    setTrackers([...trackers, tracker]);
    setActiveTab('trackers');
  };

  const handleCreateReferral = () => {
    navigate(`/referrals/new?patientId=${patient?.id}`);
  };

  const handleDownload = async (doc: PatientDocument) => {
    const blob = await mockDocumentsAPI.download(doc.id);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.fileName;
    a.click();
  };

  if (!patient) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/patients')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">
            {patient.firstName} {patient.lastName}
          </h1>
          <p className="text-gray-600 mt-1">{patient.referralId}</p>
        </div>
        <button
          onClick={handleStartTracking}
          className="flex items-center gap-2 bg-success-500 hover:bg-success-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plane className="w-5 h-5" />
          Start Tracking
        </button>
        <button
          onClick={handleCreateReferral}
          className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Referral
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-gray-200">
          <div className="flex gap-4 px-6">
            {['info', 'documents', 'trackers'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`py-4 px-2 border-b-2 font-medium transition-colors capitalize ${
                  activeTab === tab
                    ? 'border-primary-500 text-primary-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'info' && (
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Personal Information</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Date of Birth</p>
                    <p className="font-medium text-gray-900">{new Date(patient.dateOfBirth).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Gender</p>
                    <p className="font-medium text-gray-900 capitalize">{patient.gender}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Contact Number</p>
                    <p className="font-medium text-gray-900">{patient.contactNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium text-gray-900">{patient.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Address</p>
                    <p className="font-medium text-gray-900">{patient.address}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Medical Information</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Blood Group</p>
                    <p className="font-medium text-gray-900">{patient.bloodGroup || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Allergies</p>
                    <p className="font-medium text-gray-900">
                      {patient.allergies?.length ? patient.allergies.join(', ') : 'None'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Insurance Provider</p>
                    <p className="font-medium text-gray-900">{patient.insurance.provider}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Policy Number</p>
                    <p className="font-medium text-gray-900">{patient.insurance.policyNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Member ID</p>
                    <p className="font-medium text-gray-900">{patient.insurance.memberId}</p>
                  </div>
                </div>
              </div>

              {referrals.length > 0 && (
                <div className="col-span-2">
                  <h3 className="font-semibold text-gray-900 mb-4">Referral History</h3>
                  <div className="space-y-2">
                    {referrals.map(ref => (
                      <div key={ref.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{ref.referralNumber}</p>
                            <p className="text-sm text-gray-600">{ref.referralReason}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
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
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Documents</h3>
                <button
                  onClick={() => setUploadModalOpen(true)}
                  className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Upload
                </button>
              </div>

              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-primary-500" />
                      <div>
                        <p className="font-medium text-gray-900">{doc.fileName}</p>
                        <p className="text-sm text-gray-500">
                          {doc.category.replace('_', ' ')} • {(doc.size / 1024).toFixed(0)} KB • 
                          {new Date(doc.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownload(doc)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Download className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                ))}

                {documents.length === 0 && (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">No documents uploaded</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'trackers' && (
            <div className="space-y-6">
              {trackers.map((tracker) => (
                <FlightTrackerView key={tracker.id} tracker={tracker} />
              ))}

              {trackers.length === 0 && (
                <div className="text-center py-12">
                  <Plane className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">No active trackers</p>
                  <button
                    onClick={handleStartTracking}
                    className="mt-4 text-primary-600 hover:text-primary-700 font-medium"
                  >
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
