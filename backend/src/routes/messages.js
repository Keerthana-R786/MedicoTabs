import express from 'express';
import { supabase } from '../config/database.js';
import { requireDoctorAuth } from '../middleware/doctorAuth.js';

const router = express.Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function asUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value) ? value : null;
}

function roleLabel(role) {
  if (role === 'primary_doctor') return 'Primary Doctor';
  if (role === 'coordinator') return 'Care Coordinator';
  return 'Specialist';
}

function toPublicMessage(row) {
  return {
    id: row.id,
    referralId: row.referral_id,
    senderId: row.sender_id,
    senderName: row.sender_name,
    senderRole: row.sender_role,
    recipientId: row.recipient_id,
    recipientName: row.recipient_name,
    subject: row.subject,
    content: row.content,
    attachments: row.attachments,
    isRead: row.is_read,
    sentAt: row.sent_at,
    repliedAt: row.replied_at,
  };
}

/**
 * GET /api/messages/inbox
 * Every message sent to or by the authenticated doctor
 */
router.get('/inbox', requireDoctorAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`recipient_id.eq.${req.userId},sender_id.eq.${req.userId}`)
      .order('sent_at', { ascending: false });

    if (error) throw error;

    res.json((data || []).map(toPublicMessage));
  } catch (error) {
    console.error('Error fetching inbox:', error);
    res.status(500).json({ error: 'Failed to fetch inbox' });
  }
});

/**
 * POST /api/messages
 * Send a message (sender is always the authenticated doctor)
 */
router.post('/', requireDoctorAuth, async (req, res) => {
  try {
    const { referralId, recipientId, recipientName, subject, content, attachments } = req.body;

    if (!subject || !content) {
      return res.status(400).json({ error: 'subject and content are required' });
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({
        referral_id: asUuid(referralId),
        sender_id: req.userId,
        sender_name: `${req.user.first_name} ${req.user.last_name}`,
        sender_role: roleLabel(req.user.role),
        recipient_id: asUuid(recipientId),
        recipient_name: recipientName || 'Care Team',
        subject,
        content,
        attachments: Array.isArray(attachments) ? attachments : null,
        is_read: false,
      })
      .select()
      .single();

    if (error) throw error;

    // Best-effort notification to the recipient
    if (asUuid(recipientId)) {
      await supabase.from('notifications').insert({
        user_id: recipientId,
        type: 'message',
        title: `New message from ${data.sender_name}`,
        message: subject,
        referral_id: asUuid(referralId),
        is_read: false,
      });
    }

    res.status(201).json(toPublicMessage(data));
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

/**
 * PUT /api/messages/:id/read
 * Mark a message as read (only the recipient can mark it read)
 */
router.put('/:id/read', requireDoctorAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('id', req.params.id)
      .eq('recipient_id', req.userId)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json(toPublicMessage(data));
  } catch (error) {
    console.error('Error marking message read:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
});

export default router;
