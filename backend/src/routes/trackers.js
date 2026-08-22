import express from 'express';
import { supabase } from '../config/database.js';
import { requireDoctorAuth } from '../middleware/doctorAuth.js';

const router = express.Router();
router.use(requireDoctorAuth);

/** Mirrors the stage set referrals.js seeds, for trackers created directly
 * (not via a referral) — e.g. "Start Tracking a Visit" on a patient chart. */
function defaultStages() {
  return [
    { stage: 'create_and_route', status: 'in_progress', startedAt: new Date().toISOString(), agentActions: [] },
    { stage: 'acceptance_and_records', status: 'pending', agentActions: [] },
    { stage: 'scheduling_and_attendance', status: 'pending', agentActions: [] },
    { stage: 'completion_and_archive', status: 'pending', agentActions: [] },
  ];
}

/**
 * GET /api/trackers/:id
 * Get flight tracker by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('flight_trackers')
      .select('*')
      .eq('id', req.params.id)
      .single();
    
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Tracker not found' });
    
    // Transform to camelCase
    const tracker = {
      id: data.id,
      patientId: data.patient_id,
      visitReason: data.visit_reason,
      urgency: data.urgency,
      currentStage: data.current_stage,
      stages: data.stages,
      startedAt: data.started_at,
      completedAt: data.completed_at,
      signedOffBy: data.signed_off_by,
      signedOffAt: data.signed_off_at,
      workflowRunId: data.workflow_run_id,
    };
    
    res.json(tracker);
  } catch (error) {
    console.error('Error fetching tracker:', error);
    res.status(500).json({ error: 'Failed to fetch tracker' });
  }
});

/**
 * POST /api/trackers
 * Create new flight tracker
 */
router.post('/', async (req, res) => {
  try {
    // Map camelCase to snake_case
    const trackerData = {
      patient_id: req.body.patientId,
      visit_reason: req.body.visitReason,
      urgency: req.body.urgency,
      current_stage: req.body.currentStage || 'create_and_route',
      stages: (req.body.stages && req.body.stages.length > 0) ? req.body.stages : defaultStages(),
      workflow_run_id: req.body.workflowRunId,
      started_at: new Date().toISOString(),
    };
    
    const { data, error } = await supabase
      .from('flight_trackers')
      .insert(trackerData)
      .select()
      .single();
    
    if (error) throw error;
    
    // Transform back to camelCase
    const tracker = {
      id: data.id,
      patientId: data.patient_id,
      visitReason: data.visit_reason,
      urgency: data.urgency,
      currentStage: data.current_stage,
      stages: data.stages,
      startedAt: data.started_at,
      workflowRunId: data.workflow_run_id,
    };
    
    res.status(201).json(tracker);
  } catch (error) {
    console.error('Error creating tracker:', error);
    res.status(500).json({ error: 'Failed to create tracker' });
  }
});

/**
 * PUT /api/trackers/:id
 * Update flight tracker
 */
router.put('/:id', async (req, res) => {
  try {
    const b = req.body;
    const updateData = {};
    if (b.currentStage !== undefined) updateData.current_stage = b.currentStage;
    if (b.stages !== undefined) updateData.stages = b.stages;
    if (b.visitReason !== undefined) updateData.visit_reason = b.visitReason;
    if (b.urgency !== undefined) updateData.urgency = b.urgency;
    if (b.completedAt !== undefined) updateData.completed_at = b.completedAt;

    const { data, error } = await supabase
      .from('flight_trackers')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      id: data.id,
      patientId: data.patient_id,
      visitReason: data.visit_reason,
      urgency: data.urgency,
      currentStage: data.current_stage,
      stages: data.stages,
      startedAt: data.started_at,
      completedAt: data.completed_at,
      signedOffBy: data.signed_off_by,
      signedOffAt: data.signed_off_at,
      workflowRunId: data.workflow_run_id,
    });
  } catch (error) {
    console.error('Error updating tracker:', error);
    res.status(500).json({ error: 'Failed to update tracker' });
  }
});

/**
 * POST /api/trackers/:id/signoff
 * Doctor sign-off on tracker
 */
router.post('/:id/signoff', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('flight_trackers')
      .update({
        signed_off_by: req.userId,
        signed_off_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      id: data.id,
      patientId: data.patient_id,
      visitReason: data.visit_reason,
      urgency: data.urgency,
      currentStage: data.current_stage,
      stages: data.stages,
      startedAt: data.started_at,
      completedAt: data.completed_at,
      signedOffBy: data.signed_off_by,
      signedOffAt: data.signed_off_at,
      workflowRunId: data.workflow_run_id,
    });
  } catch (error) {
    console.error('Error signing off tracker:', error);
    res.status(500).json({ error: 'Failed to sign off tracker' });
  }
});

export default router;
