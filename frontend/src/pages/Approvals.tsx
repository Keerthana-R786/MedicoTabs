import React, { useEffect, useState } from 'react';
import { CheckCircle, Clock } from 'lucide-react';
import { hitlAPI } from '@/services/api';
import { HITLApprovalRequest } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { formatError, formatSuccess } from '@/utils/messages';

const Approvals: React.FC = () => {
  const [approvals, setApprovals] = useState<HITLApprovalRequest[]>([]);
  const [selected, setSelected] = useState<HITLApprovalRequest | null>(null);
  const [customResponse, setCustomResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { success, error: showError } = useToast();

  useEffect(() => { loadApprovals(); }, []);

  const loadApprovals = async () => { setApprovals(await hitlAPI.getPending()); };

  const handleRespond = async (optionId?: string) => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await hitlAPI.respond(selected.requestId, optionId, customResponse || undefined);
      const msg = formatSuccess('approval-submitted');
      success(msg.title, msg.description);
      await loadApprovals();
      setSelected(null);
      setCustomResponse('');
    } catch (err: any) {
      const msg = formatError(err.message);
      showError(msg.title, msg.description);
    }
    finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Pending Approvals</h1>
        <p className="text-base-500 mt-1 text-sm">Review and respond to workflow approval requests</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Queue */}
        <div className="neu-card p-5">
          <h2 className="font-display text-lg font-bold text-base-900 mb-4">Approval Queue</h2>
          <div className="space-y-3">
            {approvals.map((a) => (
              <button key={a.id} onClick={() => setSelected(a)}
                className={`w-full text-left p-4 rounded-xl transition-all duration-200 ${
                  selected?.id === a.id
                    ? 'bg-primary-50   border-2 border-primary-300'
                    : 'neu-flat border-2 border-transparent hover:border-primary-200'
                }`}>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-sm text-base-800">{a.title}</h3>
                  <Clock className="w-4 h-4 text-warning-500 flex-shrink-0" />
                </div>
                <p className="text-xs text-base-500 mb-2">{a.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-base-400">{new Date(a.receivedAt).toLocaleString()}</span>
                  {a.referralId && (
                    <span className="neu-badge bg-base-300 text-base-600">{a.referralId}</span>
                  )}
                </div>
              </button>
            ))}
            {approvals.length === 0 && (
              <div className="neu-pressed rounded-2xl text-center py-14">
                <CheckCircle className="w-14 h-14 text-base-300 mx-auto mb-3" />
                <p className="text-base-500 text-sm">No pending approvals</p>
              </div>
            )}
          </div>
        </div>

        {/* Detail / Respond */}
        <div className="neu-card p-6">
          {selected ? (
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-lg font-bold text-base-900">{selected.title}</h2>
                <p className="text-sm text-base-500 mt-1">{selected.description}</p>
              </div>

              <div className="neu-pressed rounded-xl p-4">
                <p className="text-[10px] font-bold text-primary-600 uppercase tracking-wider mb-1">Workflow Info</p>
                <p className="text-xs text-base-600">Run: {selected.workflowRunId}</p>
                <p className="text-xs text-base-600">Request: {selected.requestId}</p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-base-500 uppercase tracking-wider mb-3">Select Response</p>
                <div className="space-y-2">
                  {selected.options.map((opt) => (
                    <button key={opt.optionId} onClick={() => handleRespond(opt.optionId)}
                      disabled={submitting}
                      className="neu-btn w-full text-left p-4 disabled:opacity-50">
                      <p className="font-semibold text-sm text-base-800">{opt.title}</p>
                      {opt.description && <p className="text-xs text-base-500 mt-1">{opt.description}</p>}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-base-500 mb-1.5 uppercase tracking-wider">Custom Response</label>
                <textarea value={customResponse} onChange={(e) => setCustomResponse(e.target.value)}
                  className="neu-input w-full resize-none" rows={3} placeholder="Optional custom response..." />
                <button onClick={() => handleRespond()} disabled={!customResponse || submitting}
                  className="neu-btn-primary mt-3 w-full disabled:opacity-50">
                  {submitting ? 'Submitting...' : 'Submit Custom Response'}
                </button>
              </div>

              <div className="neu-flat rounded-xl p-3">
                <p className="text-xs text-base-600 font-medium">
                  Your response goes to YOXA and cannot be changed.
                </p>
              </div>
            </div>
          ) : (
            <div className="neu-pressed rounded-2xl text-center py-16">
              <CheckCircle className="w-14 h-14 text-base-300 mx-auto mb-3" />
              <p className="text-base-500 text-sm">Select an approval to respond</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Approvals;
