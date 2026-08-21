import express from 'express';
import { supabase } from '../config/database.js';
import { triggerWorkflow } from '../services/yoxaService.js';

const router = express.Router();

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
        primary_doctor_id: primaryDoctorId || null, // Set to null if not provided or invalid
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
            { stage: 'coverage_verification', status: 'pending', agentActions: [] },
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
          user_id: primaryDoctorId,
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
    const { data, error } = await supabase
      .from('referrals')
      .select('*')
      .order('created_at', { ascending: false });
    
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
      requestedSpecialty: r.requested_specialty,
      specialistPreference: r.specialist_preference,
      referralReason: r.referral_reason,
      serviceType: r.service_type,
      urgency: r.urgency,
      status: r.status,
      workflowRunId: r.workflow_run_id,
      trackerId: r.tracker_id,
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
    const { data, error } = await supabase
      .from('referrals')
      .update(req.body)
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
router.post('/:id/accept', async (req, res) => {
  try {
    const { notes } = req.body;
    
    const { data, error } = await supabase
      .from('referrals')
      .update({
        status: 'accepted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    
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
    
    res.json(data);
  } catch (error) {
    console.error('Error denying referral:', error);
    res.status(500).json({ error: 'Failed to deny referral' });
  }
});

export default router;
