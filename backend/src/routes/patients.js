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
    
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ error: 'Failed to fetch patients' });
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
    
    res.json(data);
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
    
    const patientData = {
      ...req.body,
      referral_id: referralId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    const { data, error } = await supabase
      .from('patients')
      .insert(patientData)
      .select()
      .single();
    
    if (error) throw error;
    
    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating patient:', error);
    res.status(500).json({ error: 'Failed to create patient' });
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
