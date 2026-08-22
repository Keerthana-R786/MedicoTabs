import express from 'express';
import { supabase } from '../config/database.js';

const router = express.Router();

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
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalPatients, activeReferrals, pendingApprovals, completedToday, urgentCases] =
      await Promise.all([
        countRows('patients'),
        countRows('referrals', (q) => q.in('status', OPEN_REFERRAL_STATUSES)),
        countRows('hitl_approval_requests', (q) => q.eq('status', 'pending')),
        countRows('referrals', (q) =>
          q.eq('status', 'completed').gte('updated_at', todayStart.toISOString())
        ),
        countRows('referrals', (q) =>
          q.in('urgency', ['Urgent', 'Emergency']).in('status', OPEN_REFERRAL_STATUSES)
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
