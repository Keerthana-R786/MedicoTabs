import express from 'express';
import { supabase } from '../config/database.js';

const router = express.Router();

/**
 * POST /api/auth/login
 * Simple login - checks if user exists in database
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // For demo: Get user by email (no password validation for now)
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error || !user) {
      // Return mock user for demo if not found
      const mockUser = {
        id: 'user-001',
        email: email,
        firstName: 'Sarah',
        lastName: 'Smith',
        role: 'primary_doctor',
        organization: 'North Harbor Family Medicine',
        organizationId: 'org-001',
        specialization: null,
        licenseNumber: 'MD-12345',
        phone: '+1-555-0100',
        createdAt: new Date().toISOString()
      };
      return res.json({ user: mockUser, token: 'mock-token-' + Date.now() });
    }
    
    // Generate simple token
    const token = 'token-' + Date.now();
    
    res.json({ user, token });
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
    
    // Generate token
    const token = 'token-' + Date.now();
    
    res.status(201).json({ user, token });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Signup failed', details: error.message });
  }
});

/**
 * POST /api/auth/logout
 * Logout user
 */
router.post('/logout', async (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

/**
 * GET /api/auth/me
 * Get current user from token
 */
router.get('/me', async (req, res) => {
  try {
    // For demo: return mock user
    const mockUser = {
      id: 'user-001',
      email: 'dr.smith@northharbor.com',
      firstName: 'Sarah',
      lastName: 'Smith',
      role: 'primary_doctor',
      organization: 'North Harbor Family Medicine',
      organizationId: 'org-001',
      specialization: null,
      licenseNumber: 'MD-12345',
      phone: '+1-555-0100',
      createdAt: new Date().toISOString()
    };
    
    res.json(mockUser);
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
});

export default router;
