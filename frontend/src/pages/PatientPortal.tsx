import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Stethoscope, LogOut, Download, FileText, Droplet,
  ShieldCheck, Plane, User as UserIcon,
} from 'lucide-react';
import { usePatientAuth } from '@/contexts/PatientAuthContext';
import { patientPortalAPI } from '@/services/patientPortalApi';
import { PatientPortalSummary, PatientPortalTracker } from '@/types';
import FlightTrackerView from '@/components/FlightTracker/FlightTrackerView';
import LoadError from '@/components/ui/LoadError';
import { useToast } from '@/contexts/ToastContext';

const statusBadge = (status: string) => {
  const c: Record<string, string> = {
    completed: 'bg-success-100 text-success-700',
    accepted: 'bg-primary-100 text-primary-700',
    routed: 'bg-primary-100 text-primary-700',
    pending: 'bg-warning-100 text-warning-700',
    denied: 'bg-danger-100 text-danger-700',
    archived: 'bg-base-300 text-base-600',
  };
  return c[status] || 'bg-base-300 text-base-600';
};

const PatientPortal: React.FC = () => {
  const { logout } = usePatientAuth();
  const navigate = useNavigate();
  const { error: showError } = useToast();
  const [summary, setSummary] = useState<PatientPortalSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => { loadSummary(); }, []);

  const loadSummary = async () => {
    setLoadFailed(false);
    try {
      const data = await patientPortalAPI.getSummary();
      setSummary(data);
    } catch (error) {
      console.error('Error loading patient summary:', error);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  };

  // YOXA's workflow agents advance tracker stages in the background as they
  // work through a referral — poll quietly while any tracker is still open
  // so the Flight Tracker view catches up without a manual page reload.
  const summaryRef = useRef<PatientPortalSummary | null>(null);
  useEffect(() => { summaryRef.current = summary; }, [summary]);

  useEffect(() => {
    const isTrackerActive = (t: PatientPortalTracker) =>
      !t.signedOffAt && t.stages[t.stages.length - 1]?.status !== 'completed';

    const interval = setInterval(async () => {
      if (!summaryRef.current?.trackers.some(isTrackerActive)) return;
      try {
        setSummary(await patientPortalAPI.getSummary());
      } catch {
        // Silent refresh — leave the existing summary in place on failure.
      }
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleRetry = async () => {
    setRetrying(true);
    setLoading(true);
    await loadSummary();
    setRetrying(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/patient-access');
  };

  const handleDownloadDocument = async (docId: string, fileName: string) => {
    try {
      const blob = await patientPortalAPI.downloadDocument(docId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      showError('Download failed', 'Could not download this document. Please try again.');
    }
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const blob = await patientPortalAPI.downloadSummaryPdf();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MedicoTabs-Summary-${summary?.patient.referralId || 'record'}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF summary:', error);
      showError('Download failed', 'Could not generate your summary PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="app-shell min-h-screen flex items-center justify-center">
        <div className="app-shell__texture" aria-hidden />
        <div className="relative z-[1] text-center">
          <div className="w-16 h-16 border-4 border-primary-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-base-500 text-sm font-medium">Loading your records...</p>
        </div>
      </div>
    );
  }

  if (loadFailed || !summary) {
    return (
      <div className="app-shell min-h-screen flex items-center justify-center p-6">
        <div className="app-shell__texture" aria-hidden />
        <div className="relative z-[1] w-full max-w-sm">
          <LoadError
            title="Couldn’t load your records"
            description="Please check your connection and try again."
            onRetry={handleRetry}
            retrying={retrying}
          />
        </div>
      </div>
    );
  }

  const { patient: p, referrals, trackers, documents } = summary;
  const activeReferrals = referrals.filter((r) => !['completed', 'archived', 'denied'].includes(r.status)).length;

  return (
    <div className="app-shell min-h-screen">
      <div className="app-shell__texture" aria-hidden />
      <div className="relative z-[1] max-w-5xl mx-auto p-6 space-y-6">
        {/* Top bar */}
        <div className="neu-card p-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-primary-800 shrink-0">
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-base-800 leading-tight">MedicoTabs</h1>
              <p className="text-[11px] text-base-500 uppercase tracking-wider font-medium">Patient Access</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="neu-btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
            >
              <Download className="w-4 h-4" /> {downloading ? 'Preparing...' : 'Download PDF Summary'}
            </button>
            <button
              onClick={handleLogout}
              className="neu-btn w-10 h-10 flex items-center justify-center rounded-full p-0"
              aria-label="Log out"
            >
              <LogOut className="w-4 h-4 text-base-500" />
            </button>
          </div>
        </div>

        {/* Patient header */}
        <div>
          <h2 className="page-title">{p.firstName} {p.lastName}</h2>
          <p className="text-base-500 mt-1 text-sm">{p.referralId} • Welcome back</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="stat-card stat-card--teal">
            <div className="stat-card__top">
              <div className="stat-card__icon"><FileText className="w-[18px] h-[18px]" /></div>
              <span className="stat-card__meta">Open</span>
            </div>
            <div className="stat-card__body">
              <p className="stat-card__value">{activeReferrals}</p>
              <p className="stat-card__label">Active Referrals</p>
            </div>
          </div>
          <div className="stat-card stat-card--moss">
            <div className="stat-card__top">
              <div className="stat-card__icon"><Plane className="w-[18px] h-[18px]" /></div>
              <span className="stat-card__meta">Tracking</span>
            </div>
            <div className="stat-card__body">
              <p className="stat-card__value">{trackers.length}</p>
              <p className="stat-card__label">Care Journeys</p>
            </div>
          </div>
          <div className="stat-card stat-card--amber">
            <div className="stat-card__top">
              <div className="stat-card__icon"><Droplet className="w-[18px] h-[18px]" /></div>
              <span className="stat-card__meta">Blood</span>
            </div>
            <div className="stat-card__body">
              <p className="stat-card__value">{p.bloodGroup || 'N/A'}</p>
              <p className="stat-card__label">Blood Group</p>
            </div>
          </div>
          <div className="stat-card stat-card--deep">
            <div className="stat-card__top">
              <div className="stat-card__icon"><ShieldCheck className="w-[18px] h-[18px]" /></div>
              <span className="stat-card__meta">Coverage</span>
            </div>
            <div className="stat-card__body">
              <p className="stat-card__value text-lg">{p.insurance?.provider || 'N/A'}</p>
              <p className="stat-card__label">Insurance</p>
            </div>
          </div>
        </div>

        {/* Personal + Medical info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="neu-card p-6">
            <h3 className="font-bold text-base-800 mb-3 text-sm uppercase tracking-wider flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-primary-500" /> Personal Information
            </h3>
            <div className="neu-pressed rounded-2xl p-4 space-y-3">
              {[
                ['Date of Birth', new Date(p.dateOfBirth).toLocaleDateString()],
                ['Gender', p.gender],
                ['Contact', p.contactNumber],
                ['Email', p.email],
                ['Address', p.address],
              ].map(([label, val]) => (
                <div key={label}>
                  <p className="text-[10px] text-base-400 uppercase tracking-wider">{label}</p>
                  <p className="text-sm font-medium text-base-800">{val}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="neu-card p-6">
            <h3 className="font-bold text-base-800 mb-3 text-sm uppercase tracking-wider">Medical & Insurance</h3>
            <div className="neu-pressed rounded-2xl p-4 space-y-3">
              {[
                ['Blood Group', p.bloodGroup || 'N/A'],
                ['Allergies', p.allergies?.length ? p.allergies.join(', ') : 'None recorded'],
                ['Insurance Provider', p.insurance?.provider],
                ['Policy Number', p.insurance?.policyNumber],
                ['Member ID', p.insurance?.memberId],
              ].map(([label, val]) => (
                <div key={label}>
                  <p className="text-[10px] text-base-400 uppercase tracking-wider">{label}</p>
                  <p className="text-sm font-medium text-base-800">{val}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Referral history */}
        <div className="neu-card p-6">
          <h3 className="font-bold text-base-800 mb-4 text-sm uppercase tracking-wider">Referral History</h3>
          {referrals.length === 0 ? (
            <div className="neu-pressed rounded-2xl text-center py-12">
              <FileText className="w-12 h-12 text-base-300 mx-auto mb-3" />
              <p className="text-base-500 text-sm">No referrals on record yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {referrals.map((ref) => (
                <div key={ref.id} className="neu-flat rounded-xl p-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-bold text-sm text-base-800">
                        {ref.referralNumber} — {ref.requestedSpecialty}
                      </p>
                      <p className="text-xs text-base-500 mt-0.5">{ref.referralReason}</p>
                      <p className="text-[10px] text-base-400 mt-1">
                        {new Date(ref.createdAt).toLocaleDateString()}
                        {ref.primaryDoctorName ? ` • Referred by ${ref.primaryDoctorName}` : ''}
                      </p>
                    </div>
                    <span className={`neu-badge ${statusBadge(ref.status)} shrink-0`}>{ref.status}</span>
                  </div>

                  {(ref.appointmentDetails || ref.attendanceStatus || ref.coverageStatus) && (
                    <div className="mt-3 pt-3 border-t border-base-300/50 flex flex-wrap gap-2">
                      {ref.appointmentDetails && (
                        <span className="neu-badge bg-primary-100 text-primary-700">
                          Appointment: {ref.appointmentDetails.date} {ref.appointmentDetails.time} • {ref.appointmentDetails.location}
                        </span>
                      )}
                      {ref.attendanceStatus && (
                        <span className={`neu-badge ${
                          ref.attendanceStatus === 'attended' ? 'bg-success-100 text-success-700' :
                          ref.attendanceStatus === 'missed' ? 'bg-danger-100 text-danger-700' :
                          'bg-base-300 text-base-600'
                        }`}>
                          {ref.attendanceStatus.replace('_', ' ')}
                        </span>
                      )}
                      {ref.coverageStatus && ref.coverageStatus !== 'not_applicable' && (
                        <span className={`neu-badge ${
                          ref.coverageStatus === 'verified' ? 'bg-success-100 text-success-700' :
                          ref.coverageStatus === 'denied' ? 'bg-danger-100 text-danger-700' :
                          'bg-warning-100 text-warning-700'
                        }`}>
                          Coverage: {ref.coverageStatus === 'verified' ? 'Covered' : ref.coverageStatus === 'denied' ? 'Cannot Be Claimed' : 'Verifying'}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Care journey / flight trackers */}
        <div className="space-y-6">
          <h3 className="font-bold text-base-800 text-sm uppercase tracking-wider px-1">Care Journey</h3>
          {trackers.length === 0 ? (
            <div className="neu-card p-6">
              <div className="neu-pressed rounded-2xl text-center py-12">
                <Plane className="w-12 h-12 text-base-300 mx-auto mb-3" />
                <p className="text-base-500 text-sm">No active tracking yet</p>
              </div>
            </div>
          ) : (
            trackers.map((tracker) => <FlightTrackerView key={tracker.id} tracker={tracker} />)
          )}
        </div>

        {/* Documents */}
        <div className="neu-card p-6">
          <h3 className="font-bold text-base-800 mb-4 text-sm uppercase tracking-wider">Documents</h3>
          {documents.length === 0 ? (
            <div className="neu-pressed rounded-2xl text-center py-12">
              <FileText className="w-12 h-12 text-base-300 mx-auto mb-3" />
              <p className="text-base-500 text-sm">No documents on file</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="neu-flat flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-primary-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-base-800 truncate">{doc.fileName}</p>
                      <p className="text-xs text-base-500">
                        {doc.category.replace('_', ' ')} • {(doc.size / 1024).toFixed(0)} KB •{' '}
                        {new Date(doc.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownloadDocument(doc.id, doc.fileName)}
                    className="neu-btn w-9 h-9 flex items-center justify-center rounded-full p-0 shrink-0"
                    aria-label={`Download ${doc.fileName}`}
                  >
                    <Download className="w-4 h-4 text-base-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientPortal;
