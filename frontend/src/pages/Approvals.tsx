import React, { useEffect, useState } from 'react';
import { CheckCircle, Clock } from 'lucide-react';
import { mockHITLAPI } from '@/services/mockAPI';
import { HITLApprovalRequest } from '@/types';

const Approvals: React.FC = () => {
  const [approvals, setApprovals] = useState<HITLApprovalRequest[]>([]);
  const [selectedApproval, setSelectedApproval] = useState<HITLApprovalRequest | null>(null);
  const [customResponse, setCustomResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadApprovals();
  }, []);

  const loadApprovals = async () => {
    const data = await mockHITLAPI.getPending();
    setApprovals(data);
  };

  const handleRespond = async (selectedOptionId?: string) => {
    if (!selectedApproval) return;
    setSubmitting(true);

    try {
      await mockHITLAPI.respond(
        selectedApproval.requestId,
        selectedOptionId,
        customResponse || undefined
      );
      alert('Response submitted successfully! The workflow will now continue.');
      await loadApprovals();
      setSelectedApproval(null);
      setCustomResponse('');
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Pending Approvals</h1>
        <p className="text-gray-600 mt-1">Review and respond to workflow approval requests</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Approval Queue</h2>
          
          <div className="space-y-3">
            {approvals.map((approval) => (
              <div
                key={approval.id}
                onClick={() => setSelectedApproval(approval)}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedApproval?.id === approval.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-primary-300'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{approval.title}</h3>
                  <Clock className="w-5 h-5 text-warning-500" />
                </div>
                <p className="text-sm text-gray-600 mb-2">{approval.description}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>Received: {new Date(approval.receivedAt).toLocaleString()}</span>
                </div>
                {approval.referralId && (
                  <div className="mt-2">
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                      Referral ID: {approval.referralId}
                    </span>
                  </div>
                )}
              </div>
            ))}

            {approvals.length === 0 && (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No pending approvals</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          {selectedApproval ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">{selectedApproval.title}</h2>
                <p className="text-gray-600">{selectedApproval.description}</p>
              </div>

              <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                <p className="text-sm text-primary-800 font-medium mb-1">Workflow Information</p>
                <p className="text-xs text-primary-700">Run ID: {selectedApproval.workflowRunId}</p>
                <p className="text-xs text-primary-700">Request ID: {selectedApproval.requestId}</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Select Your Response</h3>
                <div className="space-y-2">
                  {selectedApproval.options.map((option) => (
                    <button
                      key={option.optionId}
                      onClick={() => handleRespond(option.optionId)}
                      disabled={submitting}
                      className="w-full p-4 text-left border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all disabled:opacity-50"
                    >
                      <p className="font-medium text-gray-900">{option.title}</p>
                      {option.description && (
                        <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Or Provide Custom Response
                </label>
                <textarea
                  value={customResponse}
                  onChange={(e) => setCustomResponse(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={4}
                  placeholder="Enter your custom response..."
                />
                <button
                  onClick={() => handleRespond()}
                  disabled={!customResponse || submitting}
                  className="mt-3 w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Custom Response'}
                </button>
              </div>

              <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
                <p className="text-sm text-warning-800">
                  ⚠️ Your response will be sent to YOXA and cannot be changed. The workflow will resume immediately.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">Select an approval from the queue to respond</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Approvals;
