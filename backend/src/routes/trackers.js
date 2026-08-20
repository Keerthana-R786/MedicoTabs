import express from 'express';
import { supabase } from '../config/database.js';

const router = express.Router();

/**
 * GET /api/trackers/:id
 * Get flight tracker by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('flight_trackers')
      .select('*')
      .eq('id', req.params.id)
      .single();
    
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Tracker not found' });
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching tracker:', error);
    res.status(500).json({ error: 'Failed to fetch tracker' });
  }
});

/**
 * POST /api/trackers
 * Create new flight tracker
 */
router.post('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('flight_trackers')
      .insert(req.body)
      .select()
      .single();
    
    if (error) throw error;
    
    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating tracker:', error);
    res.status(500).json({ error: 'Failed to create tracker' });
  }
});

/**
 * PUT /api/trackers/:id
 * Update flight tracker
 */
router.put('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('flight_trackers')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    console.error('Error updating tracker:', error);
    res.status(500).json({ error: 'Failed to update tracker' });
  }
});

/**
 * POST /api/trackers/:id/signoff
 * Doctor sign-off on tracker
 */
router.post('/:id/signoff', async (req, res) => {
  try {
    const { notes, userId } = req.body;
    
    const { data, error } = await supabase
      .from('flight_trackers')
      .update({
        signed_off_by: userId,
        signed_off_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    console.error('Error signing off tracker:', error);
    res.status(500).json({ error: 'Failed to sign off tracker' });
  }
});

export default router;
