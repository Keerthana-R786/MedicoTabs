import express from 'express';
import { supabase } from '../config/database.js';
import { requireDoctorAuth } from '../middleware/doctorAuth.js';

const router = express.Router();

router.use(requireDoctorAuth);

function toPublicNotification(row) {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message,
    referralId: row.referral_id,
    isRead: row.is_read,
    createdAt: row.created_at,
    actionUrl: row.action_url,
  };
}

/**
 * GET /api/notifications
 * All notifications for the authenticated user
 */
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json((data || []).map(toPublicNotification));
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * PUT /api/notifications/read-all
 * Mark every unread notification for this user as read
 */
router.put('/read-all', async (req, res) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', req.userId)
      .eq('is_read', false);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications read:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

/**
 * PUT /api/notifications/:id/read
 * Mark a single notification as read (ownership-scoped)
 */
router.put('/:id/read', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(toPublicNotification(data));
  } catch (error) {
    console.error('Error marking notification read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

export default router;
