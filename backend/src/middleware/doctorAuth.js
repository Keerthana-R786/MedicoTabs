import { supabase } from '../config/database.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Enforces doctor/coordinator auth for routes that must be scoped to "the
 * current user" (e.g. their own notifications, their own profile). Mirrors
 * the uid- token already issued by POST /api/auth/login.
 */
export async function requireDoctorAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';

    if (!token.startsWith('uid-')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = token.slice(4);
    if (!UUID_RE.test(userId)) {
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
