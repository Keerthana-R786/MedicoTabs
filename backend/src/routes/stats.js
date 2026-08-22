import express from 'express';
import { supabase } from '../config/database.js';
import { requireDoctorAuth } from '../middleware/doctorAuth.js';

const router = express.Router();
router.use(requireDoctorAuth);

const OPEN_REFERRAL_STATUSES = ['pending', 'routed', 'accepted', 'rerouted'];

async function countRows(table, applyFilters) {
  let query = supabase.from(table).select('*', { count: 'exact', head: true });
  if (applyFilters) query = applyFilters(query);
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

/**
 * GET /api/stats/dashboard
 * Live counts for the dashboard stat cards
 */
router.get('/dashboard', async (req, res) => {
  try {
    const { userId, user } = req;
    const isSpecialist = user.role === 'specialist_doctor';
    const referralOwner = (q) => (isSpecialist ? q.eq('specialist_id', userId) : q.eq('primary_doctor_id', userId));

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalPatients, activeReferrals, pendingApprovals, completedToday, urgentCases] =
      await Promise.all([
        isSpecialist ? countRows('patients') : countRows('patients', (q) => q.eq('primary_doctor_id', userId)),
        countRows('referrals', (q) => referralOwner(q).in('status', OPEN_REFERRAL_STATUSES)),
        countRows('hitl_approval_requests', (q) => q.eq('status', 'pending').eq('assigned_to', userId)),
        countRows('referrals', (q) =>
          referralOwner(q).eq('status', 'completed').gte('updated_at', todayStart.toISOString())
        ),
        countRows('referrals', (q) =>
          referralOwner(q).in('urgency', ['Urgent', 'Emergency']).in('status', OPEN_REFERRAL_STATUSES)
        ),
      ]);

    res.json({
      totalPatients,
      activeReferrals,
      pendingApprovals,
      completedToday,
      urgentCases,
    });
  } catch (error) {
    console.error('Error computing dashboard stats:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard stats',
      details: error.message,
    });
  }
});

export default router;
