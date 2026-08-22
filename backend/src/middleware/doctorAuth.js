import { supabase } from '../config/database.js';
import { verifyDoctorToken } from '../utils/tokens.js';

/**
 * Enforces doctor/coordinator auth for routes that must be scoped to "the
 * current user" (e.g. their own notifications, their own profile). Verifies
 * the signed session token issued by POST /api/auth/login (see utils/tokens.js).
 */
export async function requireDoctorAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';

    const userId = verifyDoctorToken(token);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    req.user = user;
    req.userId = user.id;
    next();
  } catch (error) {
    console.error('Doctor auth error:', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
}
