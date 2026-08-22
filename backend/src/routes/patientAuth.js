import express from 'express';
import { supabase } from '../config/database.js';
import { requirePatientAuth } from '../middleware/patientAuth.js';

const router = express.Router();

/** Map a patients table row to the camelCase shape the frontend expects */
function toPublicPatient(row) {
  return {
    id: row.id,
    referralId: row.referral_id,
    firstName: row.first_name,
    lastName: row.last_name,
    dateOfBirth: row.date_of_birth,
    gender: row.gender,
    contactNumber: row.contact_number,
    email: row.email,
    address: row.address,
    bloodGroup: row.blood_group,
    allergies: row.allergies,
    insurance: row.insurance,
    primaryDoctorId: row.primary_doctor_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * POST /api/patient-auth/login
 * Patient identity verification via Referral ID + Date of Birth
 * (no password infra needed — mirrors real-world patient portal "guest lookup" flows)
 */
router.post('/login', async (req, res) => {
  try {
    const { referralId, dateOfBirth } = req.body;

    if (!referralId || !dateOfBirth) {
      return res.status(400).json({ error: 'Referral ID and date of birth are required' });
    }

    const { data: patient, error } = await supabase
      .from('patients')
      .select('*')
      .ilike('referral_id', referralId.trim())
      .single();

    if (error || !patient) {
      return res.status(401).json({ error: 'No patient record matches those details' });
    }

    if (patient.date_of_birth !== dateOfBirth) {
      return res.status(401).json({ error: 'No patient record matches those details' });
    }

    const token = `pid-${patient.id}`;

    res.json({ patient: toPublicPatient(patient), token });
  } catch (error) {
    console.error('Patient login error:', error);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

/**
 * GET /api/patient-auth/me
 * Resolves the current patient from the pid-bound bearer token
 */
router.get('/me', requirePatientAuth, async (req, res) => {
  res.json(toPublicPatient(req.patient));
});

/**
 * POST /api/patient-auth/logout
 */
router.post('/logout', async (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

export default router;
