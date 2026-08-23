import { supabase } from '../config/database.js';

/**
 * Advances (or annotates) a single stage on a referral's flight tracker.
 * Every YOXA tool call and specialist action that corresponds to a tracker
 * stage should go through this so the tracker reflects the workflow as it
 * runs, instead of only the hand-picked steps that used to patch it inline.
 *
 * No-ops if the tracker or the named stage doesn't exist (e.g.
 * coverage_verification is absent for general checkups) — callers don't
 * need to guard every call site.
 */
export async function advanceTrackerStage(trackerId, stageKey, {
  status,
  notes,
  agentAction,
  extra = {},
  autoStartNext = true,
} = {}) {
  if (!trackerId) return null;

  const { data: tracker } = await supabase
    .from('flight_trackers')
    .select('*')
    .eq('id', trackerId)
    .single();
  if (!tracker) return null;

  const now = new Date().toISOString();
  const stages = tracker.stages || [];
  const stageIndex = stages.findIndex((s) => s.stage === stageKey);
  if (stageIndex === -1) return null;

  const terminal = status === 'completed' || status === 'failed' || status === 'requires_attention';

  const updatedStages = stages.map((stage, idx) => {
    if (idx !== stageIndex) return stage;
    return {
      ...stage,
      ...extra,
      status: status || stage.status,
      startedAt: stage.startedAt || now,
      completedAt: terminal ? now : stage.completedAt,
      notes: notes !== undefined ? notes : stage.notes,
      agentActions: agentAction ? [...(stage.agentActions || []), agentAction] : stage.agentActions,
    };
  });

  // Completing a stage kicks off the next pending one so the progress bar
  // advances live as YOXA works through the referral, instead of sitting on
  // "pending" until something unrelated happens to touch it.
  if (autoStartNext && status === 'completed') {
    const next = updatedStages[stageIndex + 1];
    if (next && next.status === 'pending') {
      updatedStages[stageIndex + 1] = { ...next, status: 'in_progress', startedAt: next.startedAt || now };
    }
  }

  await supabase.from('flight_trackers').update({ stages: updatedStages }).eq('id', trackerId);
  return updatedStages;
}

/** Builds a consistent agentAction entry for a YOXA tool call. */
export function buildAgentAction(toolName, { status = 'success', description, result } = {}) {
  return {
    id: `action-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    toolName,
    timestamp: new Date().toISOString(),
    status,
    description,
    result,
  };
}
