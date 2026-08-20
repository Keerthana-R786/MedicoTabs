import express from 'express';
import { supabase } from '../config/database.js';

const router = express.Router();

// 1. Calculate Urgency SLA
router.post('/calculate-urgency-sla', async (req, res) => {
  try {
    const { referral_id, urgency_level } = req.body;

    // SLA rules: Emergency=2hrs, Urgent=8hrs, Routine=48hrs
    const slaHours = {
      'Emergency': 2,
      'Urgent': 8,
      'Routine': 48
    };

    const priorityScores = {
      'Emergency': 10,
      'Urgent': 7,
      'Routine': 3
    };

    const hours = slaHours[urgency_level] || 48;
    const slaDeadline = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    const ackDeadline = new Date(Date.now() + (hours * 0.25) * 60 * 60 * 1000).toISOString();

    res.json({
      referral_id,
      urgency_level,
      sla_deadline: slaDeadline,
      priority_score: priorityScores[urgency_level] || 3,
      time_remaining_hours: hours,
      acknowledgment_deadline: ackDeadline,
      escalation_required: urgency_level === 'Emergency',
      calculated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Calculate SLA error:', error);
    res.status(500).json({ error: 'Failed to calculate SLA' });
  }
});

// 2. Get Patient Data
router.post('/get-patient-data', async (req, res) => {
  try {
    const { patient_id, include_documents } = req.body;

    const { data: patient, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patient_id)
      .single();

    if (error) throw error;

    const response = {
      patient_id: patient.id,
      referral_id: patient.referralId,
      first_name: patient.firstName,
      last_name: patient.lastName,
      date_of_birth: patient.dateOfBirth,
      gender: patient.gender,
      contact_number: patient.contactNumber,
      email: patient.email,
      address: patient.address,
      insurance_provider: patient.insuranceProvider,
      insurance_id: patient.insuranceId,
      medical_history: patient.medicalHistory || '',
      allergies: patient.allergies || '',
      current_medications: patient.currentMedications || ''
    };

    if (include_documents) {
      const { data: docs } = await supabase
        .from('patient_documents')
        .select('id, fileName, category')
        .eq('patientId', patient_id);
      
      response.documents = docs?.map(d => ({
        document_id: d.id,
        file_name: d.fileName,
        category: d.category
      })) || [];
    }

    res.json(response);
  } catch (error) {
    console.error('Get patient data error:', error);
    res.status(500).json({ error: 'Failed to retrieve patient data' });
  }
});

// 3. Get Clinical Summary
router.post('/get-clinical-summary', async (req, res) => {
  try {
    const { patient_id, referral_id } = req.body;

    const { data: referral, error: refError } = await supabase
      .from('referrals')
      .select('*, patients(*)')
      .eq('id', referral_id)
      .single();

    if (refError) throw refError;

    res.json({
      patient_id,
      referral_id,
      chief_complaint: referral.referralReason || 'Not specified',
      clinical_findings: referral.clinicalNotes || 'Pending evaluation',
      diagnosis: referral.diagnosis || 'Under investigation',
      treatment_history: referral.patients?.medicalHistory || 'No prior treatment documented',
      reason_for_referral: referral.referralReason,
      urgency_level: referral.urgency,
      requested_specialty: referral.requestedSpecialty,
      primary_doctor_name: referral.primaryDoctorName,
      primary_organization: referral.primaryOrganization
    });
  } catch (error) {
    console.error('Get clinical summary error:', error);
    res.status(500).json({ error: 'Failed to retrieve clinical summary' });
  }
});

// 4. Generate Referral Letter
router.post('/generate-referral-letter', async (req, res) => {
  try {
    const { 
      referral_id, 
      patient_name, 
      clinical_summary, 
      requesting_provider,
      requesting_organization,
      specialty_required,
      urgency
    } = req.body;

    const letterContent = `
REFERRAL LETTER

Date: ${new Date().toLocaleDateString()}
Referral ID: ${referral_id}

TO: ${specialty_required} Specialist
FROM: ${requesting_provider}, ${requesting_organization}

RE: ${patient_name}

Dear Colleague,

I am referring the above patient for ${specialty_required} consultation.

CLINICAL SUMMARY:
${clinical_summary}

URGENCY: ${urgency}

Please contact us if you require additional information.

Sincerely,
${requesting_provider}
${requesting_organization}
    `.trim();

    res.json({
      referral_id,
      letter_content: letterContent,
      document_id: `doc-${Date.now()}`,
      generated_at: new Date().toISOString(),
      letter_format: 'text/plain'
    });
  } catch (error) {
    console.error('Generate referral letter error:', error);
    res.status(500).json({ error: 'Failed to generate referral letter' });
  }
});

// 5. Check Insurance Eligibility
router.post('/check-insurance-eligibility', async (req, res) => {
  try {
    const { patient_id, referral_id, insurance_provider, insurance_id, specialty_type } = req.body;

    // Simulate insurance verification
    const isEligible = Math.random() > 0.2; // 80% eligible rate
    const priorAuthRequired = Math.random() > 0.7; // 30% need prior auth

    const { data: verification } = await supabase
      .from('coverage_verifications')
      .insert({
        referralId: referral_id,
        patientId: patient_id,
        insuranceProvider: insurance_provider,
        insuranceMemberId: insurance_id,
        verificationStatus: isEligible ? 'verified' : 'denied',
        coverageConfirmed: isEligible,
        copayAmount: isEligible ? 25.00 : 0,
        deductibleRemaining: isEligible ? 500.00 : 0,
        priorAuthRequired: priorAuthRequired,
        verifiedAt: new Date().toISOString()
      })
      .select()
      .single();

    res.json({
      referral_id,
      patient_id,
      is_eligible: isEligible,
      coverage_status: isEligible ? 'Active' : 'Inactive',
      copay_amount: isEligible ? 25.00 : 0,
      prior_auth_required: priorAuthRequired,
      coverage_details: isEligible 
        ? `Coverage confirmed for ${specialty_type} consultation` 
        : 'Coverage not available for requested specialty',
      verified_at: new Date().toISOString(),
      eligibility_message: isEligible 
        ? 'Patient is eligible for specialist consultation' 
        : 'Please contact insurance for eligibility confirmation'
    });
  } catch (error) {
    console.error('Check insurance eligibility error:', error);
    res.status(500).json({ error: 'Failed to verify insurance eligibility' });
  }
});

// 6. Get Specialist Availability
router.post('/get-specialist-availability', async (req, res) => {
  try {
    const { specialty_type, referral_id, urgency } = req.body;

    // Mock specialist availability
    const specialists = [
      {
        specialist_id: 'spec-001',
        specialist_name: 'Dr. Sarah Chen',
        organization: 'Lakeside Medical Center',
        specialty: specialty_type,
        available_slots: [
          { slot_id: 'slot-001', date: '2026-08-22', time: '09:00 AM', duration_minutes: 30 },
          { slot_id: 'slot-002', date: '2026-08-22', time: '02:00 PM', duration_minutes: 30 },
          { slot_id: 'slot-003', date: '2026-08-23', time: '10:30 AM', duration_minutes: 30 }
        ]
      },
      {
        specialist_id: 'spec-002',
        specialist_name: 'Dr. Michael Rodriguez',
        organization: 'University Hospital',
        specialty: specialty_type,
        available_slots: [
          { slot_id: 'slot-004', date: '2026-08-21', time: '03:00 PM', duration_minutes: 45 },
          { slot_id: 'slot-005', date: '2026-08-24', time: '11:00 AM', duration_minutes: 45 }
        ]
      }
    ];

    res.json({
      referral_id,
      specialists_available: urgency === 'Emergency' ? specialists : specialists.slice(0, 1)
    });
  } catch (error) {
    console.error('Get specialist availability error:', error);
    res.status(500).json({ error: 'Failed to retrieve specialist availability' });
  }
});

// 7. Book Appointment
router.post('/book-appointment', async (req, res) => {
  try {
    const { 
      referral_id, 
      patient_id, 
      specialist_id, 
      slot_id,
      appointment_date,
      appointment_time,
      notes
    } = req.body;

    const confirmationNumber = `CONF-${Date.now()}`;

    // Update referral with appointment info
    await supabase
      .from('referrals')
      .update({
        status: 'scheduled',
        scheduledDate: appointment_date,
        updatedAt: new Date().toISOString()
      })
      .eq('id', referral_id);

    res.json({
      appointment_id: `appt-${Date.now()}`,
      referral_id,
      patient_id,
      specialist_id,
      specialist_name: 'Dr. Sarah Chen',
      status: 'confirmed',
      confirmation_number: confirmationNumber,
      appointment_date,
      appointment_time,
      location: 'Lakeside Medical Center, Suite 302',
      booked_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Book appointment error:', error);
    res.status(500).json({ error: 'Failed to book appointment' });
  }
});

// 8. Send Secure Message
router.post('/send-secure-message', async (req, res) => {
  try {
    const { 
      referral_id, 
      sender_id, 
      recipient_id, 
      message_content,
      message_type,
      priority 
    } = req.body;

    const { data: message } = await supabase
      .from('messages')
      .insert({
        referralId: referral_id,
        senderId: sender_id,
        recipientId: recipient_id,
        subject: message_type || 'Referral Communication',
        content: message_content,
        isRead: false,
        sentAt: new Date().toISOString()
      })
      .select()
      .single();

    res.json({
      message_id: message.id,
      referral_id,
      sender_id,
      recipient_id,
      status: 'sent',
      sent_at: new Date().toISOString(),
      delivery_status: 'delivered'
    });
  } catch (error) {
    console.error('Send secure message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// 9. Get Treatment Guidelines
router.post('/get-treatment-guidelines', async (req, res) => {
  try {
    const { diagnosis, specialty, patient_age, comorbidities } = req.body;

    // Mock clinical guidelines
    const guidelines = [
      {
        guideline_id: 'guide-001',
        title: `Evidence-Based Treatment for ${diagnosis}`,
        source: 'American Medical Association',
        recommendation: 'Initial conservative management recommended with specialist consultation',
        evidence_level: 'Level A - Strong Evidence'
      },
      {
        guideline_id: 'guide-002',
        title: `${specialty} Clinical Protocol`,
        source: 'National Guidelines Clearinghouse',
        recommendation: 'Comprehensive evaluation including diagnostic imaging and laboratory tests',
        evidence_level: 'Level B - Moderate Evidence'
      }
    ];

    res.json({
      diagnosis,
      specialty,
      guidelines,
      clinical_notes: `Guidelines based on patient age: ${patient_age || 'not specified'}`,
      references: [
        'AMA Clinical Practice Guidelines 2025',
        'Specialty-Specific Treatment Protocols'
      ]
    });
  } catch (error) {
    console.error('Get treatment guidelines error:', error);
    res.status(500).json({ error: 'Failed to retrieve treatment guidelines' });
  }
});

// 10. Update Patient Record
router.post('/update-patient-record', async (req, res) => {
  try {
    const { 
      patient_id, 
      referral_id, 
      update_type,
      appointment_details,
      coverage_status,
      clinical_notes 
    } = req.body;

    const updates = {
      updatedAt: new Date().toISOString()
    };

    if (clinical_notes) {
      const { data: patient } = await supabase
        .from('patients')
        .select('medicalHistory')
        .eq('id', patient_id)
        .single();

      updates.medicalHistory = `${patient?.medicalHistory || ''}\n\n[${new Date().toLocaleDateString()}] ${clinical_notes}`;
    }

    await supabase
      .from('patients')
      .update(updates)
      .eq('id', patient_id);

    res.json({
      patient_id,
      referral_id,
      status: 'updated',
      updated_at: new Date().toISOString(),
      update_summary: `Patient record updated with ${update_type} information`
    });
  } catch (error) {
    console.error('Update patient record error:', error);
    res.status(500).json({ error: 'Failed to update patient record' });
  }
});

// 11. Generate Prior Authorization
router.post('/generate-prior-auth', async (req, res) => {
  try {
    const { 
      referral_id, 
      patient_id, 
      insurance_provider,
      insurance_id,
      procedure_code,
      clinical_justification,
      diagnosis_codes 
    } = req.body;

    const authRequestId = `PA-${Date.now()}`;
    const referenceNumber = `REF-${Math.random().toString(36).substring(7).toUpperCase()}`;

    res.json({
      auth_request_id: authRequestId,
      referral_id,
      patient_id,
      status: 'submitted',
      reference_number: referenceNumber,
      submitted_at: new Date().toISOString(),
      estimated_response_time: '48-72 hours',
      request_document_id: `doc-pa-${Date.now()}`
    });
  } catch (error) {
    console.error('Generate prior auth error:', error);
    res.status(500).json({ error: 'Failed to generate prior authorization' });
  }
});

// 12. Notify Patient
router.post('/notify-patient', async (req, res) => {
  try {
    const { 
      patient_id, 
      referral_id, 
      notification_type,
      message_content,
      delivery_method,
      appointment_details 
    } = req.body;

    const notificationId = `notif-${Date.now()}`;

    // Store notification in database
    await supabase
      .from('notifications')
      .insert({
        userId: patient_id,
        type: notification_type,
        title: `Referral ${notification_type.replace('_', ' ')}`,
        message: message_content,
        isRead: false,
        createdAt: new Date().toISOString()
      });

    res.json({
      notification_id: notificationId,
      patient_id,
      referral_id,
      status: 'sent',
      delivery_method: delivery_method || 'email',
      sent_at: new Date().toISOString(),
      delivery_status: 'delivered'
    });
  } catch (error) {
    console.error('Notify patient error:', error);
    res.status(500).json({ error: 'Failed to send patient notification' });
  }
});

export default router;
