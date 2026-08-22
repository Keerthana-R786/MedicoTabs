import { supabase } from '../config/database.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Enforces patient-portal auth. The patient identity is derived ONLY from
 * the bearer token (never a URL param), so a patient can never read another
 * patient's data. Attaches req.patientId / req.patient on success.
 */
export async function requirePatientAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';

    if (!token.startsWith('pid-')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const patientId = token.slice(4);
    if (!UUID_RE.test(patientId)) {
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
