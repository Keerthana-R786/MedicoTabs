import express from 'express';
import { supabase } from '../config/database.js';
import { requireDoctorAuth } from '../middleware/doctorAuth.js';
import { advanceTrackerStage, buildAgentAction } from '../utils/trackerStages.js';

const router = express.Router();
router.use(requireDoctorAuth);

/**
 * POST /api/referrals/:id/document-requests
 * Specialist requests specific named documents from the primary doctor.
 */
router.post('/referrals/:id/document-requests', async (req, res) => {
  try {
    const { items, note } = req.body;

    if (!Array.isArray(items) || items.filter((i) => typeof i === 'string' && i.trim()).length === 0) {
      return res.status(400).json({ error: 'At least one requested item is required' });
    }

    const { data: referral, error: findError } = await supabase
      .from('referrals')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (findError || !referral) return res.status(404).json({ error: 'Referral not found' });
    if (!referral.primary_doctor_id) {
      return res.status(400).json({ error: 'This referral has no primary doctor to request documents from' });
    }

    const requesterName = `${req.user.first_name} ${req.user.last_name}`;
    const cleanItems = items.map((i) => String(i).trim()).filter(Boolean);

    const { data: request, error } = await supabase
      .from('document_requests')
      .insert({
        referral_id: referral.id,
        patient_id: referral.patient_id,
        requested_by: req.userId,
        requested_by_name: requesterName,
        requested_from: referral.primary_doctor_id,
        items: cleanItems,
        note: note || null,
      })
      .select()
      .single();
    if (error) throw error;

    await supabase.from('notifications').insert({
      user_id: referral.primary_doctor_id,
      type: 'referral',
      title: 'Documents requested',
      message: `${requesterName} requested ${cleanItems.length} document(s) for referral ${referral.referral_number}: ${cleanItems.join(', ')}`,
      referral_id: referral.id,
    });

    await advanceTrackerStage(referral.tracker_id, 'acceptance_and_records', {
      agentAction: buildAgentAction('document_request_notice', {
        description: `${requesterName} requested: ${cleanItems.join(', ')}`,
        result: 'Sent to primary doctor',
      }),
    });

    res.status(201).json(toPublicRequest(request));
  } catch (error) {
    console.error('Error creating document request:', error);
    res.status(500).json({ error: 'Failed to create document request' });
  }
});

/**
 * GET /api/referrals/:id/document-requests
 * Both the requesting specialist and the primary doctor read this.
 */
router.get('/referrals/:id/document-requests', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('document_requests')
      .select('*')
      .eq('referral_id', req.params.id)
      .order('created_at', { ascending: false });
    if (error) throw error;

    res.json((data || []).map(toPublicRequest));
  } catch (error) {
    console.error('Error fetching document requests:', error);
    res.status(500).json({ error: 'Failed to fetch document requests' });
  }
});

/**
 * GET /api/patients/:patientId/document-requests
 * Primary doctor's "requested documents" panel, scoped to a patient rather
 * than one referral at a time.
 */
router.get('/patients/:patientId/document-requests', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('document_requests')
      .select('*')
      .eq('patient_id', req.params.patientId)
      .order('created_at', { ascending: false });
    if (error) throw error;

    res.json((data || []).map(toPublicRequest));
  } catch (error) {
    console.error('Error fetching document requests for patient:', error);
    res.status(500).json({ error: 'Failed to fetch document requests' });
  }
});

/**
 * POST /api/document-requests/:id/fulfill
 * Primary doctor marks a request fulfilled, optionally linking the
 * patient_documents rows that satisfy it.
 */
router.post('/document-requests/:id/fulfill', async (req, res) => {
  try {
    const { documentIds } = req.body;

    const { data: request, error: findError } = await supabase
      .from('document_requests')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (findError || !request) return res.status(404).json({ error: 'Document request not found' });

    const { data: updated, error } = await supabase
      .from('document_requests')
      .update({
        status: 'fulfilled',
        fulfilled_document_ids: Array.isArray(documentIds) ? documentIds : null,
        fulfilled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;

    if (request.requested_by) {
      await supabase.from('notifications').insert({
        user_id: request.requested_by,
        type: 'referral',
        title: 'Requested documents ready',
        message: `The requested documents (${request.items.join(', ')}) have been uploaded.`,
        referral_id: request.referral_id,
      });
    }

    res.json(toPublicRequest(updated));
  } catch (error) {
    console.error('Error fulfilling document request:', error);
    res.status(500).json({ error: 'Failed to fulfill document request' });
  }
});

function toPublicRequest(row) {
  return {
    id: row.id,
    referralId: row.referral_id,
    patientId: row.patient_id,
    requestedBy: row.requested_by,
    requestedByName: row.requested_by_name,
    requestedFrom: row.requested_from,
    items: row.items,
    note: row.note,
    status: row.status,
    fulfilledDocumentIds: row.fulfilled_document_ids,
    fulfilledAt: row.fulfilled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export default router;
