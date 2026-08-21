import express from 'express';
import { supabase } from '../config/database.js';

const router = express.Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Map a users table row to the camelCase shape the frontend expects */
function toPublicUser(row) {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    role: row.role,
    organization: row.organization,
    organizationId: row.organization_id,
    specialization: row.specialization,
    licenseNumber: row.license_number,
    phone: row.phone,
    createdAt: row.created_at,
  };
}

/**
 * POST /api/auth/login
 * Checks the user exists in the database and returns a uid-bound token
 */
router.post('/login', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'No account found with this email. Please sign up first.' });
    }

    // Token carries the user id so /me can resolve the real session owner
    const token = `uid-${user.id}`;

    res.json({ user: toPublicUser(user), token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

/**
 * POST /api/auth/signup
 * Create new user account
 */
router.post('/signup', async (req, res) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      role,
      organization,
      organizationId,
      specialization,
      licenseNumber,
      phone
    } = req.body;

    // Validation
    if (!email || !firstName || !lastName || !role || !organization || !licenseNumber || !phone) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['email', 'firstName', 'lastName', 'role', 'organization', 'licenseNumber', 'phone']
      });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Create user
    const userData = {
      email,
      first_name: firstName,
      last_name: lastName,
      role,
      organization,
      organization_id: organizationId || `org-${Date.now()}`,
      specialization: specialization || null,
      license_number: licenseNumber,
      phone,
      created_at: new Date().toISOString()
    };

    const { data: user, error } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single();

    if (error) {
      console.error('Signup error:', error);
      throw error;
    }

    const token = `uid-${user.id}`;

    res.status(201).json({ user: toPublicUser(user), token });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Signup failed', details: error.message });
  }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', async (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

/**
 * GET /api/auth/me
 * Resolves the current user from the uid-bound bearer token
 */
router.get('/me', async (req, res) => {
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

    res.json(toPublicUser(user));
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
});

export default router;
