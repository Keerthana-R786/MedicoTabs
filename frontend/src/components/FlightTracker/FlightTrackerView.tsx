import React from 'react';
import { FlightTracker, FlightTrackerStage, TrackerStage } from '@/types';
import { Check, Clock, AlertCircle, Plane } from 'lucide-react';

interface FlightTrackerViewProps {
  tracker: Pick<FlightTracker, 'visitReason' | 'urgency' | 'stages' | 'signedOffAt' | 'workflowRunId'>;
}

const stageLabels: Record<TrackerStage, string> = {
  create_and_route: 'Create & Route',
  acceptance_and_records: 'Acceptance & Records',
  coverage_verification: 'Coverage Verification',
  scheduling_and_attendance: 'Scheduling & Attendance',
  completion_and_archive: 'Completion & Archive',
};

/**
 * Once the journey is signed off, every checkpoint has necessarily been
 * passed — even if an intermediate stage never got its own status update.
 * Without this, a completed/signed-off tracker can render with earlier
 * stages stuck at "pending", which reads as broken rather than finished.
 */
function getEffectiveStages(stages: FlightTrackerStage[], isFullyDone: boolean): FlightTrackerStage[] {
  if (!isFullyDone) return stages;
  return stages.map((s) => (s.status === 'completed' ? s : { ...s, status: 'completed' as const }));
}

const FlightTrackerView: React.FC<FlightTrackerViewProps> = ({ tracker }) => {
  // The last checkpoint reaching "completed" is itself proof the whole path
  // was traversed — more reliable than the separate signedOffAt column,
  // which can lag behind (e.g. a stage note says "sign-off received" while
  // the tracker row's timestamp was never populated).
  const lastStage = tracker.stages[tracker.stages.length - 1];
  const isFullyDone = !!tracker.signedOffAt || lastStage?.status === 'completed';
  const stages = getEffectiveStages(tracker.stages, isFullyDone);

  const completedCount = stages.filter((s) => s.status === 'completed').length;
  const progressPercent = stages.length ? Math.round((completedCount / stages.length) * 100) : 0;
  const currentStageIndex = Math.max(0, Math.min(completedCount, stages.length - 1));

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

  const getIconBg = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success-100 shadow-neu-btn';
      case 'in_progress': return 'bg-warning-100 shadow-neu-btn';
      case 'failed':
      case 'requires_attention': return 'bg-danger-100 shadow-neu-btn';
      default: return 'bg-base-200 shadow-neu-btn';
    }
  };

  const getRowHighlight = (status: string) => {
    switch (status) {
      case 'in_progress': return 'bg-warning-50 -mx-3 px-3 py-2 rounded-xl';
      case 'failed':
      case 'requires_attention': return 'bg-danger-50 -mx-3 px-3 py-2 rounded-xl';
      default: return '';
    }
  };

  const getLineColor = (status: string) => {
    if (status === 'completed') return 'bg-success-400';
    if (status === 'failed' || status === 'requires_attention') return 'bg-danger-300';
    return 'bg-base-300';
  };

  const urgencyBadge = ({
    Emergency: 'bg-danger-500 text-white',
    Urgent: 'bg-warning-500 text-white',
    Routine: 'bg-primary-500 text-white',
  }[tracker.urgency] || 'bg-base-500 text-white');

  return (
    <div className="neu-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
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

      {/* Overall progress */}
      {stages.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-base-600">
              {progressPercent === 100
                ? 'Journey complete'
                : `Stage ${currentStageIndex + 1} of ${stages.length} — ${stageLabels[stages[currentStageIndex].stage]}`}
            </span>
            <span className="text-xs font-bold text-primary-600">{progressPercent}%</span>
          </div>
          <div className="h-2 rounded-full bg-base-200 shadow-neu-pressed-sm overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary-400 to-success-400 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {stages.length === 0 && (
        <div className="neu-pressed rounded-2xl text-center py-8 mb-2">
          <p className="text-base-500 text-sm">No stages recorded for this tracker yet</p>
        </div>
      )}

      {/* Stages — continuous rail, height self-stretches with content (no hardcoded offsets) */}
      <div className="flex flex-col">
        {stages.map((stage, index) => {
          const isLast = index === stages.length - 1;
          return (
            <div key={stage.stage} className="flex gap-4">
              {/* Rail: icon + connecting line, stretches to match content column height */}
              <div className="flex flex-col items-center w-11 shrink-0">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${getIconBg(stage.status)}`}>
                  {getStageIcon(stage.status)}
                </div>
                {!isLast && <div className={`w-[2px] flex-1 min-h-[16px] my-1 rounded-full ${getLineColor(stage.status)}`} />}
              </div>

              {/* Content */}
              <div className={`flex-1 min-w-0 pb-6 ${getRowHighlight(stage.status)}`}>
                <div className="flex items-center justify-between mb-1 gap-2">
                  <h4 className="font-bold text-sm text-base-800">{stageLabels[stage.stage]}</h4>
                  <span className="text-[10px] text-base-400 uppercase tracking-wider shrink-0">
                    {stage.status.replace('_', ' ')}
                  </span>
                </div>

                {stage.notes && stage.stage === 'coverage_verification' ? (
                  <span className={`neu-badge inline-block mb-1.5 ${
                    stage.notes === 'Cannot be claimed' ? 'bg-danger-100 text-danger-700' : 'bg-success-100 text-success-700'
                  }`}>{stage.notes}</span>
                ) : stage.notes && (
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
          );
        })}
      </div>

      {tracker.workflowRunId && (
        <div className="mt-1 neu-pressed rounded-xl p-3">
          <p className="text-[10px] text-base-500">
            <span className="font-bold">Workflow Run:</span> {tracker.workflowRunId}
          </p>
        </div>
      )}
    </div>
  );
};

export default FlightTrackerView;
