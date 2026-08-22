import express from 'express';
import { supabase } from '../config/database.js';
import { triggerWorkflow } from '../services/yoxaService.js';
import { requireDoctorAuth } from '../middleware/doctorAuth.js';

const router = express.Router();
router.use(requireDoctorAuth);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Returns the value if it is a valid UUID, otherwise null (protects FK columns) */
function safeUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value) ? value : null;
}

/** Maps a role to the sender label used on messages/notifications */
function roleLabel(role) {
  if (role === 'primary_doctor') return 'Primary Doctor';
  if (role === 'coordinator') return 'Care Coordinator';
  return 'Specialist';
}

/**
 * POST /api/referrals
 * Create a new referral and trigger YOXA workflow
 */
router.post('/', async (req, res) => {
  try {
    const {
      patientId,
      patientName,
      primaryDoctorId,
      primaryDoctorName,
      primaryOrganization,
      requestedSpecialty,
      specialistPreference,
      referralReason,
      serviceType,
      visitType,
      urgency,
      // Contact & coverage details collected on the referral form
      patientContactNumber,
      patientEmail,
      patientAddress,
      preferredContactMethod,
      insuranceProvider,
      insuranceMemberId,
    } = req.body;
    
    // Validate required fields
    if (!patientId || !requestedSpecialty || !referralReason || !urgency) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['patientId', 'requestedSpecialty', 'referralReason', 'urgency']
      });
    }
    
    // Validate urgency level
    if (!['Routine', 'Urgent', 'Emergency'].includes(urgency)) {
      return res.status(400).json({
        error: 'Invalid urgency level',
        allowed: ['Routine', 'Urgent', 'Emergency']
      });
    }
    
    // The Coverage Verification agent/stage only applies to advanced treatments
    // or operations — general checkups never get it created in the tracker.
    const isAdvancedTreatment = visitType === 'advanced_treatment';

    console.log('📝 Creating new referral...');
    
    // Get patient details for workflow
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single();
    
    if (patientError || !patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    // Merge form-supplied contact/coverage details onto the patient record
    // so the EHR stays current and agents always read fresh data.
    const finalContact = patientContactNumber || patient.contact_number;
    const finalEmail = patientEmail || patient.email;
    const finalAddress = patientAddress || patient.address;
    const mergedInsurance = {
      ...(patient.insurance || {}),
      ...(insuranceProvider ? { provider: insuranceProvider } : {}),
      ...(insuranceMemberId ? { memberId: insuranceMemberId } : {}),
    };
    
    await supabase
      .from('patients')
      .update({
        contact_number: finalContact,
        email: finalEmail,
        address: finalAddress,
        insurance: mergedInsurance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', patientId);
    
    // Generate referral number
    const referralNumber = `RFL-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`;
    
    // Calculate acknowledgment deadline based on urgency
    const acknowledgmentDeadline = new Date();
    switch (urgency) {
      case 'Emergency':
        acknowledgmentDeadline.setMinutes(acknowledgmentDeadline.getMinutes() + 30);
        break;
      case 'Urgent':
        acknowledgmentDeadline.setHours(acknowledgmentDeadline.getHours() + 4);
        break;
      case 'Routine':
        acknowledgmentDeadline.setHours(acknowledgmentDeadline.getHours() + 24);
        break;
    }
    
    // Insert referral into database (without workflow_run_id initially)
    const { data: referral, error: referralError } = await supabase
      .from('referrals')
      .insert({
        referral_number: referralNumber,
        patient_id: patientId,
        patient_name: patientName,
        primary_doctor_id: safeUuid(primaryDoctorId),
        primary_doctor_name: primaryDoctorName,
        primary_organization: primaryOrganization,
        requested_specialty: requestedSpecialty,
        specialist_preference: specialistPreference || null,
        referral_reason: referralReason,
        service_type: serviceType || null,
        urgency,
        status: 'pending',
        acknowledgment_deadline: acknowledgmentDeadline.toISOString(),
      })
      .select()
      .single();
    
    if (referralError) {
      console.error('Database error:', referralError);
      return res.status(500).json({ error: 'Failed to create referral', details: referralError.message });
    }
    
    console.log('✓ Referral created in database:', referralNumber);
    
    // Prepare data for YOXA workflow trigger
    const workflowData = {
      referralId: referral.id,
      referralNumber: referral.referral_number,
      patientId: patient.id,
      patientName: `${patient.first_name} ${patient.last_name}`,
      patientDOB: patient.date_of_birth,
      patientContactNumber: finalContact,
      patientEmail: finalEmail,
      patientAddress: finalAddress,
      preferredContactMethod: preferredContactMethod || 'phone',
      insuranceProvider: mergedInsurance.provider || '',
      insuranceMemberId: mergedInsurance.memberId || '',
      referralReason,
      requestedSpecialty,
      specialistPreference,
      serviceType,
      visitType: visitType || 'general_checkup',
      urgency,
      primaryDoctorId,
      primaryDoctorName,
      primaryOrganization,
      acknowledgmentDeadline: acknowledgmentDeadline.toISOString(),
    };
    
    try {
      // TRIGGER YOXA WORKFLOW - This is the critical integration point!
      console.log('🚀 Triggering YOXA multiagent workflow...');
      const yoxaResult = await triggerWorkflow(workflowData);
      
      // Update referral with workflow_run_id
      const { error: updateError } = await supabase
        .from('referrals')
        .update({
          workflow_run_id: yoxaResult.workflowRunId,
          status: 'routed', // Update status to routed after workflow starts
        })
        .eq('id', referral.id);
      
      if (updateError) {
        console.error('Failed to update workflow_run_id:', updateError);
      }
      
      console.log('✓ Referral linked to workflow:', yoxaResult.workflowRunId);
      
      // Create flight tracker
      const { data: tracker, error: trackerError } = await supabase
        .from('flight_trackers')
        .insert({
          patient_id: patientId,
          visit_reason: `${requestedSpecialty} - ${referralReason}`,
          urgency,
          current_stage: 'create_and_route',
          stages: [
            { stage: 'create_and_route', status: 'in_progress', startedAt: new Date().toISOString(), agentActions: [] },
            { stage: 'acceptance_and_records', status: 'pending', agentActions: [] },
            // Coverage Verification only exists for advanced treatments/operations —
            // general checkups/visits never get this stage at all.
            ...(isAdvancedTreatment
              ? [{ stage: 'coverage_verification', status: 'pending', agentActions: [] }]
              : []),
            { stage: 'scheduling_and_attendance', status: 'pending', agentActions: [] },
            { stage: 'completion_and_archive', status: 'pending', agentActions: [] },
          ],
          workflow_run_id: yoxaResult.workflowRunId,
        })
        .select()
        .single();
      
      if (trackerError) {
        console.error('Failed to create tracker:', trackerError);
      } else {
        // Link tracker to referral
        await supabase
          .from('referrals')
          .update({ tracker_id: tracker.id })
          .eq('id', referral.id);
      }
      
      // Create notification for primary doctor
      await supabase
        .from('notifications')
        .insert({
          user_id: safeUuid(primaryDoctorId),
          type: 'referral',
          title: 'Referral Created',
          message: `Referral ${referralNumber} created and workflow initiated for ${patientName}`,
          referral_id: referral.id,
        });
      
    // Return success response with camelCase transformation
      res.status(201).json({
        success: true,
        referral: {
          id: referral.id,
          referralNumber: referral.referral_number,
          patientId: referral.patient_id,
          patientName: referral.patient_name,
          primaryDoctorId: referral.primary_doctor_id,
          primaryDoctorName: referral.primary_doctor_name,
          primaryOrganization: referral.primary_organization,
          requestedSpecialty: referral.requested_specialty,
          specialistPreference: referral.specialist_preference,
          referralReason: referral.referral_reason,
          serviceType: referral.service_type,
          urgency: referral.urgency,
          status: 'routed',
          workflowRunId: yoxaResult.workflowRunId,
          trackerId: tracker?.id,
          createdAt: referral.created_at,
        },
        workflowRunId: yoxaResult.workflowRunId,
        trackerId: tracker?.id,
        message: 'Referral created and YOXA workflow triggered successfully',
      });
      
    } catch (yoxaError) {
      // Workflow trigger failed - referral exists but no workflow
      console.error('YOXA workflow trigger failed:', yoxaError.message);
      
      // Update referral status to indicate failure
      await supabase
        .from('referrals')
        .update({ status: 'pending' }) // Keep as pending if workflow failed
        .eq('id', referral.id);
      
      // Still return the referral but indicate workflow failure with camelCase
      res.status(201).json({
        success: true,
        referral: {
          id: referral.id,
          referralNumber: referral.referral_number,
          patientId: referral.patient_id,
          patientName: referral.patient_name,
          primaryDoctorId: referral.primary_doctor_id,
          primaryDoctorName: referral.primary_doctor_name,
          primaryOrganization: referral.primary_organization,
          requestedSpecialty: referral.requested_specialty,
          specialistPreference: referral.specialist_preference,
          referralReason: referral.referral_reason,
          serviceType: referral.service_type,
          urgency: referral.urgency,
          status: referral.status,
          createdAt: referral.created_at,
        },
        workflowRunId: null,
        workflowError: yoxaError.message,
        message: 'Referral created but YOXA workflow trigger failed. Manual intervention required.',
      });
    }
    
  } catch (error) {
    console.error('Error creating referral:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

/**
 * GET /api/referrals
 * Get all referrals
 */
router.get('/', async (req, res) => {
  try {
    let query = supabase.from('referrals').select('*').order('created_at', { ascending: false });

    if (req.user.role === 'specialist_doctor') {
      // Referrals already assigned to this specialist, plus ones still
      // unclaimed and matching their specialty.
      const orParts = [`specialist_id.eq.${req.userId}`];
      if (req.user.specialization) {
        orParts.push(`and(status.eq.routed,requested_specialty.eq.${req.user.specialization})`);
      }
      query = query.or(orParts.join(','));
    } else {
      query = query.eq('primary_doctor_id', req.userId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Transform to camelCase
    const transformed = (data || []).map(r => ({
      id: r.id,
      referralNumber: r.referral_number,
      patientId: r.patient_id,
      patientName: r.patient_name,
      primaryDoctorId: r.primary_doctor_id,
      primaryDoctorName: r.primary_doctor_name,
      primaryOrganization: r.primary_organization,
      specialistId: r.specialist_id,
      specialistName: r.specialist_name,
      specialistOrganization: r.specialist_organization,
      requestedSpecialty: r.requested_specialty,
      specialistPreference: r.specialist_preference,
      referralReason: r.referral_reason,
      serviceType: r.service_type,
      urgency: r.urgency,
      status: r.status,
      targetedDocuments: r.targeted_documents,
      coverageStatus: r.coverage_status,
      attendanceStatus: r.attendance_status,
      appointmentDetails: r.appointment_details,
      workflowRunId: r.workflow_run_id,
      trackerId: r.tracker_id,
      acknowledgmentDeadline: r.acknowledgment_deadline,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    res.json(transformed);
  } catch (error) {
    console.error('Error fetching referrals:', error);
    res.status(500).json({ error: 'Failed to fetch referrals' });
  }
});

/**
 * GET /api/referrals/:id
 * Get single referral by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('referrals')
      .select('*')
      .eq('id', req.params.id)
      .single();
    
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Referral not found' });
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching referral:', error);
    res.status(500).json({ error: 'Failed to fetch referral' });
  }
});

/**
 * PUT /api/referrals/:id
 * Update referral
 */
router.put('/:id', async (req, res) => {
  try {
    const b = req.body;
    const updateData = { updated_at: new Date().toISOString() };
    if (b.status !== undefined) updateData.status = b.status;
    if (b.specialistId !== undefined) updateData.specialist_id = b.specialistId;
    if (b.specialistName !== undefined) updateData.specialist_name = b.specialistName;
    if (b.specialistOrganization !== undefined) updateData.specialist_organization = b.specialistOrganization;
    if (b.referralReason !== undefined) updateData.referral_reason = b.referralReason;
    if (b.serviceType !== undefined) updateData.service_type = b.serviceType;
    if (b.urgency !== undefined) updateData.urgency = b.urgency;
    if (b.coverageStatus !== undefined) updateData.coverage_status = b.coverageStatus;
    if (b.attendanceStatus !== undefined) updateData.attendance_status = b.attendanceStatus;
    if (b.appointmentDetails !== undefined) updateData.appointment_details = b.appointmentDetails;

    const { data, error } = await supabase
      .from('referrals')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error updating referral:', error);
    res.status(500).json({ error: 'Failed to update referral' });
  }
});

/**
 * POST /api/referrals/:id/accept
 * Accept referral (specialist action)
 */
/**
 * Advances (or fails) the acceptance_and_records stage on the referral's
 * flight tracker. Mirrors the pattern used for coverage_verification in
 * yoxa.js's coverage-preapproval-verification handler.
 */
async function patchAcceptanceStage(trackerId, { status, notes, agentAction }) {
  if (!trackerId) return;
  const { data: tracker } = await supabase.from('flight_trackers').select('*').eq('id', trackerId).single();
  if (!tracker) return;

  const now = new Date().toISOString();
  const updatedStages = (tracker.stages || []).map((stage) => {
    if (stage.stage !== 'acceptance_and_records') return stage;
    return {
      ...stage,
      status,
      startedAt: stage.startedAt || now,
      completedAt: now,
      notes,
      agentActions: agentAction ? [...(stage.agentActions || []), agentAction] : stage.agentActions,
    };
  });

  await supabase.from('flight_trackers').update({ stages: updatedStages }).eq('id', trackerId);
}

router.post('/:id/accept', async (req, res) => {
  try {
    const { notes } = req.body;

    const { data: referral, error: findError } = await supabase
      .from('referrals')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (findError || !referral) return res.status(404).json({ error: 'Referral not found' });

    const specialistName = `${req.user.first_name} ${req.user.last_name}`;

    const { data, error } = await supabase
      .from('referrals')
      .update({
        status: 'accepted',
        specialist_id: req.userId,
        specialist_name: specialistName,
        specialist_organization: req.user.organization,
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    await patchAcceptanceStage(referral.tracker_id, {
      status: 'completed',
      notes: notes ? `Accepted by ${specialistName}: ${notes}` : `Accepted by ${specialistName}`,
      agentAction: {
        id: `action-${Date.now()}`,
        toolName: 'specialist_acceptance',
        timestamp: new Date().toISOString(),
        status: 'success',
        description: 'Specialist accepted the referral',
        result: specialistName,
      },
    });

    res.json(data);
  } catch (error) {
    console.error('Error accepting referral:', error);
    res.status(500).json({ error: 'Failed to accept referral' });
  }
});

/**
 * POST /api/referrals/:id/deny
 * Deny referral (specialist action)
 */
router.post('/:id/deny', async (req, res) => {
  try {
    const { reason } = req.body;

    const { data: referral, error: findError } = await supabase
      .from('referrals')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (findError || !referral) return res.status(404).json({ error: 'Referral not found' });

    const { data, error } = await supabase
      .from('referrals')
      .update({
        status: 'denied',
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    // Persist the decline reason by messaging the referring primary doctor —
    // there is no dedicated column for it, and this makes it actually visible
    // instead of silently discarded.
    if (reason && referral.primary_doctor_id) {
      const senderName = `${req.user.first_name} ${req.user.last_name}`;
      await supabase.from('messages').insert({
        referral_id: referral.id,
        sender_id: req.userId,
        sender_name: senderName,
        sender_role: roleLabel(req.user.role),
        recipient_id: referral.primary_doctor_id,
        recipient_name: referral.primary_doctor_name,
        subject: `Referral ${referral.referral_number} declined`,
        content: reason,
        is_read: false,
      });

      await supabase.from('notifications').insert({
        user_id: referral.primary_doctor_id,
        type: 'referral',
        title: 'Referral declined',
        message: `${senderName} declined referral ${referral.referral_number}: ${reason}`,
        referral_id: referral.id,
      });
    }

    await patchAcceptanceStage(referral.tracker_id, {
      status: 'requires_attention',
      notes: reason ? `Declined: ${reason}` : 'Declined by specialist',
    });

    res.json(data);
  } catch (error) {
    console.error('Error denying referral:', error);
    res.status(500).json({ error: 'Failed to deny referral' });
  }
});

/**
 * GET /api/referrals/:id/messages
 * Full message thread for a referral
 */
router.get('/:id/messages', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('referral_id', req.params.id)
      .order('sent_at', { ascending: true });

    if (error) throw error;

    const transformed = (data || []).map((m) => ({
      id: m.id,
      referralId: m.referral_id,
      senderId: m.sender_id,
      senderName: m.sender_name,
      senderRole: m.sender_role,
      recipientId: m.recipient_id,
      recipientName: m.recipient_name,
      subject: m.subject,
      content: m.content,
      attachments: m.attachments,
      isRead: m.is_read,
      sentAt: m.sent_at,
      repliedAt: m.replied_at,
    }));

    res.json(transformed);
  } catch (error) {
    console.error('Error fetching referral messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

export default router;
