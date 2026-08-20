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
        return <Check className="w-5 h-5 text-success-700" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-warning-500 animate-pulse" />;
      case 'failed':
      case 'requires_attention':
        return <AlertCircle className="w-5 h-5 text-danger-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStageColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success-100 border-success-500';
      case 'in_progress':
        return 'bg-warning-100 border-warning-500';
      case 'failed':
      case 'requires_attention':
        return 'bg-danger-100 border-danger-500';
      default:
        return 'bg-gray-100 border-gray-300';
    }
  };

  const urgencyColor = {
    Emergency: 'bg-danger-500',
    Urgent: 'bg-warning-500',
    Routine: 'bg-primary-500',
  }[tracker.urgency];

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
            <Plane className="w-6 h-6 text-primary-700" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Flight Tracker</h3>
            <p className="text-sm text-gray-600">{tracker.visitReason}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-white text-xs font-semibold ${urgencyColor}`}>
            {tracker.urgency}
          </span>
          {tracker.signedOffAt && (
            <span className="px-3 py-1 rounded-full bg-success-100 text-success-700 text-xs font-semibold">
              Signed Off
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {tracker.stages.map((stage, index) => (
          <div key={stage.stage} className="relative">
            {index < tracker.stages.length - 1 && (
              <div className="absolute left-6 top-12 w-0.5 h-16 bg-gray-200" />
            )}
            
            <div className={`flex gap-4 p-4 rounded-lg border-2 ${getStageColor(stage.status)}`}>
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border-2 border-current">
                  {getStageIcon(stage.status)}
                </div>
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-900">{stageLabels[stage.stage]}</h4>
                  <span className="text-xs text-gray-500 capitalize">{stage.status.replace('_', ' ')}</span>
                </div>

                {stage.notes && (
                  <p className="text-sm text-gray-600 mb-2">{stage.notes}</p>
                )}

                {stage.startedAt && (
                  <p className="text-xs text-gray-500">
                    Started: {new Date(stage.startedAt).toLocaleString()}
                  </p>
                )}

                {stage.completedAt && (
                  <p className="text-xs text-gray-500">
                    Completed: {new Date(stage.completedAt).toLocaleString()}
                  </p>
                )}

                {stage.agentActions && stage.agentActions.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-semibold text-gray-700">Agent Actions:</p>
                    {stage.agentActions.map((action) => (
                      <div key={action.id} className="bg-white p-2 rounded text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-700">{action.toolName}</span>
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            action.status === 'success' ? 'bg-success-100 text-success-700' :
                            action.status === 'failed' ? 'bg-danger-100 text-danger-700' :
                            'bg-warning-100 text-warning-700'
                          }`}>
                            {action.status}
                          </span>
                        </div>
                        <p className="text-gray-600 mt-1">{action.description}</p>
                        {action.result && (
                          <p className="text-gray-500 mt-1 italic">{action.result}</p>
                        )}
                        <p className="text-gray-400 mt-1">{new Date(action.timestamp).toLocaleString()}</p>
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
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500">
            <span className="font-semibold">Workflow Run ID:</span> {tracker.workflowRunId}
          </p>
        </div>
      )}
    </div>
  );
};

export default FlightTrackerView;
