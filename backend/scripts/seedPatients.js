/**
 * Seed script: populates the `patients` table with realistic demo records
 * so the EHR looks like a live system with an existing patient base.
 *
 * Idempotent: tops the table up to TARGET_COUNT instead of duplicating
 * on repeated runs. Uses the same schema/shape as POST /api/patients.
 *
 * Usage: npm run seed:patients   (from backend/)
 */
import { supabase } from '../src/config/database.js';

const TARGET_COUNT = 250;
const BATCH_SIZE = 50;

const MALE_FIRST_NAMES = [
  'Arjun', 'Vikram', 'Rohan', 'Aditya', 'Karthik', 'Suresh', 'Ramesh', 'Manoj',
  'Sanjay', 'Ajay', 'Deepak', 'Anand', 'Vijay', 'Rahul', 'Prakash', 'Naveen',
  'Ganesh', 'Harish', 'Kiran', 'Mahesh', 'Nikhil', 'Pradeep', 'Raj', 'Ravi',
  'Sathish', 'Siva', 'Srinivas', 'Venkat', 'Yogesh', 'Amit', 'James', 'John',
  'Michael', 'David', 'Robert', 'William', 'Daniel', 'Joseph', 'Thomas', 'Mark'
];

const FEMALE_FIRST_NAMES = [
  'Priya', 'Divya', 'Anjali', 'Kavya', 'Meera', 'Pooja', 'Sneha', 'Swathi',
  'Deepa', 'Lakshmi', 'Radha', 'Sangeetha', 'Shalini', 'Sowmya', 'Suma',
  'Uma', 'Vidya', 'Aishwarya', 'Bhavana', 'Chitra', 'Gayathri', 'Indira',
  'Jyothi', 'Keerthana', 'Nithya', 'Padma', 'Ramya', 'Revathi', 'Sandhya',
  'Vani', 'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Susan',
  'Jessica', 'Sarah', 'Karen', 'Nancy'
];

const LAST_NAMES = [
  'Kumar', 'Sharma', 'Iyer', 'Reddy', 'Nair', 'Menon', 'Rao', 'Pillai',
  'Krishnan', 'Subramaniam', 'Raman', 'Gupta', 'Patel', 'Mehta', 'Verma',
  'Chandran', 'Balakrishnan', 'Narayanan', 'Venkataraman', 'Srinivasan',
  'Shah', 'Joshi', 'Desai', 'Nayar', 'Pandey', 'Mishra', 'Singh', 'Das',
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis',
  'Wilson', 'Anderson', 'Taylor', 'Thomas', 'Moore'
];

const CITIES = [
  { city: 'Chennai', state: 'Tamil Nadu', zip: '600001' },
  { city: 'Coimbatore', state: 'Tamil Nadu', zip: '641001' },
  { city: 'Madurai', state: 'Tamil Nadu', zip: '625001' },
  { city: 'Bangalore', state: 'Karnataka', zip: '560001' },
  { city: 'Mysore', state: 'Karnataka', zip: '570001' },
  { city: 'Hyderabad', state: 'Telangana', zip: '500001' },
  { city: 'Mumbai', state: 'Maharashtra', zip: '400001' },
  { city: 'Pune', state: 'Maharashtra', zip: '411001' },
  { city: 'Kochi', state: 'Kerala', zip: '682001' },
  { city: 'Thiruvananthapuram', state: 'Kerala', zip: '695001' },
  { city: 'Delhi', state: 'Delhi', zip: '110001' },
  { city: 'Kolkata', state: 'West Bengal', zip: '700001' }
];

const STREET_NAMES = [
  'Wellness Avenue', 'MG Road', 'Anna Nagar Main Road', 'Park Street',
  'Lake View Road', 'Church Street', 'Gandhi Nagar', 'Nehru Street',
  'Hill View Road', 'Riverside Drive', 'Temple Street', 'Station Road',
  'Cross Street', 'Garden Avenue', 'Sunrise Boulevard'
];

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const ALLERGIES_POOL = [
  'Penicillin', 'Peanuts', 'Sulfa Drugs', 'Latex', 'Pollen', 'Dust Mites',
  'Shellfish', 'Aspirin', 'Ibuprofen', 'Iodine', 'Pet Dander', 'Eggs'
];

const INSURANCE_PROVIDERS = [
  'HarborCare PPO', 'NorthStar Health Plan', 'BlueShield Family',
  'UnitedWell Insurance', 'CarePlus HMO', 'MediTrust PPO',
  'Guardian Health Network', 'PrimeCare Insurance'
];

const GENDER_WEIGHTS = ['male', 'male', 'female', 'female', 'other'];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickSome(arr, max) {
  const count = Math.floor(Math.random() * (max + 1));
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function randomDate(startYear, endYear) {
  const start = new Date(startYear, 0, 1).getTime();
  const end = new Date(endYear, 11, 31).getTime();
  return new Date(start + Math.random() * (end - start));
}

function formatDateOnly(date) {
  return date.toISOString().split('T')[0];
}

function randomPhone() {
  const first = pick(['6', '7', '8', '9']);
  let rest = '';
  for (let i = 0; i < 9; i++) rest += Math.floor(Math.random() * 10);
  return first + rest;
}

function makeReferralId(usedIds, year) {
  let id;
  do {
    id = `RFL-${year}-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`;
  } while (usedIds.has(id));
  usedIds.add(id);
  return id;
}

function buildPatient(index, usedIds, usedEmails) {
  const gender = pick(GENDER_WEIGHTS);
  const firstName = gender === 'female' ? pick(FEMALE_FIRST_NAMES) : pick(MALE_FIRST_NAMES);
  const lastName = pick(LAST_NAMES);
  const location = pick(CITIES);
  const streetNumber = 1 + Math.floor(Math.random() * 200);
  const dob = randomDate(1938, 2018);
  const now = new Date();
  const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
  const createdAt = new Date(twoYearsAgo.getTime() + Math.random() * (now.getTime() - twoYearsAgo.getTime()));
  const updatedAt = new Date(createdAt.getTime() + Math.floor(Math.random() * 5) * 86400000);

  let email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@example.com`;
  while (usedEmails.has(email)) {
    email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}.${Math.floor(Math.random() * 1000)}@example.com`;
  }
  usedEmails.add(email);

  return {
    referral_id: makeReferralId(usedIds, createdAt.getFullYear()),
    first_name: firstName,
    last_name: lastName,
    date_of_birth: formatDateOnly(dob),
    gender,
    contact_number: randomPhone(),
    email,
    address: `${streetNumber} ${pick(STREET_NAMES)}, ${location.city}, ${location.state} ${location.zip}`,
    blood_group: Math.random() < 0.9 ? pick(BLOOD_GROUPS) : null,
    allergies: pickSome(ALLERGIES_POOL, 3),
    insurance: {
      memberId: `MEM${1000 + Math.floor(Math.random() * 9000)}`,
      provider: pick(INSURANCE_PROVIDERS),
      policyNumber: `PLY-${1000 + Math.floor(Math.random() * 9000)}`
    },
    primary_doctor_id: null,
    created_at: createdAt.toISOString(),
    updated_at: updatedAt.toISOString()
  };
}

async function seedPatients() {
  console.log('Checking existing patient count...');
  const { count, error: countError } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('Failed to read patients count:', countError.message);
    process.exit(1);
  }

  const existing = count || 0;
  console.log(`Existing patients: ${existing}`);

  const toCreate = TARGET_COUNT - existing;
  if (toCreate <= 0) {
    console.log(`Already at or above target of ${TARGET_COUNT}. Nothing to do.`);
    return;
  }

  console.log(`Seeding ${toCreate} new patient record(s) to reach ${TARGET_COUNT}...`);

  const { data: existingReferrals } = await supabase.from('patients').select('referral_id');
  const { data: existingEmails } = await supabase.from('patients').select('email');
  const usedIds = new Set((existingReferrals || []).map(r => r.referral_id));
  const usedEmails = new Set((existingEmails || []).map(r => r.email));

  let created = 0;
  for (let batchStart = 0; batchStart < toCreate; batchStart += BATCH_SIZE) {
    const batchSize = Math.min(BATCH_SIZE, toCreate - batchStart);
    const batch = Array.from({ length: batchSize }, (_, i) =>
      buildPatient(batchStart + i, usedIds, usedEmails)
    );

    const { data, error } = await supabase.from('patients').insert(batch).select('id');

    if (error) {
      console.error(`Batch starting at ${batchStart} failed:`, error.message, error.hint || '');
      process.exit(1);
    }

    created += data.length;
    console.log(`  Inserted ${created}/${toCreate}`);
  }

  console.log(`Done. Patients table now has ${existing + created} records.`);
}

seedPatients()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed script failed:', err);
    process.exit(1);
  });
