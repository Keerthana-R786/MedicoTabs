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
    const isCoordinator = user.role === 'coordinator';
    // Legacy referrals/patients created before ownership was tracked have no
    // primary_doctor_id/specialist_id — count them too rather than making
    // them invisible (for specialists, only within their own specialty).
    // Coordinators oversee the whole practice, so they get no filter at all.
    const referralOwner = (q) => {
      if (isCoordinator) return q;
      if (isSpecialist) {
        return user.specialization
          ? q.or(`specialist_id.eq.${userId},and(specialist_id.is.null,requested_specialty.eq.${user.specialization})`)
          : q.eq('specialist_id', userId);
      }
      return q.or(`primary_doctor_id.eq.${userId},primary_doctor_id.is.null`);
    };

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalPatients, activeReferrals, pendingApprovals, completedToday, urgentCases] =
      await Promise.all([
        (isSpecialist || isCoordinator)
          ? countRows('patients')
          : countRows('patients', (q) => q.or(`primary_doctor_id.eq.${userId},primary_doctor_id.is.null`)),
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
