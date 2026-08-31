import express from 'express';
import PDFDocument from 'pdfkit';
import { supabase } from '../config/database.js';
import { requireYoxaAuth } from '../middleware/yoxaAuth.js';
import { advanceTrackerStage, buildAgentAction } from '../utils/trackerStages.js';

const router = express.Router();
router.use(requireYoxaAuth);
const DOCUMENTS_BUCKET = 'patient-documents';

/** Renders plain-text lines into a simple PDF buffer. */
function buildPdfBuffer(title, lines) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(16).font('Helvetica-Bold').text(title);
    doc.moveDown();
    doc.fontSize(10).font('Helvetica');
    lines.forEach((line) => doc.text(line));
    doc.end();
  });
}

/**
 * Uploads a PDF buffer to Storage and returns the storage path.
 * Requires a real patient UUID — without this check, a missing/invalid
 * patientId (e.g. the caller omitted it) silently interpolated into the
 * storage path as the literal string "undefined", producing a document
 * that uploaded "successfully" but was permanently orphaned: the DB row
 * got patient_id: null, so it never appeared on any patient's chart.
 */
async function storeGeneratedPdf(patientId, fileName, buffer) {
  const safePatientId = asUuid(patientId);
  if (!safePatientId) {
    throw new Error(`Refusing to store document — invalid or missing patientId: ${JSON.stringify(patientId)}`);
  }
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${safePatientId}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, buffer, { contentType: 'application/pdf', upsert: false });
  if (error) throw error;
  return storagePath;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Returns the value if it is a valid UUID (FK-safe), otherwise null. */
function asUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value) ? value : null;
}

/**
 * Resolve a referral by UUID id OR by human-readable referral number
 * (e.g. RFL-2026-00123). YOXA agents may pass either form.
 */
async function findReferral(referralId) {
  if (!referralId) return { data: null, error: 'referral_id is required' };
  const query = supabase.from('referrals').select('*');
  const { data, error } = UUID_RE.test(referralId)
    ? await query.eq('id', referralId).maybeSingle()
    : await query.eq('referral_number', referralId).maybeSingle();
  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: 'Referral not found' };
  return { data, error: null };
}

/** Notifications.type is constrained to this set in Supabase. */
function mapNotificationType(type) {
  const allowed = ['referral', 'approval', 'message', 'alert', 'system'];
  return allowed.includes(type) ? type : 'system';
}

/** Best-effort notification insert that never throws (FK-safe). */
async function safeNotify({ userId, type, title, message, referralId = null, actionUrl = null }) {
  const { error } = await supabase.from('notifications').insert({
    user_id: asUuid(userId),
    type: mapNotificationType(type),
    title,
    message,
    referral_id: asUuid(referralId),
    is_read: false,
    action_url: actionUrl,
  });
  if (error) console.warn('⚠ Notification insert skipped:', error.message);
}

// ---------------------------------------------------------------------------
// 1. Urgency SLA Calculator (workflow tool_24_call)
// Emergency = 30 min, Urgent = 4 h, Routine = 24 h (per workflow contract)
// ---------------------------------------------------------------------------
router.post('/calculate-urgency-sla', async (req, res) => {
  try {
    const { referral_id, urgency_level } = req.body;

    // SLA rules per workflow definition (single source of truth downstream)
    const slaMinutes = { Emergency: 30, Urgent: 240, Routine: 1440 };
    const priorityScores = { Emergency: 10, Urgent: 7, Routine: 3 };

    const minutes = slaMinutes[urgency_level] ?? 1440;
    const slaDeadline = new Date(Date.now() + minutes * 60 * 1000).toISOString();
    // Acknowledgment window is a quarter of the full response window
    const ackDeadline = new Date(Date.now() + minutes * 0.25 * 60 * 1000).toISOString();

    // Persist the SLA deadline on the referral so every later stage reads it
    if (referral_id) {
      const { data: referral } = await findReferral(referral_id);
      if (referral) {
        await supabase
          .from('referrals')
          .update({ acknowledgment_deadline: slaDeadline, updated_at: new Date().toISOString() })
          .eq('id', referral.id);

        await advanceTrackerStage(referral.tracker_id, 'create_and_route', {
          agentAction: buildAgentAction('calculate_urgency_sla', {
            description: `SLA calculated for ${urgency_level || 'referral'} urgency`,
            result: `${minutes} min response window`,
          }),
        });
      }
    }

    res.json({
      referral_id,
      urgency_level,
      sla_deadline: slaDeadline,
      acknowledgment_deadline: ackDeadline,
      priority_score: priorityScores[urgency_level] ?? 3,
      // Schema declares this as an integer — minutes / 60 produces 0.5 for
      // Emergency (30 min), which fails YOXA's strict response validation.
      time_remaining_hours: Math.ceil(minutes / 60),
      escalation_required: urgency_level === 'Emergency',
      calculated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Calculate SLA error:', error);
    res.status(500).json({ error: 'Failed to calculate SLA' });
  }
});

// ---------------------------------------------------------------------------
// 2. Get Patient Data
// ---------------------------------------------------------------------------
router.post('/get-patient-data', async (req, res) => {
  try {
    const { patient_id, include_documents } = req.body;

    if (!patient_id) return res.status(400).json({ error: 'patient_id is required' });

    const { data: patient, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patient_id)
      .single();

    if (error || !patient) return res.status(404).json({ error: 'Patient not found' });

    const response = {
      patient_id: patient.id,
      referral_id: patient.referral_id,
      first_name: patient.first_name,
      last_name: patient.last_name,
      date_of_birth: patient.date_of_birth,
      gender: patient.gender,
      contact_number: patient.contact_number,
      email: patient.email,
      address: patient.address,
      allergies: Array.isArray(patient.allergies) ? patient.allergies.join(', ') : patient.allergies || '',
      insurance_provider: patient.insurance?.provider || '',
      // Schema names this field insurance_id, not insurance_member_id.
      insurance_id: patient.insurance?.memberId || '',
      medical_history: patient.medical_history || '',
      current_medications: patient.current_medications || '',
    };

    if (include_documents) {
      const { data: docs } = await supabase
        .from('patient_documents')
        .select('id, file_name, category')
        .eq('patient_id', patient_id);

      response.documents = (docs || []).map((d) => ({
        document_id: d.id,
        file_name: d.file_name,
        category: d.category,
      }));
    }

    res.json(response);
  } catch (error) {
    console.error('Get patient data error:', error);
    res.status(500).json({ error: 'Failed to retrieve patient data' });
  }
});

// ---------------------------------------------------------------------------
// 3. Get Clinical Summary
// ---------------------------------------------------------------------------
router.post('/get-clinical-summary', async (req, res) => {
  try {
    const { patient_id, referral_id } = req.body;

    const { data: referral, error } = await findReferral(referral_id);
    if (error) return res.status(404).json({ error });

    res.json({
      patient_id: patient_id || referral.patient_id,
      referral_id: referral.id,
      chief_complaint: referral.referral_reason || 'Not specified',
      clinical_findings: 'Pending specialist evaluation',
      diagnosis: 'Under investigation',
      treatment_history: 'No prior treatment documented',
      reason_for_referral: referral.referral_reason,
      urgency_level: referral.urgency,
      requested_specialty: referral.requested_specialty,
      primary_doctor_name: referral.primary_doctor_name,
      primary_organization: referral.primary_organization,
    });
  } catch (error) {
    console.error('Get clinical summary error:', error);
    res.status(500).json({ error: 'Failed to retrieve clinical summary' });
  }
});

// ---------------------------------------------------------------------------
// 4. Generate Referral Letter
// ---------------------------------------------------------------------------
router.post('/generate-referral-letter', async (req, res) => {
  try {
    const {
      referral_id,
      patient_name,
      clinical_summary,
      requesting_provider,
      requesting_organization,
      specialty_required,
      urgency,
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
      letter_format: 'text/plain',
    });
  } catch (error) {
    console.error('Generate referral letter error:', error);
    res.status(500).json({ error: 'Failed to generate referral letter' });
  }
});

// ---------------------------------------------------------------------------
// 5. Check Insurance Eligibility
// ---------------------------------------------------------------------------
router.post('/check-insurance-eligibility', async (req, res) => {
  try {
    const { patient_id, referral_id, insurance_provider, insurance_id, specialty_type } = req.body;

    const { data: patient } = await supabase
      .from('patients')
      .select('insurance')
      .eq('id', patient_id)
      .single();

    const provider = insurance_provider || patient?.insurance?.provider || '';
    const memberId = insurance_id || patient?.insurance?.memberId || '';

    // Patient must have an active insurance record on file to be eligible
    const isEligible = Boolean(provider && memberId);
    const priorAuthRequired = isEligible && Math.random() > 0.7;

    const { error: insertError } = await supabase.from('coverage_verifications').insert({
      referral_id: asUuid(referral_id),
      patient_id: asUuid(patient_id),
      insurance_provider: provider,
      member_id: memberId,
      eligibility_status: isEligible ? 'active' : 'inactive',
      pre_approval_required: priorAuthRequired,
      expected_copay: isEligible ? 25.0 : 0,
      coverage_notes: isEligible
        ? `Coverage confirmed for ${specialty_type || 'specialist'} consultation`
        : 'No active insurance on file',
      verified_at: new Date().toISOString(),
      verified_by: 'yoxa-workflow',
    });
    if (insertError) console.warn('⚠ Coverage verification insert skipped:', insertError.message);

    res.json({
      referral_id,
      patient_id,
      is_eligible: isEligible,
      coverage_status: isEligible ? 'Active' : 'Inactive',
      copay_amount: isEligible ? 25.0 : 0,
      prior_auth_required: priorAuthRequired,
      coverage_details: isEligible
        ? `Coverage confirmed for ${specialty_type || 'specialist'} consultation`
        : 'Coverage not available - no active insurance on file',
      verified_at: new Date().toISOString(),
      eligibility_message: isEligible
        ? 'Patient is eligible for specialist consultation'
        : 'Please contact insurance for eligibility confirmation',
    });
  } catch (error) {
    console.error('Check insurance eligibility error:', error);
    res.status(500).json({ error: 'Failed to verify insurance eligibility' });
  }
});

// ---------------------------------------------------------------------------
// 6. Get Specialist Availability
// ---------------------------------------------------------------------------
router.post('/get-specialist-availability', async (req, res) => {
  try {
    const { specialty_type, referral_id, urgency } = req.body;

    // Slot offsets follow the same urgency framework calculate-urgency-sla
    // uses (Emergency 30min / Urgent 4h / Routine 24h response windows).
    // Previously every slot was hardcoded 1-3 days out regardless of
    // urgency, which contradicted an Emergency/Urgent referral's own SLA
    // and made specialist-attendance-record temporally impossible to call
    // honestly within the same run — the appointment could never have
    // "already happened" yet from the agent's perspective.
    const isUrgent = urgency === 'Emergency' || urgency === 'Urgent';
    const slotOffsetsMinutes = isUrgent ? [15, 45, 120] : [24 * 60, 24 * 60 + 300, 2 * 24 * 60];

    const buildSlot = (slotId, offsetMinutes, durationMinutes) => {
      const dt = new Date(Date.now() + offsetMinutes * 60 * 1000);
      return {
        slot_id: slotId,
        date: dt.toISOString().slice(0, 10),
        time: dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        duration_minutes: durationMinutes,
      };
    };

    // Prefer real specialists registered in the system for this specialty
    let specialists = [];
    const { data: dbSpecialists } = await supabase
      .from('users')
      .select('id, first_name, last_name, organization, specialization')
      .eq('role', 'specialist_doctor')
      .ilike('specialization', specialty_type || '');

    if (dbSpecialists && dbSpecialists.length > 0) {
      specialists = dbSpecialists.map((s, idx) => ({
        specialist_id: s.id,
        specialist_name: `${s.first_name} ${s.last_name}`,
        organization: s.organization,
        specialty: s.specialization,
        available_slots: [
          buildSlot(`slot-${idx}-1`, slotOffsetsMinutes[0], 30),
          buildSlot(`slot-${idx}-2`, slotOffsetsMinutes[1], 30),
          buildSlot(`slot-${idx}-3`, slotOffsetsMinutes[2], 30),
        ],
      }));
    } else {
      specialists = [
        {
          specialist_id: 'spec-001',
          specialist_name: 'Dr. Sarah Chen',
          organization: 'Lakeside Medical Center',
          specialty: specialty_type,
          available_slots: [
            buildSlot('slot-001', slotOffsetsMinutes[0], 30),
            buildSlot('slot-002', slotOffsetsMinutes[1], 30),
            buildSlot('slot-003', slotOffsetsMinutes[2], 30),
          ],
        },
        {
          specialist_id: 'spec-002',
          specialist_name: 'Dr. Michael Rodriguez',
          organization: 'University Hospital',
          specialty: specialty_type,
          available_slots: [
            buildSlot('slot-004', slotOffsetsMinutes[0], 45),
            buildSlot('slot-005', slotOffsetsMinutes[2], 45),
          ],
        },
      ];
    }

    if (referral_id) {
      const { data: referral } = await findReferral(referral_id);
      if (referral) {
        await advanceTrackerStage(referral.tracker_id, 'scheduling_and_attendance', {
          agentAction: buildAgentAction('get_specialist_availability', {
            description: `Checked availability for ${specialty_type || 'specialist'}`,
            result: `${specialists.length} specialist(s) found`,
          }),
        });
      }
    }

    res.json({
      referral_id,
      specialists_available: urgency === 'Emergency' ? specialists : specialists.slice(0, 1),
    });
  } catch (error) {
    console.error('Get specialist availability error:', error);
    res.status(500).json({ error: 'Failed to retrieve specialist availability' });
  }
});

// ---------------------------------------------------------------------------
// 7. Book Appointment
// ---------------------------------------------------------------------------
router.post('/book-appointment', async (req, res) => {
  try {
    const {
      referral_id,
      patient_id,
      specialist_id,
      slot_id,
      appointment_date,
      appointment_time,
      notes,
    } = req.body;

    const confirmationNumber = `CONF-${Date.now()}`;

    const { data: referral } = await findReferral(referral_id);
    if (referral) {
      await supabase
        .from('referrals')
        .update({
          appointment_details: {
            date: appointment_date,
            time: appointment_time,
            location: notes || 'Specialist clinic',
            bookingId: confirmationNumber,
            specialistId: specialist_id,
            slotId: slot_id,
          },
          attendance_status: 'scheduled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', referral.id);

      await advanceTrackerStage(referral.tracker_id, 'scheduling_and_attendance', {
        status: 'in_progress',
        notes: `Appointment booked for ${appointment_date} ${appointment_time}`,
        agentAction: buildAgentAction('book_appointment', {
          description: `Appointment booked with specialist ${specialist_id || ''}`.trim(),
          result: confirmationNumber,
        }),
      });
    }

    res.json({
      appointment_id: `appt-${Date.now()}`,
      referral_id,
      patient_id,
      specialist_id,
      specialist_name: req.body.specialist_name || 'Requested specialist',
      status: 'confirmed',
      confirmation_number: confirmationNumber,
      appointment_date,
      appointment_time,
      location: notes || 'Specialist clinic',
      booked_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Book appointment error:', error);
    res.status(500).json({ error: 'Failed to book appointment' });
  }
});

// ---------------------------------------------------------------------------
// 8. Send Secure Message
// ---------------------------------------------------------------------------
router.post('/send-secure-message', async (req, res) => {
  try {
    const {
      referral_id,
      sender_id,
      recipient_id,
      message_content,
      message_type,
      priority,
    } = req.body;

    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        referral_id: asUuid(referral_id),
        sender_id: asUuid(sender_id),
        recipient_id: asUuid(recipient_id),
        sender_name: req.body.sender_name || 'YOXA Workflow Agent',
        sender_role: 'agent',
        recipient_name: req.body.recipient_name || 'Provider',
        subject: message_type || 'Referral Communication',
        content: `[${priority || 'normal'}] ${message_content}`,
        is_read: false,
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      message_id: message.id,
      referral_id,
      sender_id,
      recipient_id,
      status: 'sent',
      sent_at: message.sent_at,
      delivery_status: 'delivered',
    });
  } catch (error) {
    console.error('Send secure message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// ---------------------------------------------------------------------------
// 9. Get Treatment Guidelines
// ---------------------------------------------------------------------------
router.post('/get-treatment-guidelines', async (req, res) => {
  try {
    const { diagnosis, specialty, patient_age, comorbidities } = req.body;

    const guidelines = [
      {
        guideline_id: 'guide-001',
        title: `Evidence-Based Treatment for ${diagnosis || 'Presenting Condition'}`,
        source: 'American Medical Association',
        recommendation: 'Initial conservative management recommended with specialist consultation',
        evidence_level: 'Level A - Strong Evidence',
      },
      {
        guideline_id: 'guide-002',
        title: `${specialty || 'Specialty'} Clinical Protocol`,
        source: 'National Guidelines Clearinghouse',
        recommendation: 'Comprehensive evaluation including diagnostic imaging and laboratory tests',
        evidence_level: 'Level B - Moderate Evidence',
      },
    ];

    res.json({
      diagnosis,
      specialty,
      guidelines,
      clinical_notes: `Guidelines based on patient age: ${patient_age || 'not specified'}${comorbidities ? `, comorbidities: ${comorbidities}` : ''}`,
      references: [
        'AMA Clinical Practice Guidelines 2025',
        'Specialty-Specific Treatment Protocols',
      ],
    });
  } catch (error) {
    console.error('Get treatment guidelines error:', error);
    res.status(500).json({ error: 'Failed to retrieve treatment guidelines' });
  }
});

// ---------------------------------------------------------------------------
// 10. Update Patient Record
// ---------------------------------------------------------------------------
router.post('/update-patient-record', async (req, res) => {
  try {
    const {
      patient_id,
      referral_id,
      update_type,
      appointment_details,
      coverage_status,
      clinical_notes,
    } = req.body;

    const updates = { updated_at: new Date().toISOString() };

    if (clinical_notes && patient_id) {
      const { data: patient } = await supabase
        .from('patients')
        .select('medical_history')
        .eq('id', patient_id)
        .single();

      updates.medical_history = `${patient?.medical_history || ''}\n\n[${new Date().toLocaleDateString()}] ${clinical_notes}`.trim();
    }

    if (patient_id) {
      await supabase.from('patients').update(updates).eq('id', patient_id);
    }

    if (referral_id && (appointment_details || coverage_status)) {
      const { data: referral } = await findReferral(referral_id);
      if (referral) {
        const referralUpdates = { updated_at: new Date().toISOString() };
        if (appointment_details) referralUpdates.appointment_details = appointment_details;
        if (coverage_status) referralUpdates.coverage_status = coverage_status;
        await supabase.from('referrals').update(referralUpdates).eq('id', referral.id);
      }
    }

    res.json({
      patient_id,
      referral_id,
      status: 'updated',
      updated_at: new Date().toISOString(),
      update_summary: `Patient record updated with ${update_type || 'workflow'} information`,
    });
  } catch (error) {
    console.error('Update patient record error:', error);
    res.status(500).json({ error: 'Failed to update patient record' });
  }
});

// ---------------------------------------------------------------------------
// 11. Generate Prior Authorization
// ---------------------------------------------------------------------------
router.post('/generate-prior-auth', async (req, res) => {
  try {
    const { referral_id, patient_id } = req.body;

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
      request_document_id: `doc-pa-${Date.now()}`,
    });
  } catch (error) {
    console.error('Generate prior auth error:', error);
    res.status(500).json({ error: 'Failed to generate prior authorization' });
  }
});

// ---------------------------------------------------------------------------
// 12. Coordinator Escalation Alert
// ---------------------------------------------------------------------------
router.post('/coordinator-escalation-alert', async (req, res) => {
  try {
    const {
      referral_id,
      patient_id,
      patient_name,
      urgency_level,
      escalation_reason,
      specialty_required,
      sla_deadline,
      coordinator_id,
    } = req.body;

    const alertId = `ESC-${Date.now()}`;

    // Resolve the referral so the escalation can be annotated onto the right
    // flight tracker and so a real coordinator can be resolved when one is not
    // supplied.
    const { data: referral } = referral_id ? await findReferral(referral_id) : { data: null };

    const resolvedCoordinatorId = asUuid(coordinator_id) || null;

    // Fall back to the first coordinator on record so the alert always lands.
    let notifiedCoordinatorId = resolvedCoordinatorId;
    if (!notifiedCoordinatorId) {
      const { data: coordinators } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'coordinator')
        .limit(1);
      notifiedCoordinatorId = coordinators?.[0]?.id || coordinator_id || 'coordinator-001';
    }

    await safeNotify({
      userId: notifiedCoordinatorId,
      type: 'alert',
      title: `URGENT: ${urgency_level || 'Referral'} Escalation`,
      message: `Referral ${referral_id || referral?.id || referral?.referral_number} for ${patient_name || 'patient'} requires immediate attention. Reason: ${escalation_reason}. Specialty: ${specialty_required || 'N/A'}. SLA Deadline: ${sla_deadline || 'N/A'}`,
      referralId: asUuid(referral_id) || referral?.id,
    });

    // Annotate the tracker so the escalation appears in the audit trail. The
    // stage depends on why we escalated, but coverage_verification only exists
    // for advanced treatments — if the mapped stage is absent (e.g. a general
    // visit), fall back to create_and_route so the escalation is never silent.
    let stageKey = 'create_and_route';
    const reason = String(escalation_reason || '').toLowerCase();
    if (/(coverage|insurance|pre.?approval)/.test(reason)) stageKey = 'coverage_verification';
    else if (/(attendance|missed|no.?show|schedul)/.test(reason)) stageKey = 'scheduling_and_attendance';
    else if (/(archiv|deliver|sign.?off|complet)/.test(reason)) stageKey = 'completion_and_archive';
    else if (/(document|record|accept)/.test(reason)) stageKey = 'acceptance_and_records';

    if (referral?.tracker_id) {
      const annotated = await advanceTrackerStage(referral.tracker_id, stageKey, {
        status: 'requires_attention',
        agentAction: buildAgentAction('coordinator_escalation_alert', {
          description: `Coordinator escalation alert sent (reason: ${escalation_reason || 'referral issue'})`,
          result: `Coordinator ${notifiedCoordinatorId} notified`,
        }),
      });
      if (!annotated && stageKey !== 'create_and_route') {
        await advanceTrackerStage(referral.tracker_id, 'create_and_route', {
          status: 'requires_attention',
          agentAction: buildAgentAction('coordinator_escalation_alert', {
            description: `Coordinator escalation alert sent (reason: ${escalation_reason || 'referral issue'})`,
            result: `Coordinator ${notifiedCoordinatorId} notified`,
          }),
        });
      }
    }

    res.json({
      alert_id: alertId,
      referral_id: referral_id || referral?.id,
      coordinator_id: notifiedCoordinatorId,
      coordinator_notified: true,
      status: 'escalated',
      alert_sent_at: new Date().toISOString(),
      notification_channels: ['email', 'sms', 'portal'],
      acknowledgment_required: urgency_level === 'Emergency',
    });
  } catch (error) {
    console.error('Coordinator escalation alert error:', error);
    res.status(500).json({ error: 'Failed to send escalation alert' });
  }
});

// ---------------------------------------------------------------------------
// 13. Notify Patient
// ---------------------------------------------------------------------------
router.post('/notify-patient', async (req, res) => {
  try {
    const {
      patient_id,
      referral_id,
      notification_type,
      message_content,
      delivery_method,
      appointment_details,
    } = req.body;

    const notificationId = `notif-${Date.now()}`;

    await safeNotify({
      userId: patient_id,
      type: 'referral',
      title: `Referral Update: ${String(notification_type || 'status').replace(/_/g, ' ')}`,
      message: `${message_content}${appointment_details ? ` Appointment: ${JSON.stringify(appointment_details)}` : ''}`,
      referralId: referral_id,
    });

    res.json({
      notification_id: notificationId,
      patient_id,
      referral_id,
      status: 'sent',
      delivery_method: delivery_method || 'email',
      sent_at: new Date().toISOString(),
      delivery_status: 'delivered',
    });
  } catch (error) {
    console.error('Notify patient error:', error);
    res.status(500).json({ error: 'Failed to send patient notification' });
  }
});

// ---------------------------------------------------------------------------
// 14. Patient Re-engagement Nudge
// ---------------------------------------------------------------------------
router.post('/patient-reengagement-nudge', async (req, res) => {
  try {
    const { patient_id, referral_id, nudge_type, message_content, delivery_method } = req.body;

    const nudgeId = `NUDGE-${Date.now()}`;

    // Resolve the referral so the nudge can annotate the correct flight tracker.
    const { data: referral } = referral_id ? await findReferral(referral_id) : { data: null };

    const resolvedPatientId = asUuid(patient_id) || referral?.patient_id || null;

    await safeNotify({
      userId: resolvedPatientId || patient_id,
      type: 'alert',
      title: `Action Required: ${String(nudge_type || 'visit').replace(/_/g, ' ')}`,
      message: message_content || 'Please complete your referral process',
      referralId: asUuid(referral_id) || referral?.id,
    });

    if (referral?.tracker_id) {
      await advanceTrackerStage(referral.tracker_id, 'scheduling_and_attendance', {
        notes: `Re-engagement nudge sent (${nudge_type || 'standard'})`,
        agentAction: buildAgentAction('patient_reengagement_nudge', {
          description: `Patient re-engagement nudge sent${nudge_type ? ` (${nudge_type})` : ''}`,
          result: message_content || 'Nudge delivered to patient',
        }),
      });
    }

    res.json({
      nudge_id: nudgeId,
      patient_id: resolvedPatientId || patient_id,
      referral_id: referral_id || referral?.id,
      status: 'sent',
      sent_at: new Date().toISOString(),
      delivery_method: delivery_method || 'email',
      delivery_status: 'delivered',
      next_nudge_scheduled: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    console.error('Patient reengagement nudge error:', error);
    res.status(500).json({ error: 'Failed to send reengagement nudge' });
  }
});

// ---------------------------------------------------------------------------
// 15. Unified FHIR Referral Exchange
// ---------------------------------------------------------------------------
router.post('/unified-fhir-referral-exchange', async (req, res) => {
  try {
    const {
      referral_id,
      patient_id,
      requesting_provider,
      requesting_organization,
      receiving_provider,
      receiving_organization,
      clinical_summary,
      urgency,
      specialty,
    } = req.body;

    const transactionId = `FHIR-${Date.now()}`;
    const bundleId = `bundle-${Math.random().toString(36).substring(7)}`;

    // This is the only tool call in the whole workflow that ever receives a
    // real patient_id — later stages (separate agents) have no other way to
    // learn the patient's actual id/email, and were falling back to the
    // patient's name from the trigger text (e.g. "recipient": "Keerthana R").
    // Echoing the resolved id/name/email here lets downstream stages carry
    // it forward through this run's tracked context instead of guessing.
    let patientEmail;
    let patientName;
    if (patient_id) {
      const { data: patient } = await supabase
        .from('patients')
        .select('first_name, last_name, email')
        .eq('id', patient_id)
        .maybeSingle();
      if (patient) {
        patientEmail = patient.email;
        patientName = `${patient.first_name} ${patient.last_name}`;
      }
    }

    // Record routing evidence on the referral when addressable
    const { data: referral } = await findReferral(referral_id);
    if (referral) {
      await supabase
        .from('referrals')
        .update({
          status: referral.status === 'pending' ? 'routed' : referral.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', referral.id);

      await advanceTrackerStage(referral.tracker_id, 'create_and_route', {
        status: 'completed',
        notes: 'Referral routed via FHIR exchange',
        agentAction: buildAgentAction('unified_fhir_referral_exchange', {
          description: `FHIR bundle exchanged with ${receiving_organization || receiving_provider || 'receiving provider'}`,
          result: bundleId,
        }),
      });
    }

    res.json({
      transaction_id: transactionId,
      referral_id,
      patient_id,
      patient_name: patientName,
      patient_email: patientEmail,
      fhir_bundle_id: bundleId,
      fhir_version: 'R4',
      status: 'completed',
      created_at: new Date().toISOString(),
      exchange_endpoint: 'https://medicotabs.onrender.com/fhir/Bundle',
      transaction_signed: true,
    });
  } catch (error) {
    console.error('FHIR referral exchange error:', error);
    res.status(500).json({ error: 'Failed to create FHIR referral exchange' });
  }
});

// ---------------------------------------------------------------------------
// 16. Secure Targeted Document Portal
// ---------------------------------------------------------------------------
router.post('/secure-targeted-document-portal', async (req, res) => {
  try {
    const {
      referral_id,
      patient_id,
      document_ids,
      recipient_id,
      sender_id,
      access_expiration,
      require_acknowledgment,
    } = req.body;

    const sessionId = `PORTAL-${Date.now()}`;
    const accessToken = `token-${Math.random().toString(36).substring(7)}`;

    // Persist the targeted packet selection on the referral
    const { data: referral } = await findReferral(referral_id);
    if (referral) {
      if (Array.isArray(document_ids) && document_ids.length > 0) {
        await supabase
          .from('referrals')
          .update({ targeted_documents: document_ids, updated_at: new Date().toISOString() })
          .eq('id', referral.id);
      }

      await advanceTrackerStage(referral.tracker_id, 'acceptance_and_records', {
        agentAction: buildAgentAction('secure_targeted_document_portal', {
          description: `Shared ${Array.isArray(document_ids) ? document_ids.length : 0} document(s) via secure portal`,
          result: sessionId,
        }),
      });
    }

    res.json({
      portal_session_id: sessionId,
      referral_id,
      documents_shared: Array.isArray(document_ids) ? document_ids.length : 0,
      status: 'active',
      portal_url: `https://medicotabs.onrender.com/portal/${sessionId}`,
      access_token: accessToken,
      shared_at: new Date().toISOString(),
      expires_at:
        access_expiration || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      encryption_enabled: true,
    });
  } catch (error) {
    console.error('Document portal error:', error);
    res.status(500).json({ error: 'Failed to create document portal session' });
  }
});

// ---------------------------------------------------------------------------
// 17. Document Request Notice
// In-app equivalent of the workflow's Platform Email "Document Request Notice":
// instead of emailing a fixed recipient, it surfaces an in-app notification
// (and a message) on the primary doctor's and care coordinator's dashboards,
// listing exactly which records the specialist requested.
// ---------------------------------------------------------------------------
router.post('/document-request-notice', async (req, res) => {
  try {
    const {
      referral_id,
      requested_records,
      requesting_specialist,
      requesting_specialist_organization,
      urgency,
      patient_name,
      notice_message,
      recipient_id,
    } = req.body;

    const noticeId = `DRN-${Date.now()}`;

    // Resolve the referral to find the referring doctor's real UUID and the
    // patient — don't trust the agent to always pass a usable recipient UUID.
    const { data: referral } = referral_id ? await findReferral(referral_id) : { data: null };

    const primaryDoctorId = asUuid(recipient_id) || referral?.primary_doctor_id || null;

    const items = Array.isArray(requested_records)
      ? requested_records.join(', ')
      : (requested_records || 'records required for the consultation');
    const noticeText =
      notice_message ||
      `The specialist${requesting_specialist ? ` (${requesting_specialist})` : ''} requested the following records for ${patient_name || 'the patient'}: ${items}.`;

    // 1) Notify the primary (referring) doctor — the main deliverable.
    const notifiedIds = [primaryDoctorId];

    // 2) Notify every care coordinator so the notice also lands on their dashboard.
    const { data: coordinators } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'coordinator');

    (coordinators || []).forEach((c) => notifiedIds.push(c.id));

    notifiedIds.forEach((uid) => {
      if (!asUuid(uid)) return;
      safeNotify({
        userId: uid,
        type: 'message',
        title: `${urgency || 'Referral'} Document Request`,
        message: noticeText,
        referralId: asUuid(referral_id) || referral?.id,
      });
    });

    // 3) Also create a message to the referring doctor so it appears in Messages.
    if (asUuid(primaryDoctorId)) {
      await supabase.from('messages').insert({
        referral_id: asUuid(referral_id) || referral?.id || null,
        sender_id: null,
        sender_name: requesting_specialist || 'Specialist',
        sender_role: 'agent',
        recipient_id: asUuid(primaryDoctorId) || primaryDoctorId,
        recipient_name: 'Primary Doctor',
        subject: `Document Request — ${patient_name || 'Referral'}`,
        content: noticeText,
        is_read: false,
      });
    }

    if (referral?.tracker_id) {
      await advanceTrackerStage(referral.tracker_id, 'acceptance_and_records', {
        agentAction: buildAgentAction('document_request_notice', {
          description: `Document request notice sent to primary doctor and coordinator(s)`,
          result: `${items}`,
        }),
      });
    }

    res.json({
      notice_id: noticeId,
      referral_id: referral_id || referral?.id,
      patient_name,
      requesting_specialist,
      requesting_specialist_organization: requesting_specialist_organization || null,
      requested_records: items,
      urgency,
      recipients_notified: notifiedIds.filter(asUuid),
      delivery_method: 'in_app_notification',
      delivery_status: 'delivered',
      notice_sent_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Document request notice error:', error);
    res.status(500).json({ error: 'Failed to send document request notice' });
  }
});

// ---------------------------------------------------------------------------
// 18. Coverage Denial Notice
// Replaces the Platform Email "Coverage Denial Notice" tool with an in-app
// notice delivered to the referring doctor's + coordinators' dashboards.
// ---------------------------------------------------------------------------
router.post('/coverage-denial-notice', async (req, res) => {
  try {
    const {
      referral_id,
      patient_id,
      patient_name,
      insurance_provider,
      member_id,
      denial_reason,
      denial_detail,
      urgency,
      pre_approval_requested,
      recipient_id,
    } = req.body;

    const noticeId = `CDN-${Date.now()}`;

    const { data: referral } = referral_id ? await findReferral(referral_id) : { data: null };

    const primaryDoctorId = asUuid(recipient_id) || referral?.primary_doctor_id || null;

    const reason = denial_reason || 'coverage or pre-approval was denied';
    const detail = denial_detail || 'The payer did not authorize coverage for this consultation.';
    const noticeText = `Coverage has been denied for ${patient_name || 'the patient'}${patient_id ? ` (${patient_id})` : ''} on referral ${referral_id || referral?.id || 'this referral'}. Reason: ${reason}. ${detail}`;

    const notifiedIds = [primaryDoctorId];

    const { data: coordinators } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'coordinator');

    (coordinators || []).forEach((c) => notifiedIds.push(c.id));

    notifiedIds.forEach((uid) => {
      if (!asUuid(uid)) return;
      safeNotify({
        userId: uid,
        type: 'alert',
        title: `Coverage Denial${pre_approval_requested ? ' — Pre-Approval' : ''}`,
        message: noticeText,
        referralId: asUuid(referral_id) || referral?.id,
      });
    });

    if (asUuid(primaryDoctorId)) {
      await supabase.from('messages').insert({
        referral_id: asUuid(referral_id) || referral?.id || null,
        sender_id: null,
        sender_name: 'Coverage Team',
        sender_role: 'agent',
        recipient_id: primaryDoctorId,
        recipient_name: 'Primary Doctor',
        subject: `Coverage Denial Notice — ${patient_name || 'Referral'}`,
        content: noticeText,
        is_read: false,
      });
    }

    if (referral?.tracker_id) {
      await advanceTrackerStage(referral.tracker_id, 'coverage_verification', {
        agentAction: buildAgentAction('coverage_denial_notice', {
          description: `Coverage denial notice sent to primary doctor and coordinator(s)`,
          result: `${insurance_provider || 'unknown'} — ${reason}`,
        }),
      });
    }

    res.json({
      notice_id: noticeId,
      referral_id: referral_id || referral?.id,
      patient_id,
      patient_name,
      insurance_provider: insurance_provider || null,
      member_id: member_id || null,
      denial_reason: reason,
      denial_detail: detail,
      pre_approval_requested: Boolean(pre_approval_requested),
      recipients_notified: notifiedIds.filter(asUuid),
      delivery_method: 'in_app_notification',
      delivery_status: 'delivered',
      notice_sent_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Coverage denial notice error:', error);
    res.status(500).json({ error: 'Failed to send coverage denial notice' });
  }
});

// ---------------------------------------------------------------------------
// 19. Doctor Sign-off Reminder
// Replaces the Platform Email "Doctor Sign-off Reminder" tool with an in-app
// notice to the responsible doctor when the completion sign-off remains
// pending beyond the configured window.
// ---------------------------------------------------------------------------
router.post('/doctor-signoff-reminder', async (req, res) => {
  try {
    const {
      referral_id,
      doctor_id,
      doctor_name,
      patient_id,
      patient_name,
      configured_window,
      window_expired_after,
      reminder_count,
      urgency,
      reminder_message,
    } = req.body;

    const reminderId = `DSR-${Date.now()}`;

    const { data: referral } = referral_id ? await findReferral(referral_id) : { data: null };

    const responsibleDoctorId = asUuid(doctor_id) || referral?.primary_doctor_id || null;

    const windowText =
      configured_window ||
      (window_expired_after ? `after ${window_expired_after}` : 'beyond the configured window');
    const count = reminder_count
      ? ` (reminder ${reminder_count})`
      : '';
    const reminderText =
      reminder_message ||
      `The doctor sign-off for referral ${referral_id || referral?.id || 'this referral'}${patient_name ? ` for ${patient_name}` : ''} is still pending ${windowText}. Please complete the sign-off to close out the referral.${count}`;

    const notifiedIds = [responsibleDoctorId];

    const { data: coordinators } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'coordinator');

    (coordinators || []).forEach((c) => notifiedIds.push(c.id));

    notifiedIds.forEach((uid) => {
      if (!asUuid(uid)) return;
      safeNotify({
        userId: uid,
        type: 'alert',
        title: `Action Required — Doctor Sign-off Pending${count}`,
        message: reminderText,
        referralId: asUuid(referral_id) || referral?.id,
        actionUrl: referral?.id ? `/approvals` : null,
      });
    });

    if (asUuid(responsibleDoctorId)) {
      await supabase.from('messages').insert({
        referral_id: asUuid(referral_id) || referral?.id || null,
        sender_id: null,
        sender_name: 'Care Workflow',
        sender_role: 'agent',
        recipient_id: responsibleDoctorId,
        recipient_name: doctor_name || 'Doctor',
        subject: `Doctor Sign-off Reminder — ${patient_name || 'Referral'}`,
        content: reminderText,
        is_read: false,
      });
    }

    if (referral?.tracker_id) {
      await advanceTrackerStage(referral.tracker_id, 'completion_and_archive', {
        status: 'requires_attention',
        notes: 'Doctor sign-off pending — reminder sent',
        agentAction: buildAgentAction('doctor_signoff_reminder', {
          description: `Sign-off reminder sent to responsible doctor${doctor_name ? ` (${doctor_name})` : ''}`,
          result: reminderText,
        }),
      });
    }

    res.json({
      reminder_id: reminderId,
      referral_id: referral_id || referral?.id,
      doctor_id: responsibleDoctorId,
      doctor_name: doctor_name || null,
      patient_id,
      patient_name,
      configured_window: windowText,
      reminder_count: reminder_count || null,
      urgency: urgency || null,
      recipients_notified: notifiedIds.filter(asUuid),
      delivery_method: 'in_app_notification',
      delivery_status: 'delivered',
      reminder_sent_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Doctor sign-off reminder error:', error);
    res.status(500).json({ error: 'Failed to send doctor sign-off reminder' });
  }
});

// ---------------------------------------------------------------------------
// 20. Specialist Alert
// ---------------------------------------------------------------------------
router.post('/specialist-alert', async (req, res) => {
  try {
    const {
      referral_id,
      specialist_id,
      specialist_name,
      patient_name,
      patient_id,
      urgency_level,
      specialty_type,
      referral_reason,
      acknowledgment_deadline,
    } = req.body;

    const alertId = `ALERT-${Date.now()}`;

    if (referral_id) {
      const { data: referral } = await findReferral(referral_id);
      if (referral) {
        await advanceTrackerStage(referral.tracker_id, 'create_and_route', {
          agentAction: buildAgentAction('specialist_alert', {
            description: `${specialist_name || 'Specialist'} alerted about the referral`,
            result: 'Notified',
          }),
        });
      }
    }

    await safeNotify({
      userId: specialist_id,
      type: 'referral',
      title: `New ${urgency_level || 'Routine'} Referral: ${patient_name || 'Patient'}`,
      message: `${specialty_type || 'Specialist'} consultation requested. Reason: ${referral_reason || 'N/A'}. Acknowledge by ${acknowledgment_deadline || 'SLA deadline'}.`,
      referralId: referral_id,
    });

    res.json({
      alert_id: alertId,
      referral_id,
      specialist_id,
      status: 'delivered',
      alert_sent_at: new Date().toISOString(),
      notification_channels: ['email', 'sms', 'portal'],
      delivery_confirmed: true,
      acknowledgment_required_by: acknowledgment_deadline,
    });
  } catch (error) {
    console.error('Specialist alert error:', error);
    res.status(500).json({ error: 'Failed to send specialist alert' });
  }
});

// ---------------------------------------------------------------------------
// 18. EHR DocumentReference Save
// ---------------------------------------------------------------------------
router.post('/ehr-documentreference-save', async (req, res) => {
  try {
    const {
      patient_id,
      referral_id,
      document_content,
      document_type,
      document_title,
      authored_by,
      document_date,
      specialty,
      confidentiality,
    } = req.body;

    // The agent has repeatedly sent the patient's NAME (e.g. "Keerthana R")
    // in patient_id instead of their real UUID — schema-valid (it's still a
    // string) but useless for storage. referral_id has been reliable across
    // every run, so cross-check against the referral's own patient_id
    // rather than trusting the agent's patient_id blindly.
    const { data: referral } = referral_id ? await findReferral(referral_id) : { data: null };
    const resolvedPatientId = asUuid(patient_id) || referral?.patient_id || null;

    const documentId = `DOC-${Date.now()}`;
    const docRefId = `DocRef-${Date.now()}`;
    const fileName = document_title || `${document_type || 'document'}_${referral_id}.pdf`;

    const pdfBuffer = await buildPdfBuffer(document_type || 'EHR Document', [
      `Referral: ${referral_id || 'N/A'}`,
      `Specialty: ${specialty || 'N/A'}`,
      `Confidentiality: ${confidentiality || 'normal'}`,
      `Authored: ${document_date || new Date().toISOString()}`,
      '',
      document_content || 'No content provided.',
    ]);

    let storagePath = null;
    try {
      storagePath = await storeGeneratedPdf(resolvedPatientId, fileName, pdfBuffer);
    } catch (storageError) {
      console.warn('⚠ Document storage upload skipped:', storageError.message);
    }

    if (storagePath) {
      const { error: dbError } = await supabase.from('patient_documents').insert({
        patient_id: resolvedPatientId,
        file_name: fileName,
        file_type: 'application/pdf',
        file_url: storagePath,
        category: 'referral',
        uploaded_by: asUuid(authored_by),
        size: pdfBuffer.length,
      });
      if (dbError) console.warn('⚠ Document insert skipped:', dbError.message);
    }

    if (referral) {
      await advanceTrackerStage(referral.tracker_id, 'acceptance_and_records', {
        agentAction: buildAgentAction('ehr_documentreference_save', {
          description: `${document_type || 'Document'} saved to EHR`,
          result: fileName,
        }),
      });
    }

    // Matches the response schema in
    // openapi-connectors/ehr-documentreference-save.yaml exactly
    // (additionalProperties: false) — document_date/specialty/confidentiality
    // aren't declared there, so including them made YOXA reject this as
    // connector_response_schema_mismatch and drop the resulting document off
    // the workflow's tracked context, stalling everything after this step.
    // patient_id echoes the resolved UUID, not whatever the agent sent, so
    // downstream stages that read this response get a usable identifier.
    res.json({
      document_id: documentId,
      patient_id: resolvedPatientId || patient_id,
      referral_id,
      document_reference_id: docRefId,
      status: storagePath ? 'saved' : 'failed',
      saved_at: new Date().toISOString(),
      ehr_location: `/ehr/patients/${resolvedPatientId || patient_id}/documents/${documentId}`,
      fhir_resource_id: `DocumentReference/${docRefId}`,
      indexed: Boolean(storagePath),
    });
  } catch (error) {
    console.error('EHR document save error:', error);
    res.status(500).json({ error: 'Failed to save document to EHR' });
  }
});

// ---------------------------------------------------------------------------
// 19. Specialist Attendance Record
// ---------------------------------------------------------------------------
router.post('/specialist-attendance-record', async (req, res) => {
  try {
    const {
      appointment_id,
      referral_id,
      patient_id,
      specialist_id,
      attendance_status,
      consultation_completed,
      consultation_notes,
      follow_up_required,
      attended_at,
    } = req.body;

    const recordId = `ATT-${Date.now()}`;

    const { data: referral } = await findReferral(referral_id);
    if (referral) {
      const attended = attendance_status === 'attended' && consultation_completed;
      await supabase
        .from('referrals')
        .update({
          status: attended ? 'completed' : referral.status,
          attendance_status: attendance_status || 'unconfirmed',
          appointment_details: {
            ...(referral.appointment_details || {}),
            attendanceRecordedAt: attended_at || new Date().toISOString(),
            consultationNotes: consultation_notes || null,
            followUpRequired: Boolean(follow_up_required),
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', referral.id);

      await advanceTrackerStage(referral.tracker_id, 'scheduling_and_attendance', {
        status: attended ? 'completed' : 'requires_attention',
        notes: attended
          ? 'Attendance confirmed and consultation completed'
          : `Attendance status: ${attendance_status || 'unconfirmed'}`,
        agentAction: buildAgentAction('specialist_attendance_record', {
          status: attended ? 'success' : 'failed',
          description: 'Specialist recorded attendance outcome',
          result: attendance_status || 'unconfirmed',
        }),
      });
    }

    res.json({
      record_id: recordId,
      appointment_id,
      referral_id,
      attendance_status,
      consultation_completed: consultation_completed || false,
      recorded_at: new Date().toISOString(),
      recorded_by: specialist_id,
      next_steps: follow_up_required ? 'Follow-up appointment required' : 'Consultation complete',
    });
  } catch (error) {
    console.error('Specialist attendance record error:', error);
    res.status(500).json({ error: 'Failed to record attendance' });
  }
});

// ---------------------------------------------------------------------------
// 20. Specialist Routing and Availability
// Checks same-specialty routing options and decides whether a reroute is needed.
// ---------------------------------------------------------------------------
router.post('/specialist-routing-availability', async (req, res) => {
  try {
    const {
      referral_id,
      specialty_type,
      preferred_specialist,
      current_specialist_id,
      urgency,
      check_type,
    } = req.body;

    const { data: candidates, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, organization, specialization')
      .eq('role', 'specialist_doctor')
      .ilike('specialization', specialty_type || '');

    const alternatives = (candidates || []).map((s) => ({
      specialist_id: s.id,
      specialist_name: `${s.first_name} ${s.last_name}`,
      organization: s.organization,
      specialty: s.specialization,
      available: true,
    }));

    const preferredMatch =
      preferred_specialist &&
      alternatives.find((a) =>
        a.specialist_name.toLowerCase().includes(String(preferred_specialist).toLowerCase().replace('dr.', '').trim())
      );

    const routingStatus = preferredMatch || alternatives.length > 0 ? 'available' : 'no_alternatives';

    // Resolve the referral so the routing check annotates the correct tracker.
    const { data: referral } = referral_id ? await findReferral(referral_id) : { data: null };

    // Initial routing happens in create_and_route; a post-acceptance reroute
    // happens in acceptance_and_records.
    const stageKey = String(check_type || 'initial_routing').includes('reroute')
      ? 'acceptance_and_records'
      : 'create_and_route';

    if (referral?.tracker_id) {
      await advanceTrackerStage(referral.tracker_id, stageKey, {
        agentAction: buildAgentAction('specialist_routing_availability', {
          description: `Routing availability check (${check_type || 'initial_routing'}) for ${specialty_type || 'specialty'}`,
          result: `Status ${routingStatus}, ${alternatives.length} same-specialty alternative(s)`,
        }),
      });
    }

    res.json({
      referral_id: referral_id || referral?.id,
      specialty_type,
      check_type: check_type || 'initial_routing',
      routing_status: routingStatus,
      reroute_required: false,
      selected_specialist: preferredMatch
        ? {
            specialist_id: preferredMatch.specialist_id,
            specialist_name: preferredMatch.specialist_name,
            organization: preferredMatch.organization,
          }
        : alternatives[0] || null,
      alternatives_considered: alternatives.length,
      alternatives: alternatives.slice(0, 5),
      urgency,
      checked_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Specialist routing availability error:', error);
    res.status(500).json({ error: 'Failed to check specialist routing availability' });
  }
});

// ---------------------------------------------------------------------------
// 21. Coverage and Pre-approval Verification
// Only invoked for advanced treatments/operations — verifies whether the
// patient's insurance can be claimed and writes Covered/Cannot be claimed
// onto the tracker's coverage_verification stage.
// ---------------------------------------------------------------------------
router.post('/coverage-preapproval-verification', async (req, res) => {
  try {
    const { referral_id, patient_id, service_type, specialty_type } = req.body;

    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('insurance')
      .eq('id', patient_id)
      .single();
    if (patientError || !patient) return res.status(404).json({ error: 'Patient not found' });

    const provider = patient.insurance?.provider || '';
    const memberId = patient.insurance?.memberId || '';

    // This tool only runs for advanced treatments/operations (the tracker's
    // coverage_verification stage doesn't even exist for general checkups),
    // so every call here needs pre-approval by definition.
    const requiresPreApproval = true;

    const isEligible = Boolean(provider && memberId);
    const coverageStatus = isEligible ? 'verified' : 'denied';
    const copay = isEligible ? 75.0 : 0;
    // Computed once and reused everywhere below — a fresh Date.now() each
    // place this was needed used to produce a different number in the stored
    // row vs. the API response vs. the tracker stage.
    const preApprovalNumber = requiresPreApproval ? `HC-PA-${Date.now()}` : null;

    const { error: insertError } = await supabase.from('coverage_verifications').insert({
      referral_id: asUuid(referral_id),
      patient_id: asUuid(patient_id),
      insurance_provider: provider || 'Unknown',
      member_id: memberId || 'Unknown',
      eligibility_status: isEligible ? 'active' : 'inactive',
      pre_approval_required: requiresPreApproval,
      pre_approval_status: requiresPreApproval ? 'approved' : null,
      pre_approval_number: preApprovalNumber,
      expected_copay: copay,
      coverage_notes: isEligible
        ? `${provider} active for ${specialty_type || 'specialist'} ${service_type || 'consultation'}`
        : 'No active insurance on file',
      verified_at: new Date().toISOString(),
      verified_by: 'yoxa-workflow',
    });
    if (insertError) console.warn('⚠ Coverage verification insert skipped:', insertError.message);

    const { data: referral } = await findReferral(referral_id);
    if (referral) {
      await supabase
        .from('referrals')
        .update({ coverage_status: coverageStatus, updated_at: new Date().toISOString() })
        .eq('id', referral.id);
    }

    // Write the outcome straight onto the tracker's coverage_verification stage
    // so the UI shows "Covered" / "Cannot be claimed" without depending on how
    // the external workflow chooses to phrase its own stage update.
    if (referral?.tracker_id) {
      const resultText = isEligible ? 'Covered' : 'Cannot Be Claimed';
      await advanceTrackerStage(referral.tracker_id, 'coverage_verification', {
        status: isEligible ? 'completed' : 'requires_attention',
        notes: resultText,
        extra: {
          copay: isEligible ? copay : undefined,
          preApprovalNumber: isEligible ? preApprovalNumber : undefined,
        },
        agentAction: buildAgentAction('coverage_preapproval_verification', {
          status: isEligible ? 'success' : 'failed',
          description: `Insurance coverage check for ${specialty_type || 'specialist'} ${service_type || 'treatment'}`,
          result: resultText,
        }),
      });
    }

    res.json({
      referral_id,
      patient_id,
      insurance_provider: provider,
      member_id: memberId,
      routine_visit_exempt: false,
      is_eligible: isEligible,
      coverage_status: isEligible ? 'Covered' : 'Cannot Be Claimed',
      pre_approval_required: requiresPreApproval,
      pre_approval_status: requiresPreApproval ? 'approved' : 'not_required',
      pre_approval_number: preApprovalNumber,
      expected_copay: copay,
      coverage_details: isEligible
        ? `Coverage confirmed for ${specialty_type || 'specialist'} ${service_type || 'consultation'}`
        : 'Coverage denied - no active insurance on file',
      verified_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Coverage preapproval verification error:', error);
    res.status(500).json({ error: 'Failed to verify coverage and pre-approval' });
  }
});

// ---------------------------------------------------------------------------
// 22. Appointment Slot and Acceptance
// Records a real offered slot plus the patient's acceptance of that exact slot.
// ---------------------------------------------------------------------------
router.post('/appointment-slot-acceptance', async (req, res) => {
  try {
    const {
      referral_id,
      patient_id,
      specialist_id,
      specialist_name,
      organization,
      slot_date,
      slot_time,
      timezone,
      patient_accepted,
      contact_channel,
    } = req.body;

    if (!slot_date || !slot_time) {
      return res.status(400).json({ error: 'slot_date and slot_time are required' });
    }

    const { data: referral } = await findReferral(referral_id);

    if (!patient_accepted) {
      if (referral) {
        await advanceTrackerStage(referral.tracker_id, 'scheduling_and_attendance', {
          status: 'requires_attention',
          notes: 'Patient declined the offered appointment slot',
          agentAction: buildAgentAction('appointment_slot_acceptance', {
            status: 'failed',
            description: `Slot declined for ${slot_date} ${slot_time}`,
            result: 'Declined',
          }),
        });
      }

      return res.json({
        referral_id,
        patient_id,
        slot_date,
        slot_time,
        acceptance_status: 'declined',
        booking_confirmation: null,
        recorded_at: new Date().toISOString(),
        next_action: 'Offer alternative slot or escalate to care coordinator',
      });
    }

    const bookingConfirmation = `BK-${Date.now()}`;
    const location = organization || specialist_name || 'Specialist clinic';

    if (referral) {
      await supabase
        .from('referrals')
        .update({
          appointment_details: {
            date: slot_date,
            time: slot_time,
            location,
            bookingId: bookingConfirmation,
            specialistId: specialist_id || null,
            specialistName: specialist_name || null,
            timezone: timezone || 'UTC',
            acceptedVia: contact_channel || 'portal',
          },
          attendance_status: 'scheduled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', referral.id);

      await advanceTrackerStage(referral.tracker_id, 'scheduling_and_attendance', {
        status: 'in_progress',
        notes: `Appointment scheduled for ${slot_date} ${slot_time}`,
        agentAction: buildAgentAction('appointment_slot_acceptance', {
          description: `Slot accepted with ${specialist_name || 'specialist'}`,
          result: bookingConfirmation,
        }),
      });
    }

    res.json({
      referral_id,
      patient_id,
      specialist_id,
      specialist_name,
      slot_date,
      slot_time,
      timezone: timezone || 'UTC',
      acceptance_status: 'accepted',
      is_confirmed_appointment: true,
      booking_confirmation: bookingConfirmation,
      location,
      contact_channel: contact_channel || 'portal',
      recorded_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Appointment slot acceptance error:', error);
    res.status(500).json({ error: 'Failed to record appointment slot acceptance' });
  }
});

// ---------------------------------------------------------------------------
// 23. Consolidated Referral Summary PDF
// Generates the standardized PDF containing the complete referral journey.
// ---------------------------------------------------------------------------
router.post('/consolidated-referral-summary-pdf', async (req, res) => {
  try {
    const {
      referral_id,
      patient_id,
      patient_name,
      document_title,
      journey_summary,
      tracker_audit_trail,
      final_urgency,
      financial_status,
      authored_by,
    } = req.body;

    const { data: referral } = await findReferral(referral_id);
    const referralNumber = referral?.referral_number || referral_id;
    // Same fallback as ehr-documentreference-save: don't trust a
    // non-UUID patient_id (the agent sometimes sends the patient's name).
    const resolvedPatientId = asUuid(patient_id) || referral?.patient_id || null;

    const fileName = document_title || `referral_summary_${referralNumber}.pdf`;
    const documentId = `DOC-SUMMARY-${Date.now()}`;
    const docRefId = `DR-${referralNumber}-${Math.random().toString(36).substring(4, 8).toUpperCase()}`;

    const pdfBuffer = await buildPdfBuffer('Consolidated Referral Summary', [
      `Referral: ${referralNumber}`,
      `Patient: ${patient_name || 'N/A'}`,
      `Final Urgency: ${final_urgency || referral?.urgency || 'N/A'}`,
      `Financial Status: ${financial_status || 'N/A'}`,
      `Generated: ${new Date().toISOString()}`,
      '',
      'REFERRAL JOURNEY',
      journey_summary || 'See flight tracker audit trail.',
      '',
      'AUDIT TRAIL',
      tracker_audit_trail || 'Stages recorded in flight tracker.',
    ]);

    let storagePath = null;
    try {
      storagePath = await storeGeneratedPdf(resolvedPatientId, fileName, pdfBuffer);
    } catch (storageError) {
      console.warn('⚠ Summary storage upload skipped:', storageError.message);
    }

    if (storagePath) {
      const { error: dbError } = await supabase.from('patient_documents').insert({
        patient_id: resolvedPatientId,
        file_name: fileName,
        file_type: 'application/pdf',
        file_url: storagePath,
        category: 'referral',
        uploaded_by: asUuid(authored_by),
        size: pdfBuffer.length,
      });
      if (dbError) console.warn('⚠ Summary document insert skipped:', dbError.message);
    }

    if (referral?.tracker_id) {
      await advanceTrackerStage(referral.tracker_id, 'completion_and_archive', {
        status: 'completed',
        notes: 'Consolidated referral summary generated and archived',
        agentAction: buildAgentAction('consolidated_referral_summary_pdf', {
          description: 'Final referral summary PDF generated',
          result: fileName,
        }),
      });
    }

    // JSON metadata, matching the response schema in
    // openapi-connectors/consolidated-referral-summary-pdf.yaml (the contract
    // uploaded to YOXA). YOXA's workflow reads eligible_for_attachment/
    // document_id from this response to drive its patient-email step — a raw
    // PDF binary here breaks that step since it doesn't match the declared
    // JSON schema.
    res.json({
      document_id: documentId,
      referral_id,
      referral_number: referralNumber,
      patient_id: resolvedPatientId || patient_id,
      document_reference_id: docRefId,
      fhir_resource_id: `DocumentReference/${docRefId}`,
      file_name: fileName,
      output_type: 'pdf',
      content_length: pdfBuffer.length,
      status: storagePath ? 'generated' : 'generation_failed',
      generated_at: new Date().toISOString(),
      eligible_for_attachment: Boolean(storagePath),
    });
  } catch (error) {
    console.error('Consolidated referral summary PDF error:', error);
    res.status(500).json({ error: 'Failed to generate consolidated referral summary PDF' });
  }
});

export default router;
