import { supabase } from '../config/database.js';
import { verifyDoctorToken, verifyPatientToken } from '../utils/tokens.js';

/**
 * Accepts EITHER a doctor session or a patient session (e.g. document
 * download, which both a treating doctor and the owning patient may need).
 * Sets req.actorType to 'doctor' | 'patient' so handlers can apply the
 * right ownership check afterward.
 */
export async function requireDoctorOrPatientAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';

    const doctorId = verifyDoctorToken(token);
    if (doctorId) {
      const { data: user, error } = await supabase.from('users').select('*').eq('id', doctorId).single();
      if (!error && user) {
        req.actorType = 'doctor';
        req.user = user;
        req.userId = user.id;
        return next();
      }
    }

    const patientId = verifyPatientToken(token);
    if (patientId) {
      const { data: patient, error } = await supabase.from('patients').select('*').eq('id', patientId).single();
      if (!error && patient) {
        req.actorType = 'patient';
        req.patient = patient;
        req.patientId = patient.id;
        return next();
      }
    }

    return res.status(401).json({ error: 'Unauthorized' });
  } catch (error) {
    console.error('Combined auth error:', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
}
