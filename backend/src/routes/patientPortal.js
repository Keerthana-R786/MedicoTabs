import express from 'express';
import PDFDocument from 'pdfkit';
import { supabase } from '../config/database.js';
import { requirePatientAuth } from '../middleware/patientAuth.js';

const router = express.Router();

router.use(requirePatientAuth);

function toPublicPatient(row) {
  return {
    id: row.id,
    referralId: row.referral_id,
    firstName: row.first_name,
    lastName: row.last_name,
    dateOfBirth: row.date_of_birth,
    gender: row.gender,
    contactNumber: row.contact_number,
    email: row.email,
    address: row.address,
    bloodGroup: row.blood_group,
    allergies: row.allergies,
    insurance: row.insurance,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toPublicReferral(r) {
  return {
    id: r.id,
    referralNumber: r.referral_number,
    requestedSpecialty: r.requested_specialty,
    specialistName: r.specialist_name,
    specialistOrganization: r.specialist_organization,
    primaryDoctorName: r.primary_doctor_name,
    primaryOrganization: r.primary_organization,
    referralReason: r.referral_reason,
    urgency: r.urgency,
    status: r.status,
    coverageStatus: r.coverage_status,
    attendanceStatus: r.attendance_status,
    appointmentDetails: r.appointment_details,
    trackerId: r.tracker_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function toPublicTracker(t) {
  return {
    id: t.id,
    visitReason: t.visit_reason,
    urgency: t.urgency,
    currentStage: t.current_stage,
    stages: t.stages,
    startedAt: t.started_at,
    completedAt: t.completed_at,
    signedOffAt: t.signed_off_at,
    workflowRunId: t.workflow_run_id,
  };
}

function toPublicDocument(d) {
  return {
    id: d.id,
    fileName: d.file_name,
    fileType: d.file_type,
    category: d.category,
    uploadedAt: d.uploaded_at,
    size: d.size,
  };
}

async function loadPatientBundle(patientId) {
  const [{ data: referrals, error: refErr }, { data: trackers, error: trkErr }, { data: documents, error: docErr }] =
    await Promise.all([
      supabase.from('referrals').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }),
      supabase.from('flight_trackers').select('*').eq('patient_id', patientId).order('started_at', { ascending: false }),
      supabase.from('patient_documents').select('*').eq('patient_id', patientId).order('uploaded_at', { ascending: false }),
    ]);

  if (refErr) throw refErr;
  if (trkErr) throw trkErr;
  if (docErr) throw docErr;

  return {
    referrals: (referrals || []).map(toPublicReferral),
    trackers: (trackers || []).map(toPublicTracker),
    documents: (documents || []).map(toPublicDocument),
  };
}

/**
 * GET /api/patient-portal/summary
 * Everything the patient dashboard needs in one call, scoped to the
 * authenticated patient only.
 */
router.get('/summary', async (req, res) => {
  try {
    const bundle = await loadPatientBundle(req.patientId);
    res.json({
      patient: toPublicPatient(req.patient),
      ...bundle,
    });
  } catch (error) {
    console.error('Error loading patient summary:', error);
    res.status(500).json({ error: 'Failed to load patient summary', details: error.message });
  }
});

const STAGE_LABELS = {
  create_and_route: 'Create & Route',
  acceptance_and_records: 'Acceptance & Records',
  coverage_verification: 'Coverage Verification',
  scheduling_and_attendance: 'Scheduling & Attendance',
  completion_and_archive: 'Completion & Archive',
};

/**
 * GET /api/patient-portal/summary/pdf
 * Generates a downloadable PDF summary of the patient's record, insurance,
 * referral history, and care-journey (flight tracker) progress.
 */
router.get('/summary/pdf', async (req, res) => {
  try {
    const patient = toPublicPatient(req.patient);
    const { referrals, trackers } = await loadPatientBundle(req.patientId);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const fileName = `MedicoTabs-Summary-${patient.referralId}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    doc.pipe(res);

    // Header
    doc.fillColor('#0f4d47').fontSize(22).font('Helvetica-Bold').text('MedicoTabs', { continued: false });
    doc.fillColor('#5b6b68').fontSize(10).font('Helvetica').text('Patient Care Summary');
    doc.moveDown(0.3);
    doc.fillColor('#9aa5a3').fontSize(8).text(`Generated ${new Date().toLocaleString()}`);
    doc.moveTo(50, doc.y + 10).lineTo(545, doc.y + 10).strokeColor('#d8e0de').stroke();
    doc.moveDown(1.2);

    const sectionTitle = (text) => {
      doc.moveDown(0.6);
      doc.fillColor('#0f4d47').fontSize(13).font('Helvetica-Bold').text(text);
      doc.moveDown(0.3);
    };

    const field = (label, value) => {
      doc.fillColor('#5b6b68').fontSize(9).font('Helvetica-Bold').text(label, { continued: true });
      doc.fillColor('#1f2a28').font('Helvetica').text(`  ${value ?? '—'}`);
    };

    // Patient info
    sectionTitle('Patient Information');
    field('Name', `${patient.firstName} ${patient.lastName}`);
    field('Referral ID', patient.referralId);
    field('Date of Birth', new Date(patient.dateOfBirth).toLocaleDateString());
    field('Gender', patient.gender);
    field('Contact', patient.contactNumber);
    field('Email', patient.email);
    field('Address', patient.address);

    // Medical info
    sectionTitle('Medical Information');
    field('Blood Group', patient.bloodGroup || 'N/A');
    field('Allergies', patient.allergies?.length ? patient.allergies.join(', ') : 'None recorded');

    // Insurance
    sectionTitle('Insurance');
    field('Provider', patient.insurance?.provider);
    field('Policy Number', patient.insurance?.policyNumber);
    field('Member ID', patient.insurance?.memberId);

    // Referral history
    sectionTitle('Referral History');
    if (referrals.length === 0) {
      doc.fillColor('#5b6b68').fontSize(9).font('Helvetica').text('No referrals on record.');
    } else {
      referrals.forEach((r) => {
        doc.fillColor('#1f2a28').fontSize(10).font('Helvetica-Bold')
          .text(`${r.referralNumber || 'Referral'} — ${r.requestedSpecialty || ''}`);
        doc.fillColor('#5b6b68').fontSize(9).font('Helvetica')
          .text(`Status: ${r.status}  •  Urgency: ${r.urgency}  •  Created: ${new Date(r.createdAt).toLocaleDateString()}`);
        if (r.referralReason) {
          doc.fillColor('#1f2a28').fontSize(9).text(r.referralReason);
        }
        doc.moveDown(0.5);
      });
    }

    // Care journey / flight tracker
    sectionTitle('Care Journey');
    if (trackers.length === 0) {
      doc.fillColor('#5b6b68').fontSize(9).font('Helvetica').text('No active tracking for this patient.');
    } else {
      trackers.forEach((t) => {
        doc.fillColor('#1f2a28').fontSize(10).font('Helvetica-Bold').text(t.visitReason || 'Visit');
        doc.fillColor('#5b6b68').fontSize(9).font('Helvetica')
          .text(`Urgency: ${t.urgency}  •  Started: ${new Date(t.startedAt).toLocaleDateString()}`);
        doc.moveDown(0.2);
        (t.stages || []).forEach((stage) => {
          const label = STAGE_LABELS[stage.stage] || stage.stage;
          doc.fillColor('#1f2a28').fontSize(9).font('Helvetica-Bold')
            .text(`  • ${label}: `, { continued: true })
            .font('Helvetica').fillColor('#5b6b68')
            .text(stage.status.replace('_', ' '));
        });
        doc.moveDown(0.6);
      });
    }

    doc.moveDown(1);
    doc.fillColor('#9aa5a3').fontSize(8).font('Helvetica')
      .text('This summary is generated from your MedicoTabs EHR record and is for personal reference only.', { align: 'center' });

    doc.end();
  } catch (error) {
    console.error('Error generating PDF summary:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate PDF summary', details: error.message });
    }
  }
});

export default router;
