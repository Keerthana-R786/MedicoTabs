import express from 'express';
import multer from 'multer';
import { supabase } from '../config/database.js';
import { requireDoctorAuth } from '../middleware/doctorAuth.js';

const router = express.Router();
router.use(requireDoctorAuth);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const DOCUMENTS_BUCKET = 'patient-documents';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function asUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value) ? value : null;
}

function toPublicTracker(t) {
  return {
    id: t.id,
    patientId: t.patient_id,
    visitReason: t.visit_reason,
    urgency: t.urgency,
    currentStage: t.current_stage,
    stages: t.stages,
    startedAt: t.started_at,
    completedAt: t.completed_at,
    signedOffBy: t.signed_off_by,
    signedOffAt: t.signed_off_at,
    workflowRunId: t.workflow_run_id,
  };
}

function toPublicDocument(row) {
  return {
    id: row.id,
    patientId: row.patient_id,
    fileName: row.file_name,
    fileType: row.file_type,
    fileUrl: row.file_url,
    category: row.category,
    uploadedBy: row.uploaded_by,
    uploadedAt: row.uploaded_at,
    size: row.size,
  };
}

/**
 * GET /api/patients
 * Get all patients
 */
router.get('/', async (req, res) => {
  try {
    let query = supabase.from('patients').select('*').order('created_at', { ascending: false });

    if (req.user.role === 'specialist_doctor') {
      // A specialist sees patients tied to referrals they've accepted, ones
      // still unclaimed and matching their specialty, plus legacy referrals
      // in their specialty that predate specialist_id being tracked.
      const orParts = [`specialist_id.eq.${req.userId}`];
      if (req.user.specialization) {
        orParts.push(`and(status.eq.routed,requested_specialty.eq.${req.user.specialization})`);
        orParts.push(`and(specialist_id.is.null,requested_specialty.eq.${req.user.specialization})`);
      }
      const { data: refRows, error: refErr } = await supabase
        .from('referrals')
        .select('patient_id')
        .or(orParts.join(','));
      if (refErr) throw refErr;

      const patientIds = [...new Set((refRows || []).map((r) => r.patient_id))];
      if (patientIds.length === 0) return res.json([]);
      query = query.in('id', patientIds);
    } else if (req.user.role === 'coordinator') {
      // Coordinators oversee patients across the whole practice — no
      // ownership filter.
    } else {
      // Legacy patients created before ownership was tracked have no
      // primary_doctor_id — keep them visible to any primary doctor rather
      // than orphaning them.
      query = query.or(`primary_doctor_id.eq.${req.userId},primary_doctor_id.is.null`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch patients', 
        details: error.message,
        hint: error.hint 
      });
    }
    
    // Transform snake_case to camelCase for frontend
    const transformedData = (data || []).map(patient => ({
      id: patient.id,
      referralId: patient.referral_id,
      firstName: patient.first_name,
      lastName: patient.last_name,
      dateOfBirth: patient.date_of_birth,
      gender: patient.gender,
      contactNumber: patient.contact_number,
      email: patient.email,
      address: patient.address,
      bloodGroup: patient.blood_group,
      allergies: patient.allergies,
      insurance: patient.insurance,
      primaryDoctorId: patient.primary_doctor_id,
      createdAt: patient.created_at,
      updatedAt: patient.updated_at
    }));
    
    res.json(transformedData);
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ 
      error: 'Failed to fetch patients',
      details: error.message 
    });
  }
});

/**
 * GET /api/patients/search
 * Search patients by name, referral ID, or contact
 */
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }
    
    const searchTerm = `%${q}%`;

    let query = supabase
      .from('patients')
      .select('*')
      .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},referral_id.ilike.${searchTerm},contact_number.like.${searchTerm}`)
      .order('created_at', { ascending: false });

    if (req.user.role === 'primary_doctor') {
      // Legacy patients created before ownership was tracked have no
      // primary_doctor_id — keep them visible to any primary doctor.
      // Coordinators and specialists get unfiltered search results here
      // (coordinators oversee the whole practice; specialist search scoping
      // isn't implemented for this endpoint — only for the main list above).
      query = query.or(`primary_doctor_id.eq.${req.userId},primary_doctor_id.is.null`);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json((data || []).map((patient) => ({
      id: patient.id,
      referralId: patient.referral_id,
      firstName: patient.first_name,
      lastName: patient.last_name,
      dateOfBirth: patient.date_of_birth,
      gender: patient.gender,
      contactNumber: patient.contact_number,
      email: patient.email,
      address: patient.address,
      bloodGroup: patient.blood_group,
      allergies: patient.allergies,
      insurance: patient.insurance,
      primaryDoctorId: patient.primary_doctor_id,
      createdAt: patient.created_at,
      updatedAt: patient.updated_at,
    })));
  } catch (error) {
    console.error('Error searching patients:', error);
    res.status(500).json({ error: 'Failed to search patients' });
  }
});

/**
 * GET /api/patients/:id
 * Get single patient by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', req.params.id)
      .single();
    
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Patient not found' });
    
    // Transform to camelCase
    const patient = {
      id: data.id,
      referralId: data.referral_id,
      firstName: data.first_name,
      lastName: data.last_name,
      dateOfBirth: data.date_of_birth,
      gender: data.gender,
      contactNumber: data.contact_number,
      email: data.email,
      address: data.address,
      bloodGroup: data.blood_group,
      allergies: data.allergies,
      insurance: data.insurance,
      primaryDoctorId: data.primary_doctor_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
    
    res.json(patient);
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({ error: 'Failed to fetch patient' });
  }
});

/**
 * POST /api/patients
 * Create new patient
 */
router.post('/', async (req, res) => {
  try {
    // Generate referral ID
    const referralId = `RFL-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`;
    
    // Map camelCase from frontend to snake_case for database
    const patientData = {
      referral_id: referralId,
      first_name: req.body.firstName || req.body.first_name,
      last_name: req.body.lastName || req.body.last_name,
      date_of_birth: req.body.dateOfBirth || req.body.date_of_birth,
      gender: req.body.gender?.toLowerCase(),
      contact_number: req.body.contactNumber || req.body.contact_number,
      email: req.body.email,
      address: req.body.address,
      blood_group: req.body.bloodGroup || req.body.blood_group || null,
      allergies: req.body.allergies || [],
      insurance: req.body.insurance,
      primary_doctor_id: req.userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    console.log('Creating patient with data:', JSON.stringify(patientData, null, 2));
    
    const { data, error } = await supabase
      .from('patients')
      .insert(patientData)
      .select()
      .single();
    
    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }
    
    console.log('Patient created successfully:', data);
    
    // Transform to camelCase for frontend
    const patient = {
      id: data.id,
      referralId: data.referral_id,
      firstName: data.first_name,
      lastName: data.last_name,
      dateOfBirth: data.date_of_birth,
      gender: data.gender,
      contactNumber: data.contact_number,
      email: data.email,
      address: data.address,
      bloodGroup: data.blood_group,
      allergies: data.allergies,
      insurance: data.insurance,
      primaryDoctorId: data.primary_doctor_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
    
    res.status(201).json(patient);
  } catch (error) {
    console.error('Error creating patient:', error);
    res.status(500).json({ 
      error: 'Failed to create patient', 
      details: error.message,
      hint: error.hint 
    });
  }
});

/**
 * PUT /api/patients/:id
 * Update patient
 */
router.put('/:id', async (req, res) => {
  try {
    const b = req.body;
    const updateData = { updated_at: new Date().toISOString() };
    if (b.firstName !== undefined) updateData.first_name = b.firstName;
    if (b.lastName !== undefined) updateData.last_name = b.lastName;
    if (b.dateOfBirth !== undefined) updateData.date_of_birth = b.dateOfBirth;
    if (b.gender !== undefined) updateData.gender = b.gender;
    if (b.contactNumber !== undefined) updateData.contact_number = b.contactNumber;
    if (b.email !== undefined) updateData.email = b.email;
    if (b.address !== undefined) updateData.address = b.address;
    if (b.bloodGroup !== undefined) updateData.blood_group = b.bloodGroup;
    if (b.allergies !== undefined) updateData.allergies = b.allergies;
    if (b.insurance !== undefined) updateData.insurance = b.insurance;

    const { data, error } = await supabase
      .from('patients')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      id: data.id,
      referralId: data.referral_id,
      firstName: data.first_name,
      lastName: data.last_name,
      dateOfBirth: data.date_of_birth,
      gender: data.gender,
      contactNumber: data.contact_number,
      email: data.email,
      address: data.address,
      bloodGroup: data.blood_group,
      allergies: data.allergies,
      insurance: data.insurance,
      primaryDoctorId: data.primary_doctor_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    });
  } catch (error) {
    console.error('Error updating patient:', error);
    res.status(500).json({ error: 'Failed to update patient' });
  }
});

/**
 * GET /api/patients/:id/referrals
 * Get all referrals for a patient
 */
router.get('/:id/referrals', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('referrals')
      .select('*')
      .eq('patient_id', req.params.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching patient referrals:', error);
    res.status(500).json({ error: 'Failed to fetch referrals' });
  }
});

/**
 * GET /api/patients/:id/trackers
 * Get flight trackers for a patient
 */
router.get('/:id/trackers', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('flight_trackers')
      .select('*')
      .eq('patient_id', req.params.id)
      .order('started_at', { ascending: false });

    if (error) throw error;

    res.json((data || []).map(toPublicTracker));
  } catch (error) {
    console.error('Error fetching trackers:', error);
    res.status(500).json({ error: 'Failed to fetch trackers' });
  }
});

/**
 * GET /api/patients/:id/documents
 * Get documents for a patient
 */
router.get('/:id/documents', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('patient_documents')
      .select('*')
      .eq('patient_id', req.params.id)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;

    res.json((data || []).map(toPublicDocument));
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

/**
 * POST /api/patients/:id/documents
 * Upload a real file to Supabase Storage and record its metadata
 */
router.post('/:id/documents', upload.single('file'), async (req, res) => {
  try {
    const patientId = req.params.id;
    const file = req.file;
    const { category } = req.body;

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const allowedCategories = ['lab_result', 'imaging', 'prescription', 'referral', 'medical_history', 'other'];
    const finalCategory = allowedCategories.includes(category) ? category : 'other';

    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${patientId}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return res.status(500).json({ error: 'Failed to store file', details: uploadError.message });
    }

    const { data, error } = await supabase
      .from('patient_documents')
      .insert({
        patient_id: patientId,
        file_name: file.originalname,
        file_type: file.mimetype,
        file_url: storagePath,
        category: finalCategory,
        uploaded_by: asUuid(req.body.uploadedBy) || req.userId,
        size: file.size,
        uploaded_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      // Roll back the stored file if the DB insert failed
      await supabase.storage.from(DOCUMENTS_BUCKET).remove([storagePath]);
      throw error;
    }

    res.status(201).json(toPublicDocument(data));
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Failed to upload document', details: error.message });
  }
});

export default router;
