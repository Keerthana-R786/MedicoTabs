# Deployment Guide - MedicoTabs EHR System

## Overview

This guide covers deploying the MedicoTabs EHR system with YOXA multiagent workflow integration.

## Architecture

```
Frontend (React + Vite)
    ↓
Backend API Server (Node.js/Express)
    ↓
Supabase (Database + Auth + Storage)
    ↓
YOXA Workflow Engine (Multiagent orchestration)
```

## Prerequisites

1. **Supabase Project**
   - Create account at https://supabase.com
   - Create new project
   - Note the Project URL and anon key

2. **YOXA Deployment**
   - YOXA workflow must be configured
   - Deployment secrets generated
   - Trigger URL available

3. **Node.js Environment**
   - Node.js 18+ and npm

## Database Setup

### Supabase Tables

Create these tables in Supabase SQL Editor:

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('primary_doctor', 'specialist_doctor', 'coordinator')),
  organization TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  specialization TEXT,
  license_number TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Patients table
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referral_id TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  contact_number TEXT NOT NULL,
  email TEXT NOT NULL,
  address TEXT NOT NULL,
  blood_group TEXT,
  allergies TEXT[],
  insurance JSONB NOT NULL,
  primary_doctor_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Patient documents table
CREATE TABLE patient_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('lab_result', 'imaging', 'prescription', 'referral', 'medical_history', 'other')),
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  size INTEGER NOT NULL
);

-- Flight trackers table
CREATE TABLE flight_trackers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  visit_reason TEXT NOT NULL,
  urgency TEXT NOT NULL CHECK (urgency IN ('Routine', 'Urgent', 'Emergency')),
  current_stage TEXT NOT NULL,
  stages JSONB NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  signed_off_by UUID REFERENCES users(id),
  signed_off_at TIMESTAMP WITH TIME ZONE,
  workflow_run_id TEXT
);

-- Referrals table
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referral_number TEXT UNIQUE NOT NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  primary_doctor_id UUID REFERENCES users(id),
  primary_doctor_name TEXT NOT NULL,
  primary_organization TEXT NOT NULL,
  specialist_id UUID REFERENCES users(id),
  specialist_name TEXT,
  specialist_organization TEXT,
  requested_specialty TEXT NOT NULL,
  specialist_preference TEXT,
  referral_reason TEXT NOT NULL,
  service_type TEXT,
  urgency TEXT NOT NULL CHECK (urgency IN ('Routine', 'Urgent', 'Emergency')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'routed', 'accepted', 'denied', 'rerouted', 'completed', 'archived')),
  tracker_id UUID REFERENCES flight_trackers(id),
  targeted_documents TEXT[],
  coverage_status TEXT CHECK (coverage_status IN ('not_applicable', 'verified', 'denied', 'pending')),
  appointment_details JSONB,
  attendance_status TEXT CHECK (attendance_status IN ('scheduled', 'attended', 'missed', 'unconfirmed')),
  workflow_run_id TEXT,
  acknowledgment_deadline TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referral_id UUID REFERENCES referrals(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id),
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL,
  recipient_id UUID REFERENCES users(id),
  recipient_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  attachments TEXT[],
  is_read BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  replied_at TIMESTAMP WITH TIME ZONE
);

-- HITL approval requests table
CREATE TABLE hitl_approval_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id TEXT UNIQUE NOT NULL,
  request_id TEXT UNIQUE NOT NULL,
  workflow_run_id TEXT NOT NULL,
  deployment_id TEXT NOT NULL,
  referral_id UUID REFERENCES referrals(id),
  patient_id UUID REFERENCES patients(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  options JSONB NOT NULL,
  assigned_to UUID REFERENCES users(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'answered', 'expired')),
  selected_option_id TEXT,
  override_message TEXT,
  answered_by UUID REFERENCES users(id),
  answered_at TIMESTAMP WITH TIME ZONE,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Coverage verifications table
CREATE TABLE coverage_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referral_id UUID REFERENCES referrals(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id),
  insurance_provider TEXT NOT NULL,
  member_id TEXT NOT NULL,
  eligibility_status TEXT NOT NULL CHECK (eligibility_status IN ('active', 'inactive', 'pending')),
  pre_approval_required BOOLEAN NOT NULL,
  pre_approval_number TEXT,
  pre_approval_status TEXT CHECK (pre_approval_status IN ('approved', 'denied', 'pending')),
  expected_copay DECIMAL(10, 2),
  coverage_notes TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by TEXT
);

-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('referral', 'approval', 'message', 'alert', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  referral_id UUID REFERENCES referrals(id),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  action_url TEXT
);

-- Document requests table — a specialist naming specific documents they need
-- from the primary doctor, distinct from patient_documents (what's already
-- uploaded) and referrals.targeted_documents (what's already been shared).
CREATE TABLE document_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referral_id UUID REFERENCES referrals(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id),
  requested_by UUID REFERENCES users(id),
  requested_by_name TEXT NOT NULL,
  requested_from UUID REFERENCES users(id),
  items TEXT[] NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'declined')),
  fulfilled_document_ids UUID[],
  fulfilled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_patients_referral_id ON patients(referral_id);
CREATE INDEX idx_patients_primary_doctor ON patients(primary_doctor_id);
CREATE INDEX idx_referrals_patient ON referrals(patient_id);
CREATE INDEX idx_referrals_workflow ON referrals(workflow_run_id);
CREATE INDEX idx_messages_referral ON messages(referral_id);
CREATE INDEX idx_hitl_workflow ON hitl_approval_requests(workflow_run_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
```

## Backend Server Setup

Create a backend server (recommended: Express.js):

```bash
mkdir backend && cd backend
npm init -y
npm install express cors dotenv @supabase/supabase-js axios crypto
```

### Environment Variables (Backend `.env`)

```env
# Supabase
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_service_role_key

# YOXA Integration
YOXA_TRIGGER_URL=https://yoxa.example.com/api/v1/triggers/your-trigger-id
YOXA_DEPLOYMENT_SECRET=your_deployment_secret
YOXA_HITL_WEBHOOK_SIGNING_SECRET=your_hitl_webhook_signing_secret
YOXA_HITL_RESPONSE_SECRET=your_hitl_response_secret

# Server
PORT=5000
NODE_ENV=production
```

### Key Backend Endpoints

1. **POST /api/referrals** - Creates referral and triggers YOXA workflow
2. **POST /api/hitl/webhook** - Receives YOXA HITL approval requests
3. **POST /api/hitl/:requestId/respond** - Sends approval response to YOXA

See `deployment-helper/` for complete integration guidance.

## Frontend Deployment

### 1. Configure Environment

```env
# .env.production
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_BACKEND_API_URL=https://your-backend-api.com
```

### 2. Build Frontend

```bash
npm install
npm run build
```

### 3. Deploy Options

**Option A: Vercel**
```bash
npm install -g vercel
vercel --prod
```

**Option B: Netlify**
```bash
npm install -g netlify-cli
netlify deploy --prod
```

**Option C: Static hosting**
- Upload `dist/` folder to any static host
- Configure API proxy if needed

## YOXA Integration Steps

### 1. Configure API Connectors

Follow the workflow context document to create OpenAPI YAML files for each simulated tool:

- `unified_fhir_referral_exchange.openapi.yml`
- `specialist_alert.openapi.yml`
- `coverage_preapproval_verification.openapi.yml`
- `appointment_slot_acceptance.openapi.yml`
- `specialist_attendance_record.openapi.yml`
- (and others)

### 2. Upload to YOXA

1. Go to YOXA Release → API Configuration
2. Upload each OpenAPI file
3. Map to corresponding simulated tools
4. Test with API Connection Check

### 3. Configure HITL

1. Go to Release → Integration
2. Enter your webhook URL: `https://your-backend.com/api/hitl/webhook`
3. Generate and save webhook signing secret
4. Generate and save HITL response secret
5. Test with "Send test event"

### 4. Configure Trigger

1. Get trigger URL from YOXA
2. Get deployment secret
3. Save both to backend `.env`
4. Implement trigger in backend after referral creation
5. Test with verification cURL

### 5. Activate

After all tests pass, click **Activate** in YOXA.

## Testing Checklist

- [ ] Frontend builds without errors
- [ ] Backend connects to Supabase
- [ ] User authentication works
- [ ] Patient CRUD operations work
- [ ] Referral creation triggers YOXA workflow
- [ ] Flight tracker updates from workflow
- [ ] HITL webhook receives test event
- [ ] HITL response sends successfully
- [ ] Workflow completes end-to-end
- [ ] Documents upload/download correctly
- [ ] Messages send between users

## Monitoring

### Backend Logs
Monitor for:
- YOXA webhook deliveries
- Trigger invocations
- HITL responses
- API errors

### YOXA Workflow Runs
Check in YOXA dashboard:
- Workflow execution status
- Agent actions and results
- Connector call success/failure
- HITL request/response flow

## Security Checklist

- [ ] All secrets in environment variables (not code)
- [ ] HTTPS enforced on all endpoints
- [ ] HITL webhook signature verification implemented
- [ ] Row-level security enabled on Supabase tables
- [ ] Authentication required for all API endpoints
- [ ] File upload validation and size limits
- [ ] CORS configured properly
- [ ] API rate limiting enabled

## Troubleshooting

### Workflow not triggering
- Check `YOXA_TRIGGER_URL` and `YOXA_DEPLOYMENT_SECRET`
- Verify trigger endpoint returns 200
- Check backend logs for errors

### HITL webhook not received
- Verify webhook URL is reachable from YOXA
- Check firewall/network configuration
- Test with "Send test event" in YOXA

### HITL response fails
- Verify `YOXA_HITL_RESPONSE_SECRET` is correct
- Check request format matches YOXA spec
- Review YOXA workflow run logs

## Support

Refer to:
- `README.md` - Application overview
- `deployment-helper/SKILL.md` - Integration guide
- `deployment-helper/references/` - Detailed reference docs
