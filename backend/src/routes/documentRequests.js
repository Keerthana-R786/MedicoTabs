import express from 'express';
import multer from 'multer';
import { supabase } from '../config/database.js';
import { requireDoctorAuth } from '../middleware/doctorAuth.js';

const router = express.Router();
router.use(requireDoctorAuth);

const DOCUMENTS_BUCKET = 'patient-documents';
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function asUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value) ? value : null;
}

const RECORD_TYPES = ['lab_result', 'imaging', 'prescription', 'referral', 'medical_history', 'other'];

const DOC_REQUEST_LABELS = {
  lab_result: 'Lab Result',
  imaging: 'Imaging / Scan',
  prescription: 'Prescription',
  referral: 'Referral Letter',
  medical_history: 'Medical History',
  other: 'Other Record',
};

function toPublic(r) {
  return {
    id: r.id,
    referralId: r.referral_id,
    patientId: r.patient_id,
    requestedBy: r.requested_by,
    requestedByName: r.requested_by_name,
    recordTypes: r.record_types || [],
    status: r.status,
    documents: r.documents || [],
    createdAt: r.created_at,
    submittedAt: r.submitted_at,
    completedAt: r.completed_at,
  };
}

/**
 * POST /api/document-requests
 * A specialist creates a document request listing the record types they need.
 */
router.post('/', async (req, res) => {
  try {
    const { referralId, patientId, recordTypes } = req.body;

    if (!referralId || !Array.isArray(recordTypes) || recordTypes.length === 0) {
      return res.status(400).json({
        error: 'referralId and recordTypes (non-empty array) are required',
      });
    }

    // Specialist must be the one requesting (primary/coordinator shouldn't request
    // records from themselves). Allow specialist_doctor only.
    if (req.user.role !== 'specialist_doctor') {
      return res.status(403).json({ error: 'Only a specialist can request documents' });
    }

    const cleanTypes = recordTypes
      .filter((t) => RECORD_TYPES.includes(t))
      .map((t) => t);

    if (cleanTypes.length === 0) {
      return res.status(400).json({ error: 'No valid record types provided' });
    }

    const { data, error } = await supabase
      .from('document_requests')
      .insert({
        referral_id: asUuid(referralId),
        patient_id: asUuid(patientId) || null,
        requested_by: req.userId,
        requested_by_name: `${req.user.first_name} ${req.user.last_name}`,
        record_types: cleanTypes,
        status: 'requested',
      })
      .select()
      .single();

    if (error) {
      console.error('Create document request error:', error);
      return res.status(500).json({ error: 'Failed to create document request', details: error.message });
    }

    // Notify the referring doctor and coordinators in-app.
    const { data: referral } = await supabase
      .from('referrals')
      .select('primary_doctor_id')
      .eq('id', asUuid(referralId))
      .maybeSingle();

    const recipients = [referral?.primary_doctor_id];
    const { data: coordinators } = await supabase.from('users').select('id').eq('role', 'coordinator');
    (coordinators || []).forEach((c) => recipients.push(c.id));

    const items = cleanTypes.map((t) => DOC_REQUEST_LABELS[t] || t).join(', ');
    const message = `${req.user.first_name} ${req.user.last_name} requested the following records: ${items}.`;

    recipients.forEach((uid) => {
      if (!asUuid(uid)) return;
      supabase.from('notifications').insert({
        user_id: uid,
        type: 'message',
        title: 'Document Request',
        message,
        referral_id: asUuid(referralId),
        is_read: false,
      });
    });

    res.status(201).json(toPublic(data));
  } catch (error) {
    console.error('Create document request error:', error);
    res.status(500).json({ error: 'Failed to create document request', details: error.message });
  }
});

/**
 * GET /api/document-requests
 * List document requests scoped to the caller.
 * - Specialist: requests they made.
 * - Primary doctor / coordinator: requests on referrals they own / oversee.
 */
router.get('/', async (req, res) => {
  try {
    let data;
    if (req.user.role === 'specialist_doctor') {
      const { data: rows } = await supabase
        .from('document_requests')
        .select('*')
        .eq('requested_by', req.userId)
        .order('created_at', { ascending: false });
      data = rows;
    } else {
      // Primary doctor: referrals where they are the primary doctor.
      // Coordinator: all referrals.
      let query = supabase
        .from('document_requests')
        .select('*, referrals!inner(primary_doctor_id)');
      if (req.user.role === 'primary_doctor') {
        query = query.eq('referrals.primary_doctor_id', req.userId);
      }
      const { data: rows, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      data = rows;
    }

    res.json((data || []).map(toPublic));
  } catch (error) {
    console.error('List document requests error:', error);
    res.status(500).json({ error: 'Failed to fetch document requests' });
  }
});

/**
 * POST /api/document-requests/:id/submit
 * Primary doctor / coordinator uploads the requested documents (multipart files)
 * against the request, attaching the created patient_documents.
 */
router.post('/:id/submit', upload.array('files', 10), async (req, res) => {
  try {
    if (req.user.role === 'specialist_doctor') {
      return res.status(403).json({ error: 'Only a primary doctor or coordinator can submit documents' });
    }

    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const { data: requestRow, error: findError } = await supabase
      .from('document_requests')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (findError || !requestRow) {
      return res.status(404).json({ error: 'Document request not found' });
    }

    if (requestRow.status === 'completed') {
      return res.status(400).json({ error: 'This document request is already completed' });
    }

    const patientId = requestRow.patient_id;
    if (!asUuid(patientId)) {
      return res.status(400).json({ error: 'No patient linked to this request' });
    }

    // Upload each file to storage and record metadata.
    const docIds = [];
    for (const file of files) {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${patientId}/${Date.now()}-${safeName}`;
      const { error: upError } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .upload(storagePath, file.buffer, { contentType: file.mimetype, upsert: false });
      if (upError) {
        console.error('Storage upload error:', upError.message);
        continue;
      }
      const { data: doc, error: insError } = await supabase
        .from('patient_documents')
        .insert({
          patient_id: patientId,
          file_name: file.originalname,
          file_type: file.mimetype,
          file_url: storagePath,
          category: req.body.category || 'other',
          uploaded_by: req.userId,
          size: file.size,
          uploaded_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (!insError && doc) docIds.push(doc.id);
    }

    if (docIds.length === 0) {
      return res.status(500).json({ error: 'Failed to upload any documents' });
    }

    const merged = [...(requestRow.documents || []), ...docIds];
    const { data: updated, error: updError } = await supabase
      .from('document_requests')
      .update({
        documents: merged,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .eq('id', requestRow.id)
      .select()
      .single();

    if (updError) throw updError;

    // Notify the requesting specialist.
    if (asUuid(requestRow.requested_by)) {
      await supabase.from('notifications').insert({
        user_id: requestRow.requested_by,
        type: 'message',
        title: 'Documents Submitted',
        message: `${req.user.first_name} ${req.user.last_name} submitted ${docIds.length} requested document(s).`,
        referral_id: requestRow.referral_id,
        is_read: false,
      });
    }

    res.json({ ...toPublic(updated), uploadedCount: docIds.length });
  } catch (error) {
    console.error('Submit document request error:', error);
    res.status(500).json({ error: 'Failed to submit documents', details: error.message });
  }
});

/**
 * POST /api/document-requests/:id/complete
 * Specialist marks the submitted documents as reviewed/complete.
 */
router.post('/:id/complete', async (req, res) => {
  try {
    if (req.user.role !== 'specialist_doctor') {
      return res.status(403).json({ error: 'Only the requesting specialist can complete a request' });
    }

    const { data: requestRow, error: findError } = await supabase
      .from('document_requests')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (findError || !requestRow) {
      return res.status(404).json({ error: 'Document request not found' });
    }

    if (requestRow.requested_by !== req.userId) {
      return res.status(403).json({ error: 'Not your document request' });
    }

    const { data: updated, error } = await supabase
      .from('document_requests')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', requestRow.id)
      .select()
      .single();

    if (error) throw error;

    res.json(toPublic(updated));
  } catch (error) {
    console.error('Complete document request error:', error);
    res.status(500).json({ error: 'Failed to complete document request' });
  }
});

export default router;
export { DOC_REQUEST_LABELS };
