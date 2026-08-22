import express from 'express';
import { supabase } from '../config/database.js';

const router = express.Router();

function toPublicDoctor(row) {
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
 * GET /api/doctors
 * Directory of primary and specialist doctors
 */
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .in('role', ['primary_doctor', 'specialist_doctor'])
      .order('first_name', { ascending: true });

    if (error) throw error;

    res.json((data || []).map(toPublicDoctor));
  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
});

/**
 * GET /api/doctors/search?q=
 * Search doctors by name, organization, specialization, license, or email
 */
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Search query required' });

    const term = `%${q}%`;
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .in('role', ['primary_doctor', 'specialist_doctor'])
      .or(
        `first_name.ilike.${term},last_name.ilike.${term},organization.ilike.${term},specialization.ilike.${term},license_number.ilike.${term},email.ilike.${term}`
      )
      .order('first_name', { ascending: true });

    if (error) throw error;

    res.json((data || []).map(toPublicDoctor));
  } catch (error) {
    console.error('Error searching doctors:', error);
    res.status(500).json({ error: 'Failed to search doctors' });
  }
});

/**
 * GET /api/doctors/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.params.id)
      .in('role', ['primary_doctor', 'specialist_doctor'])
      .single();

    if (error || !data) return res.status(404).json({ error: 'Doctor not found' });

    res.json(toPublicDoctor(data));
  } catch (error) {
    console.error('Error fetching doctor:', error);
    res.status(500).json({ error: 'Failed to fetch doctor' });
  }
});

export default router;
