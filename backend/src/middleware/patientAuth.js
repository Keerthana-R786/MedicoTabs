import { supabase } from '../config/database.js';
import { verifyPatientToken } from '../utils/tokens.js';

/**
 * Enforces patient-portal auth. The patient identity is derived ONLY from
 * the bearer token (never a URL param), so a patient can never read another
 * patient's data. Attaches req.patientId / req.patient on success.
 */
export async function requirePatientAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';

    const patientId = verifyPatientToken(token);
    if (!patientId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: patient, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single();

    if (error || !patient) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    req.patient = patient;
    req.patientId = patient.id;
    next();
  } catch (error) {
    console.error('Patient auth error:', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
}
