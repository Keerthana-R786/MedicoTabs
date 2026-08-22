/**
 * Seed script: attaches realistic documents (real PDFs, really stored in
 * Supabase Storage) to patients who don't have any yet, so patient records
 * look like a live EHR instead of an empty Documents tab.
 *
 * Idempotent: skips any patient who already has at least one document.
 *
 * Usage: npm run seed:documents   (from backend/)
 */
import PDFDocument from 'pdfkit';
import { supabase } from '../src/config/database.js';

const DOCUMENTS_BUCKET = 'patient-documents';
const MAX_DOCS_PER_PATIENT = 3;
const MIN_DOCS_PER_PATIENT = 1;

const LAB_TESTS = [
  { name: 'Complete Blood Count (CBC)', result: 'Within normal limits' },
  { name: 'Basic Metabolic Panel', result: 'Glucose 94 mg/dL, Sodium 140 mEq/L, Potassium 4.1 mEq/L — normal' },
  { name: 'Lipid Panel', result: 'Total Cholesterol 182 mg/dL, LDL 104 mg/dL, HDL 52 mg/dL' },
  { name: 'Thyroid Function (TSH)', result: 'TSH 2.1 mIU/L — normal range' },
  { name: 'HbA1c', result: '5.6% — within normal range' },
  { name: 'Liver Function Panel', result: 'ALT 22 U/L, AST 19 U/L — normal' },
];

const MEDICATIONS = [
  { name: 'Amoxicillin 500mg', instructions: 'Take one capsule three times daily for 7 days' },
  { name: 'Lisinopril 10mg', instructions: 'Take one tablet daily in the morning' },
  { name: 'Atorvastatin 20mg', instructions: 'Take one tablet at bedtime' },
  { name: 'Metformin 500mg', instructions: 'Take one tablet twice daily with meals' },
  { name: 'Albuterol Inhaler', instructions: 'Use 2 puffs every 4-6 hours as needed for wheezing' },
  { name: 'Ibuprofen 400mg', instructions: 'Take one tablet every 6-8 hours as needed for pain' },
];

const IMAGING_STUDIES = [
  { study: 'Chest X-Ray, PA and Lateral', finding: 'No acute cardiopulmonary abnormality. Heart size normal.' },
  { study: 'Abdominal Ultrasound', finding: 'Liver, gallbladder, and kidneys appear unremarkable.' },
  { study: 'MRI Lumbar Spine', finding: 'Mild degenerative disc changes at L4-L5. No significant stenosis.' },
  { study: 'CT Chest without contrast', finding: 'No pulmonary nodules or masses identified.' },
];

const MEDICAL_HISTORY_NOTES = [
  'Patient reports well-controlled hypertension, managed with lifestyle modification and medication.',
  'No significant past surgical history. Family history notable for type 2 diabetes.',
  'Patient followed up for seasonal allergies, symptoms improved with current management.',
  'Routine annual physical. Patient in good general health, no acute concerns.',
  'Follow-up visit for previously identified condition. Symptoms stable, no new complaints.',
];

const CATEGORY_WEIGHTS = ['lab_result', 'lab_result', 'prescription', 'medical_history', 'imaging', 'referral'];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildPdfBuffer(title, subtitle, lines) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fillColor('#0f4d47').fontSize(16).font('Helvetica-Bold').text(title);
    if (subtitle) {
      doc.fillColor('#5b6b68').fontSize(10).font('Helvetica').text(subtitle);
    }
    doc.moveDown();
    doc.fillColor('#1f2a28').fontSize(10).font('Helvetica');
    lines.forEach((line) => doc.text(line));
    doc.end();
  });
}

function buildDocumentContent(category, patient) {
  const patientLine = `Patient: ${patient.first_name} ${patient.last_name}  •  DOB: ${patient.date_of_birth}  •  Referral: ${patient.referral_id}`;

  switch (category) {
    case 'lab_result': {
      const test = pick(LAB_TESTS);
      return {
        fileName: `${test.name.replace(/[^a-zA-Z0-9]+/g, '_')}_Lab_Result.pdf`,
        title: 'Laboratory Result',
        lines: [patientLine, '', `Test: ${test.name}`, `Result: ${test.result}`, `Collected: ${new Date().toLocaleDateString()}`],
      };
    }
    case 'prescription': {
      const med = pick(MEDICATIONS);
      return {
        fileName: `Prescription_${med.name.split(' ')[0]}.pdf`,
        title: 'Prescription',
        lines: [patientLine, '', `Medication: ${med.name}`, `Instructions: ${med.instructions}`, `Prescribed: ${new Date().toLocaleDateString()}`],
      };
    }
    case 'imaging': {
      const study = pick(IMAGING_STUDIES);
      return {
        fileName: `${study.study.replace(/[^a-zA-Z0-9]+/g, '_')}_Report.pdf`,
        title: 'Imaging Report',
        lines: [patientLine, '', `Study: ${study.study}`, `Finding: ${study.finding}`, `Performed: ${new Date().toLocaleDateString()}`],
      };
    }
    case 'medical_history': {
      return {
        fileName: `Visit_Note_${Date.now()}.pdf`,
        title: 'Clinical Visit Note',
        lines: [patientLine, '', pick(MEDICAL_HISTORY_NOTES), '', `Visit date: ${new Date().toLocaleDateString()}`],
      };
    }
    case 'referral':
    default: {
      return {
        fileName: `Referral_Letter_${patient.referral_id}.pdf`,
        title: 'Referral Letter',
        lines: [patientLine, '', `Referral ID: ${patient.referral_id}`, `Insurance: ${patient.insurance?.provider || 'N/A'}`, `Generated: ${new Date().toLocaleDateString()}`],
      };
    }
  }
}

async function seedDocumentsForPatient(patient) {
  const docCount = MIN_DOCS_PER_PATIENT + Math.floor(Math.random() * (MAX_DOCS_PER_PATIENT - MIN_DOCS_PER_PATIENT + 1));
  let created = 0;

  for (let i = 0; i < docCount; i++) {
    const category = pick(CATEGORY_WEIGHTS);
    const { fileName, title, lines } = buildDocumentContent(category, patient);

    try {
      const buffer = await buildPdfBuffer(title, patient.referral_id, lines);
      const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${patient.id}/${Date.now()}-${i}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .upload(storagePath, buffer, { contentType: 'application/pdf', upsert: false });
      if (uploadError) throw uploadError;

      const uploadedAt = new Date(Date.now() - Math.floor(Math.random() * 60) * 86400000);

      const { error: insertError } = await supabase.from('patient_documents').insert({
        patient_id: patient.id,
        file_name: fileName,
        file_type: 'application/pdf',
        file_url: storagePath,
        category,
        uploaded_by: null,
        size: buffer.length,
        uploaded_at: uploadedAt.toISOString(),
      });
      if (insertError) throw insertError;

      created++;
    } catch (err) {
      console.error(`  Failed doc for ${patient.first_name} ${patient.last_name}:`, err.message);
    }
  }

  return created;
}

async function seedDocuments() {
  console.log('Fetching patients...');
  const { data: patients, error: patientsError } = await supabase
    .from('patients')
    .select('id, first_name, last_name, date_of_birth, referral_id, insurance');
  if (patientsError) {
    console.error('Failed to fetch patients:', patientsError.message);
    process.exit(1);
  }

  console.log('Finding patients that already have documents...');
  const { data: existingDocs, error: docsError } = await supabase
    .from('patient_documents')
    .select('patient_id');
  if (docsError) {
    console.error('Failed to fetch existing documents:', docsError.message);
    process.exit(1);
  }

  const patientsWithDocs = new Set((existingDocs || []).map((d) => d.patient_id));
  const targets = patients.filter((p) => !patientsWithDocs.has(p.id));

  console.log(`${patients.length} total patients, ${patientsWithDocs.size} already have documents.`);
  console.log(`Seeding documents for ${targets.length} patients...`);

  let totalCreated = 0;
  let patientsProcessed = 0;

  for (const patient of targets) {
    const created = await seedDocumentsForPatient(patient);
    totalCreated += created;
    patientsProcessed++;
    if (patientsProcessed % 25 === 0) {
      console.log(`  ${patientsProcessed}/${targets.length} patients processed, ${totalCreated} documents created so far`);
    }
  }

  console.log(`Done. Created ${totalCreated} documents across ${patientsProcessed} patients.`);
}

seedDocuments()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed script failed:', err);
    process.exit(1);
  });
