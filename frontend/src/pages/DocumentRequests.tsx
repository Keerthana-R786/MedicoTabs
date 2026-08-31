import React, { useEffect, useState, useRef } from 'react';
import { FileText, Upload, CheckCircle, FolderOpen, X, Paperclip } from 'lucide-react';
import { documentRequestsAPI } from '@/services/api';
import { DocumentRequest, DOCUMENT_RECORD_TYPES } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { formatError, formatSuccess } from '@/utils/messages';
import LoadError from '@/components/ui/LoadError';

const RECORD_LABEL: Record<string, string> = Object.fromEntries(
  DOCUMENT_RECORD_TYPES.map((t) => [t.value, t.label])
);

const STATUS_META: Record<DocumentRequest['status'], { label: string; cls: string }> = {
  requested: { label: 'Awaiting Submission', cls: 'bg-warning-100 text-warning-700' },
  submitted: { label: 'Submitted', cls: 'bg-primary-100 text-primary-700' },
  completed: { label: 'Completed', cls: 'bg-success-100 text-success-700' },
};

const DocumentRequests: React.FC = () => {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoadFailed(false);
    try {
      setRequests(await documentRequestsAPI.getAll());
      setSelectedFiles([]);
    } catch {
      setLoadFailed(true);
    }
  };

  useEffect(() => { load(); }, []);

  const handleRetry = async () => {
    setRetrying(true);
    await load();
    setRetrying(false);
  };

  const onFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles((prev) => [...prev, ...files]);
    e.target.value = '';
  };

  const handleSubmit = async () => {
    if (!selectedId || selectedFiles.length === 0) return;
    setSubmittingId(selectedId);
    try {
      const res = await documentRequestsAPI.submit(selectedId, selectedFiles, 'other');
      const msg = formatSuccess('documents-submitted', `${res.uploadedCount ?? selectedFiles.length} file(s) attached`);
      success(msg.title, msg.description);
      await load();
    } catch (err: any) {
      const msg = formatError(err.message);
      showError(msg.title, msg.description);
    }
    finally { setSubmittingId(null); }
  };

  const handleComplete = async (id: string) => {
    setSubmittingId(id);
    try {
      await documentRequestsAPI.complete(id);
      const msg = formatSuccess('request-completed');
      success(msg.title, msg.description);
      await load();
    } catch (err: any) {
      const msg = formatError(err.message);
      showError(msg.title, msg.description);
    }
    finally { setSubmittingId(null); }
  };

  const selected = requests.find((r) => r.id === selectedId) || null;
  const canSubmit = user?.role === 'primary_doctor' || user?.role === 'coordinator';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Document Requests</h1>
        <p className="text-base-500 mt-1 text-sm">
          {canSubmit
            ? 'Records specialists have requested — upload the requested files to fulfill them'
            : 'Records you have requested from referring doctors'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Queue */}
        <div className="neu-card p-5">
          <h2 className="font-display text-lg font-bold text-base-900 mb-4">Request Queue</h2>
          {loadFailed ? (
            <LoadError title="Couldn’t load document requests" onRetry={handleRetry} retrying={retrying} />
          ) : requests.length === 0 ? (
            <div className="neu-pressed rounded-2xl text-center py-14">
              <FolderOpen className="w-14 h-14 text-base-300 mx-auto mb-3" />
              <p className="text-base-500 text-sm">No document requests</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((r) => {
                const st = STATUS_META[r.status];
                return (
                  <button key={r.id} onClick={() => setSelectedId(r.id)}
                    className={`w-full text-left p-4 rounded-xl transition-all duration-200 ${
                      selectedId === r.id
                        ? 'bg-primary-50 border-2 border-primary-300'
                        : 'neu-flat border-2 border-transparent hover:border-primary-200'
                    }`}>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-sm text-base-800">
                        {r.recordTypes.map((t) => RECORD_LABEL[t] || t).join(', ')}
                      </h3>
                      <span className={`neu-badge ${st.cls}`}>{st.label}</span>
                    </div>
                    <p className="text-xs text-base-500 mb-2">Requested by {r.requestedByName}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-base-400">{new Date(r.createdAt).toLocaleString()}</span>
                      <span className="text-[10px] text-base-400">{r.referralId.slice(0, 8)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail / Submit */}
        <div className="neu-card p-6">
          {selected ? (
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-lg font-bold text-base-900">
                  {selected.recordTypes.map((t) => RECORD_LABEL[t] || t).join(', ')}
                </h2>
                <p className="text-sm text-base-500 mt-1">
                  Requested by <span className="font-semibold text-base-700">{selected.requestedByName}</span>
                </p>
                <span className={`neu-badge ${STATUS_META[selected.status].cls} mt-2 inline-block`}>
                  {STATUS_META[selected.status].label}
                </span>
              </div>

              <div className="neu-pressed rounded-xl p-4">
                <p className="text-[10px] font-bold text-primary-600 uppercase tracking-wider mb-1">Request</p>
                <p className="text-xs text-base-600">Referral: {selected.referralId}</p>
                <p className="text-xs text-base-600">Created: {new Date(selected.createdAt).toLocaleString()}</p>
                {selected.submittedAt && (
                  <p className="text-xs text-base-600">Submitted: {new Date(selected.submittedAt).toLocaleString()}</p>
                )}
              </div>

              {canSubmit && selected.status === 'requested' && (
                <div className="space-y-3">
                  <input ref={fileInputRef} type="file" multiple hidden onChange={onFilesSelected} />
                  <button onClick={() => fileInputRef.current?.click()}
                    className="neu-btn w-full flex items-center justify-center gap-2 py-3 text-sm">
                    <Paperclip className="w-4 h-4" /> Attach files to fulfill request
                  </button>

                  {selectedFiles.length > 0 && (
                    <div className="space-y-2">
                      {selectedFiles.map((f, i) => (
                        <div key={i} className="flex items-center justify-between neu-flat rounded-lg px-3 py-2 text-xs">
                          <span className="text-base-700 truncate">{f.name}</span>
                          <button onClick={() => setSelectedFiles((prev) => prev.filter((_, idx) => idx !== i))}>
                            <X className="w-4 h-4 text-base-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <button onClick={handleSubmit} disabled={selectedFiles.length === 0 || submittingId === selected.id}
                    className="neu-btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
                    <Upload className="w-4 h-4" />
                    {submittingId === selected.id ? 'Uploading...' : 'Submit Documents'}
                  </button>
                  <div className="neu-flat rounded-xl p-3">
                    <p className="text-xs text-base-600 font-medium">
                      Files are stored in the patient's record and the specialist is notified on submission.
                    </p>
                  </div>
                </div>
              )}

              {selected.status === 'submitted' && (
                <div className="flex gap-3">
                  <button onClick={() => handleComplete(selected.id)}
                    disabled={submittingId === selected.id}
                    className="neu-btn-primary flex items-center gap-2 text-xs disabled:opacity-50">
                    <CheckCircle className="w-3.5 h-3.5" />
                    {submittingId === selected.id ? '...' : 'Mark Received & Complete'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="neu-pressed rounded-2xl text-center py-16">
              <FileText className="w-14 h-14 text-base-300 mx-auto mb-3" />
              <p className="text-base-500 text-sm">Select a request to view or fulfill</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentRequests;
