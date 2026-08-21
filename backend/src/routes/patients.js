import express from 'express';
import { supabase } from '../config/database.js';

const router = express.Router();

/**
 * GET /api/patients
 * Get all patients
 */
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false });
    
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
    
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},referral_id.ilike.${searchTerm},contact_number.like.${searchTerm}`)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.json(data);
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
      primary_doctor_id: null, // Set to null for now since we don't have users seeded
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
    const updateData = {
      ...req.body,
      updated_at: new Date().toISOString(),
    };
    
    const { data, error } = await supabase
      .from('patients')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json(data);
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
    
    res.json(data);
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
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

/**
 * POST /api/patients/:id/documents
 * Upload document for patient (placeholder - implement with file upload middleware)
 */
router.post('/:id/documents', async (req, res) => {
  try {
    // In production, use multer or similar for file uploads
    // Then upload to Supabase Storage
    // For now, just store metadata
    
    const { data, error } = await supabase
      .from('patient_documents')
      .insert({
        patient_id: req.params.id,
        ...req.body,
        uploaded_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) throw error;
    
    res.status(201).json(data);
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

export default router;
