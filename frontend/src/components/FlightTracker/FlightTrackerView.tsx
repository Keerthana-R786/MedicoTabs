import React from 'react';
import { FlightTracker, TrackerStage } from '@/types';
import { Check, Clock, AlertCircle, Plane } from 'lucide-react';

interface FlightTrackerViewProps {
  tracker: FlightTracker;
}

const stageLabels: Record<TrackerStage, string> = {
  create_and_route: 'Create & Route',
  acceptance_and_records: 'Acceptance & Records',
  coverage_verification: 'Coverage Verification',
  scheduling_and_attendance: 'Scheduling & Attendance',
  completion_and_archive: 'Completion & Archive',
};

const FlightTrackerView: React.FC<FlightTrackerViewProps> = ({ tracker }) => {
  const getStageIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <Check className="w-4 h-4 text-success-600" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-warning-600 animate-pulse" />;
      case 'failed':
      case 'requires_attention':
        return <AlertCircle className="w-4 h-4 text-danger-600" />;
      default:
        return <Clock className="w-4 h-4 text-base-400" />;
    }
  };

  const getStageStyle = (status: string) => {
    switch (status) {
      case 'completed':
        return 'border-success-400 bg-success-50';
      case 'in_progress':
        return 'border-warning-400 bg-warning-50';
      case 'failed':
      case 'requires_attention':
        return 'border-danger-400 bg-danger-50';
      default:
        return 'border-base-300 bg-base-100';
    }
  };

  const getIconBg = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success-100 shadow-neu-btn';
      case 'in_progress': return 'bg-warning-100 shadow-neu-btn';
      case 'failed':
      case 'requires_attention': return 'bg-danger-100 shadow-neu-btn';
      default: return 'bg-base-200 shadow-neu-btn';
    }
  };

  const urgencyBadge = ({
    Emergency: 'bg-danger-500 text-white',
    Urgent: 'bg-warning-500 text-white',
    Routine: 'bg-primary-500 text-white',
  }[tracker.urgency] || 'bg-base-500 text-white');

  return (
    <div className="neu-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center shadow-neu-btn">
            <Plane className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-base-800">Flight Tracker</h3>
            <p className="text-xs text-base-500">{tracker.visitReason}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`neu-badge ${urgencyBadge}`}>{tracker.urgency}</span>
          {tracker.signedOffAt && (
            <span className="neu-badge bg-success-100 text-success-700">Signed Off</span>
          )}
        </div>
      </div>

      {/* Stages */}
      <div className="space-y-0">
        {tracker.stages.map((stage, index) => (
          <div key={stage.stage} className="relative">
            {/* Connector line */}
            {index < tracker.stages.length - 1 && (
              <div className="absolute left-[22px] top-[44px] w-[2px] h-10 bg-base-300" />
            )}

            <div className={`flex gap-4 p-4 rounded-xl border ${getStageStyle(stage.status)}`}>
              {/* Icon */}
              <div className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center ${getIconBg(stage.status)}`}>
                {getStageIcon(stage.status)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-sm text-base-800">{stageLabels[stage.stage]}</h4>
                  <span className="text-[10px] text-base-400 uppercase tracking-wider">
                    {stage.status.replace('_', ' ')}
                  </span>
                </div>

                {stage.notes && (
                  <p className="text-xs text-base-600 mb-1.5">{stage.notes}</p>
                )}

                <div className="flex gap-4 text-[10px] text-base-400">
                  {stage.startedAt && <span>Started: {new Date(stage.startedAt).toLocaleString()}</span>}
                  {stage.completedAt && <span>Completed: {new Date(stage.completedAt).toLocaleString()}</span>}
                </div>

                {/* Agent actions */}
                {stage.agentActions && stage.agentActions.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-[10px] font-bold text-base-500 uppercase tracking-wider">Agent Actions</p>
                    {stage.agentActions.map((action) => (
                      <div key={action.id} className="neu-pressed rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-base-700">{action.toolName}</span>
                          <span className={`neu-badge ${
                            action.status === 'success' ? 'bg-success-100 text-success-700' :
                            action.status === 'failed' ? 'bg-danger-100 text-danger-700' :
                            'bg-warning-100 text-warning-700'
                          }`}>{action.status}</span>
                        </div>
                        <p className="text-xs text-base-600">{action.description}</p>
                        {action.result && (
                          <p className="text-[10px] text-base-500 mt-1 italic">{action.result}</p>
                        )}
                        <p className="text-[10px] text-base-400 mt-1">{new Date(action.timestamp).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {tracker.workflowRunId && (
        <div className="mt-4 neu-pressed rounded-xl p-3">
          <p className="text-[10px] text-base-500">
            <span className="font-bold">Workflow Run:</span> {tracker.workflowRunId}
          </p>
        </div>
      )}
    </div>
  );
};

export default FlightTrackerView;
