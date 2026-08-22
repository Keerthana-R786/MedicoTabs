import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_TTL = '7d';

if (!JWT_SECRET) {
  console.warn('⚠ JWT_SECRET is not set — falling back to an insecure dev-only secret.');
  console.warn('  Set JWT_SECRET in your .env file before deploying anywhere real.');
}

// Dev-only fallback so the app still boots without a .env, but every real
// deployment must set JWT_SECRET or sessions are trivially forgeable.
const SECRET = JWT_SECRET || 'medicotabs-insecure-dev-secret-do-not-use-in-production';

export function signDoctorToken(userId) {
  return jwt.sign({ sub: userId, typ: 'doctor' }, SECRET, { expiresIn: TOKEN_TTL });
}

export function verifyDoctorToken(token) {
  try {
    const payload = jwt.verify(token, SECRET);
    if (payload.typ !== 'doctor') return null;
    return payload.sub;
  } catch {
    return null;
  }
}

export function signPatientToken(patientId) {
  return jwt.sign({ sub: patientId, typ: 'patient' }, SECRET, { expiresIn: TOKEN_TTL });
}

export function verifyPatientToken(token) {
  try {
    const payload = jwt.verify(token, SECRET);
    if (payload.typ !== 'patient') return null;
    return payload.sub;
  } catch {
    return null;
  }
}
