import express from 'express';
import { supabase } from '../config/database.js';
import { respondToApproval } from '../services/yoxaService.js';
import { verifyWebhookSignature, isTimestampFresh } from '../utils/hmacVerifier.js';
import { yoxaConfig } from '../config/yoxa.js';
import { requireDoctorAuth } from '../middleware/doctorAuth.js';

const router = express.Router();

/**
 * Transform a raw hitl_approval_requests row to the camelCase shape
 * the frontend expects (options[].option_id -> optionId etc.)
 */
function transformApproval(row) {
  if (!row) return row;
  return {
    id: row.id,
    eventId: row.event_id,
    requestId: row.request_id,
    workflowRunId: row.workflow_run_id,
    deploymentId: row.deployment_id,
    referralId: row.referral_id,
    patientId: row.patient_id,
    title: row.title,
    description: row.description,
    options: (row.options || []).map((o) => ({
      optionId: o.option_id || o.optionId,
      title: o.title,
      description: o.description,
    })),
    assignedTo: row.assigned_to,
    status: row.status,
    selectedOptionId: row.selected_option_id,
    overrideMessage: row.override_message,
    answeredBy: row.answered_by,
    answeredAt: row.answered_at,
    receivedAt: row.received_at,
  };
}

/**
 * POST /api/hitl/webhook
 * Receive YOXA HITL approval requests
 * CRITICAL: This must be publicly accessible from YOXA
 */
router.post('/webhook', async (req, res) => {
  try {
    // Extract headers
    const eventId = req.headers['x-yoxa-webhook-id'];
    const timestamp = req.headers['x-yoxa-webhook-timestamp'];
    const signature = req.headers['x-yoxa-webhook-signature'];
    
    console.log('📨 Received YOXA webhook');
    console.log('  Event ID:', eventId);
    console.log('  Timestamp:', timestamp);
    
    // Verify required headers
    if (!eventId || !timestamp || !signature) {
      console.error('✗ Missing required webhook headers');
      return res.status(400).json({ 
        error: 'Missing required headers',
        required: ['X-Yoxa-Webhook-Id', 'X-Yoxa-Webhook-Timestamp', 'X-Yoxa-Webhook-Signature']
      });
    }
    
    // Get raw body for HMAC verification
    const rawBody = req.rawBody;
    if (!rawBody) {
      console.error('✗ Raw body not captured. Check middleware setup.');
      return res.status(400).json({ error: 'Request body processing error' });
    }
    
    // Verify HMAC signature
    const isValidSignature = verifyWebhookSignature(
      rawBody,
      timestamp,
      signature,
      yoxaConfig.hitl.webhookSigningSecret
    );
    
    if (!isValidSignature) {
      console.error('✗ Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    console.log('✓ Signature verified');
    
    // Check timestamp freshness (prevent replay attacks)
    const isFresh = isTimestampFresh(timestamp, yoxaConfig.hitl.timestampTolerance);
    if (!isFresh) {
      console.error('✗ Webhook timestamp too old');
      return res.status(401).json({ error: 'Timestamp too old' });
    }
    
    console.log('✓ Timestamp is fresh');
    
    const payload = req.body;
    
    // Handle test event
    if (payload.event_type === 'hitl.webhook_test') {
      console.log('✓ Test event received successfully');
      
      // Store test event for verification
      await supabase.from('hitl_approval_requests').insert({
        event_id: eventId,
        request_id: `test-${eventId}`,
        workflow_run_id: 'test',
        deployment_id: payload.deployment_id || 'test',
        title: 'Test Event',
        description: 'YOXA webhook test event',
        options: [],
        status: 'answered', // Mark test events as answered
      });
      
      return res.status(200).json({ received: true, type: 'test' });
    }
    
    // Handle approval request event
    if (payload.event_type === 'hitl.approval_requested') {
      console.log('✓ Approval request received');
      console.log('  Workflow Run ID:', payload.workflow_run_id);
      console.log('  Request ID:', payload.request_id);
      console.log('  Title:', payload.title);
      
      // Check for duplicate (idempotency)
      const { data: existing } = await supabase
        .from('hitl_approval_requests')
        .select('id')
        .eq('event_id', eventId)
        .single();
      
      if (existing) {
        console.log('✓ Duplicate event ignored (idempotent)');
        return res.status(200).json({ received: true, duplicate: true });
      }
      
      // Find related referral by workflow_run_id
      const { data: referral } = await supabase
        .from('referrals')
        .select('id, patient_id, primary_doctor_id')
        .eq('workflow_run_id', payload.workflow_run_id)
        .single();
      
      // Determine who should handle this approval
      const assignedTo = referral?.primary_doctor_id || null;
      
      // Store approval request in database
      const { data: approval, error: approvalError } = await supabase
        .from('hitl_approval_requests')
        .insert({
          event_id: eventId,
          request_id: payload.request_id,
          workflow_run_id: payload.workflow_run_id,
          deployment_id: payload.deployment_id,
          referral_id: referral?.id || null,
          patient_id: referral?.patient_id || null,
          title: payload.title,
          description: payload.description,
          options: payload.options, // JSONB array
          assigned_to: assignedTo,
          status: 'pending',
        })
        .select()
        .single();
      
      if (approvalError) {
        console.error('✗ Failed to store approval:', approvalError);
        return res.status(500).json({ error: 'Failed to store approval' });
      }
      
      console.log('✓ Approval stored in database:', approval.id);
      
      // Create notification for assigned user
      if (assignedTo) {
        await supabase
          .from('notifications')
          .insert({
            user_id: assignedTo,
            type: 'approval',
            title: 'Approval Required',
            message: payload.title,
            referral_id: referral?.id || null,
            action_url: `/approvals/${approval.id}`,
          });
        
        console.log('✓ Notification created for user:', assignedTo);
      }
      
      // Return 200 quickly (YOXA expects fast response)
      return res.status(200).json({ 
        received: true,
        approvalId: approval.id,
        message: 'Approval request stored successfully'
      });
    }
    
    // Unknown event type
    console.warn('⚠ Unknown event type:', payload.event_type);
    return res.status(200).json({ received: true, type: 'unknown' });
    
  } catch (error) {
    console.error('✗ Webhook processing error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/hitl/pending
 * Get pending approval requests assigned to the authenticated user
 */
router.get('/pending', requireDoctorAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('hitl_approval_requests')
      .select('*')
      .eq('status', 'pending')
      .eq('assigned_to', req.userId)
      .order('received_at', { ascending: false });

    if (error) throw error;

    res.json((data || []).map(transformApproval));
  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    res.status(500).json({ error: 'Failed to fetch approvals' });
  }
});

/**
 * GET /api/hitl/:id
 * Get specific approval request
 */
router.get('/:id', requireDoctorAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('hitl_approval_requests')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Approval not found' });
    if (data.assigned_to && data.assigned_to !== req.userId) {
      return res.status(403).json({ error: 'This approval is not assigned to you' });
    }

    res.json(transformApproval(data));
  } catch (error) {
    console.error('Error fetching approval:', error);
    res.status(500).json({ error: 'Failed to fetch approval' });
  }
});

/**
 * POST /api/hitl/:requestId/respond
 * Respond to HITL approval request
 * CRITICAL: This sends the response back to YOXA
 */
router.post('/:requestId/respond', requireDoctorAuth, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { selectedOptionId, overrideMessage } = req.body;
    
    console.log('📤 Processing HITL response');
    console.log('  Request ID:', requestId);
    
    // Validate input
    if (!selectedOptionId && !overrideMessage) {
      return res.status(400).json({
        error: 'Must provide either selectedOptionId or overrideMessage'
      });
    }
    
    // Find approval request in database
    const { data: approval, error: findError } = await supabase
      .from('hitl_approval_requests')
      .select('*')
      .eq('request_id', requestId)
      .single();
    
    if (findError || !approval) {
      return res.status(404).json({ error: 'Approval request not found' });
    }

    if (approval.assigned_to && approval.assigned_to !== req.userId) {
      return res.status(403).json({ error: 'This approval is not assigned to you' });
    }

    // Check if already answered
    if (approval.status === 'answered') {
      console.log('⚠ Approval already answered (idempotent behavior)');
      return res.json({
        success: true,
        alreadyAnswered: true,
        message: 'This approval has already been answered',
      });
    }

    // The authenticated caller is always the responder — never trust a
    // client-supplied userId here.
    const userId = req.userId;

    try {
      // Send response to YOXA
      console.log('🚀 Sending response to YOXA...');
      const yoxaResult = await respondToApproval(
        requestId,
        selectedOptionId,
        overrideMessage
      );
      
      console.log('✓ YOXA accepted response');
      
      // Update approval in database
      const { error: updateError } = await supabase
        .from('hitl_approval_requests')
        .update({
          status: 'answered',
          selected_option_id: selectedOptionId || null,
          override_message: overrideMessage || null,
          answered_by: userId,
          answered_at: new Date().toISOString(),
        })
        .eq('id', approval.id);
      
      if (updateError) {
        console.error('Failed to update approval status:', updateError);
      }
      
      // Update referral status if applicable
      if (approval.referral_id) {
        await supabase
          .from('referrals')
          .update({ status: 'completed' })
          .eq('id', approval.referral_id);
      }
      
      // Update tracker if applicable
      if (approval.workflow_run_id) {
        const { data: tracker } = await supabase
          .from('flight_trackers')
          .select('*')
          .eq('workflow_run_id', approval.workflow_run_id)
          .single();
        
        if (tracker) {
          const updatedStages = tracker.stages.map((stage) => {
            if (stage.stage === 'completion_and_archive') {
              return {
                ...stage,
                status: 'completed',
                completedAt: new Date().toISOString(),
                notes: 'Doctor sign-off received',
              };
            }
            return stage;
          });
          
          await supabase
            .from('flight_trackers')
            .update({
              stages: updatedStages,
              signed_off_by: userId,
              signed_off_at: new Date().toISOString(),
              completed_at: new Date().toISOString(),
            })
            .eq('id', tracker.id);
        }
      }
      
      res.json({
        success: true,
        alreadyAnswered: yoxaResult.alreadyAnswered,
        message: 'Response sent to YOXA. Workflow will resume.',
      });
      
    } catch (yoxaError) {
      console.error('✗ Failed to send response to YOXA:', yoxaError.message);
      
      return res.status(500).json({
        error: 'Failed to send response to YOXA',
        message: yoxaError.message,
      });
    }
    
  } catch (error) {
    console.error('✗ Error responding to approval:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

export default router;
