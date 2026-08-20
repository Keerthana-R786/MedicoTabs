# MedicoTabs Backend API

Backend server for MedicoTabs EHR system with YOXA multiagent workflow integration.

## Features

- **Referral Management** - Create referrals and trigger YOXA workflows
- **YOXA Integration** - Automatic workflow triggering and HITL handling
- **HITL Webhook Receiver** - Secure webhook endpoint with HMAC verification
- **Flight Tracker Management** - Track workflow progress
- **Patient Management** - CRUD operations for patient records
- **Database Integration** - Supabase PostgreSQL

## Installation

```bash
cd backend
npm install
```

## Configuration

1. **Copy environment template:**
```bash
cp .env.example .env
```

2. **Configure Supabase:**
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
```

3. **Configure YOXA (you'll get these from YOXA after setup):**
```env
YOXA_TRIGGER_URL=https://yoxa-instance/api/v1/triggers/your-trigger-id
YOXA_DEPLOYMENT_SECRET=your_deployment_secret
YOXA_DEPLOYMENT_ID=your_deployment_id
YOXA_API_BASE=https://yoxa-instance
YOXA_HITL_WEBHOOK_SIGNING_SECRET=your_webhook_secret
YOXA_HITL_RESPONSE_SECRET=your_response_secret
```

## Running

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

Server runs on `http://localhost:5000`

## API Endpoints

### Health Check
```
GET /health
```

### Patients
```
GET    /api/patients              - Get all patients
GET    /api/patients/search?q=... - Search patients
GET    /api/patients/:id          - Get patient by ID
POST   /api/patients              - Create patient
PUT    /api/patients/:id          - Update patient
GET    /api/patients/:id/referrals - Get patient referrals
GET    /api/patients/:id/trackers  - Get patient trackers
GET    /api/patients/:id/documents - Get patient documents
```

### Referrals (YOXA Integration)
```
GET    /api/referrals              - Get all referrals
GET    /api/referrals/:id          - Get referral by ID
POST   /api/referrals              - Create referral & TRIGGER YOXA
PUT    /api/referrals/:id          - Update referral
POST   /api/referrals/:id/accept   - Accept referral
POST   /api/referrals/:id/deny     - Deny referral
```

### Flight Trackers
```
GET    /api/trackers/:id           - Get tracker by ID
POST   /api/trackers               - Create tracker
PUT    /api/trackers/:id           - Update tracker
POST   /api/trackers/:id/signoff   - Sign off tracker
```

### HITL (YOXA Integration)
```
POST   /api/hitl/webhook           - Receive YOXA approval requests
GET    /api/hitl/pending           - Get pending approvals
GET    /api/hitl/:id               - Get approval by ID
POST   /api/hitl/:requestId/respond - Send response to YOXA
```

## YOXA Integration Flow

### 1. Trigger Workflow (Create Referral)
```javascript
POST /api/referrals
{
  "patientId": "uuid",
  "requestedSpecialty": "Gastroenterology",
  "referralReason": "Progressive dysphagia",
  "urgency": "Urgent", // Routine | Urgent | Emergency
  // ... other fields
}

// Backend:
// 1. Saves referral to database
// 2. Calls YOXA trigger endpoint with referral data
// 3. Stores workflow_run_id returned by YOXA
// 4. Creates flight tracker linked to workflow
// 5. Returns referral with workflowRunId
```

### 2. Receive HITL Approval (Webhook)
```javascript
// YOXA sends to: POST /api/hitl/webhook
// Headers:
//   X-Yoxa-Webhook-Id: event_id
//   X-Yoxa-Webhook-Timestamp: 2025-01-15T10:30:00Z
//   X-Yoxa-Webhook-Signature: v1=hmac_sha256_hex

// Backend:
// 1. Verifies HMAC signature (security critical!)
// 2. Checks timestamp freshness (prevents replay)
// 3. Deduplicates on event_id (idempotent)
// 4. Stores approval request in database
// 5. Creates notification for assigned doctor
// 6. Returns 200 immediately (YOXA expects fast response)
```

### 3. Respond to Approval
```javascript
POST /api/hitl/:requestId/respond
{
  "selectedOptionId": "opt-001"
  // OR
  "overrideMessage": "Custom response text"
}

// Backend:
// 1. Retrieves approval from database
// 2. Sends response to YOXA with HITL response secret
// 3. Updates approval status to 'answered'
// 4. Updates referral and tracker status
// 5. YOXA workflow resumes automatically
```

## Security Features

### HMAC Signature Verification
```javascript
// Protects webhook endpoint from unauthorized requests
// Uses constant-time comparison to prevent timing attacks
// Validates timestamp to prevent replay attacks
```

### Environment Variables
```javascript
// All secrets in environment variables (never in code)
// Separate secrets for trigger and HITL response
// Service role key for Supabase admin operations
```

## Error Handling

- **Workflow trigger failure**: Referral still created but marked as pending
- **HITL webhook failure**: Returns appropriate status code for YOXA retry
- **Database errors**: Proper error responses with rollback where needed
- **Validation errors**: 400 responses with clear error messages

## Testing YOXA Integration

### 1. Test Trigger
```bash
curl -X POST http://localhost:5000/api/referrals \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "patient-uuid",
    "requestedSpecialty": "Cardiology",
    "referralReason": "Chest pain",
    "urgency": "Urgent"
  }'
```

### 2. Test HITL Webhook (from YOXA)
```bash
# Use YOXA's "Send test event" button in Integration screen
# Or manually with:
curl -X POST http://localhost:5000/api/hitl/webhook \
  -H "X-Yoxa-Webhook-Id: test-123" \
  -H "X-Yoxa-Webhook-Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  -H "X-Yoxa-Webhook-Signature: v1=<calculated_hmac>" \
  -H "Content-Type: application/json" \
  -d '{"event_type":"hitl.webhook_test"}'
```

### 3. Test HITL Response
```bash
curl -X POST http://localhost:5000/api/hitl/req-123/respond \
  -H "Content-Type: application/json" \
  -d '{"selectedOptionId":"opt-001"}'
```

## Logging

The server logs all YOXA integration events:
- ✓ Success (green checkmark)
- ✗ Failure (red X)
- ⚠ Warning (yellow warning)
- 🚀 Trigger events
- 📨 Webhook received
- 📤 Response sent

## Next Steps

1. **Set up Supabase**
   - Create project
   - Run database migration (see DEPLOYMENT.md)
   - Get credentials

2. **Configure YOXA**
   - Create OpenAPI YAML files (next step!)
   - Upload to YOXA
   - Generate secrets
   - Configure webhook URL

3. **Test Integration**
   - Create test referral
   - Verify workflow triggered
   - Test HITL webhook
   - Complete approval flow

4. **Deploy**
   - Deploy backend to cloud
   - Update YOXA webhook URL
   - Activate workflow

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js      # Supabase connection
│   │   └── yoxa.js          # YOXA configuration
│   ├── routes/
│   │   ├── patients.js      # Patient endpoints
│   │   ├── referrals.js     # Referral endpoints + workflow trigger
│   │   ├── trackers.js      # Flight tracker endpoints
│   │   └── hitl.js          # HITL webhook & response
│   ├── services/
│   │   └── yoxaService.js   # YOXA integration logic
│   ├── utils/
│   │   └── hmacVerifier.js  # Webhook signature verification
│   └── index.js             # Server entry point
├── .env.example
├── package.json
└── README.md
```

## Support

- See main project README for full documentation
- Check DEPLOYMENT.md for production setup
- Review deployment-helper/ for YOXA integration details
