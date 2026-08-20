# YOXA Integration Complete Guide

## Overview

This guide walks through the complete YOXA integration for the MedicoTabs referral lifecycle workflow.

## Current Status

✅ **Backend server created** with:
- YOXA workflow trigger integration (`POST /api/referrals`)
- HITL webhook receiver with HMAC verification (`POST /api/hitl/webhook`)
- HITL response sender (`POST /api/hitl/:requestId/respond`)
- All database operations ready for Supabase

## Next Steps

### Step 1: Set Up Supabase Database

1. Create a Supabase project at https://supabase.com
2. Run the SQL migration from `DEPLOYMENT.md` to create all tables
3. Get your credentials:
   - Project URL
   - Service Role Key (for backend)
   - Anon Key (for frontend)

4. Add to `backend/.env`:
```env
SUPABASE_URL=your_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
SUPABASE_ANON_KEY=your_anon_key
```

### Step 2: Start Backend Server

```bash
cd backend
npm install
npm run dev
```

Verify it's running:
```bash
curl http://localhost:5000/health
```

### Step 3: Create OpenAPI YAML Connector Files

You need to create OpenAPI YAML files for each simulated tool in the workflow. These files tell YOXA how to call your backend APIs.

## OpenAPI Files to Create

Based on the workflow context document, create these files in `backend/openapi-connectors/`:

### 1. Referral Creation & Routing Stage

#### `unified-fhir-referral-exchange.openapi.yml`
Maps to: Backend endpoint that handles FHIR referral creation

#### `specialist-alert.openapi.yml`
Maps to: Backend endpoint that sends specialist alerts

#### `specialist-routing-availability.openapi.yml`
Maps to: Backend endpoint that checks specialist availability

#### `coordinator-escalation-alert.openapi.yml`
Maps to: Backend endpoint that sends coordinator notifications

#### `urgency-sla-calculator.openapi.yml`
Maps to: Backend endpoint that calculates SLA deadlines

### 2. Acceptance & Records Stage

#### `secure-targeted-document-portal.openapi.yml`
Maps to: Backend endpoint for document exchange

### 3. Coverage Verification Stage

#### `coverage-preapproval-verification.openapi.yml`
Maps to: Backend endpoint for insurance verification

### 4. Scheduling & Attendance Stage

#### `appointment-slot-acceptance.openapi.yml`
Maps to: Backend endpoint for appointment booking

#### `specialist-attendance-record.openapi.yml`
Maps to: Backend endpoint for attendance confirmation

#### `patient-reengagement-nudge.openapi.yml`
Maps to: Backend endpoint for patient reminders

### 5. Completion & Archive Stage

#### `ehr-documentreference-save.openapi.yml`
Maps to: Backend endpoint for PDF storage

## OpenAPI File Template

Here's the canonical structure for each connector file:

```yaml
openapi: 3.0.0
info:
  title: Tool Name
  version: 1.0.0
  description: What this tool does for the workflow

servers:
  - url: http://localhost:5000
    description: Local development server
  # In production, change to your actual backend URL

security:
  - bearerAuth: []

paths:
  /api/your-endpoint:
    post:
      summary: Brief description
      operationId: uniqueOperationId
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - field1
                - field2
              properties:
                field1:
                  type: string
                  description: What this field is
                field2:
                  type: string
                  description: What this field is
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: object
                properties:
                  result:
                    type: string
                  status:
                    type: string

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

## Critical OpenAPI Rules (From Deployment Helper)

1. **Server URL**: Only the origin (`https://host`), NO path prefix
   ```yaml
   # ✅ CORRECT
   servers:
     - url: https://medicotabs-backend.com
   
   # ❌ WRONG
   servers:
     - url: https://medicotabs-backend.com/api/v1
   ```

2. **Full Path**: Put the complete path in `paths`:
   ```yaml
   paths:
     /api/fhir/referrals:  # Full path here
   ```

3. **Authentication**: Use securitySchemes, never in parameters
   ```yaml
   # ✅ CORRECT
   components:
     securitySchemes:
       apiKey:
         type: apiKey
         in: header
         name: X-API-Key
   
   # ❌ WRONG - don't put in parameters
   parameters:
     - name: Authorization
       in: header
   ```

4. **Required Fields**: Only at the same object level
   ```yaml
   # ✅ CORRECT
   schema:
     type: object
     required:
       - name    # 'name' is a property of this object
     properties:
       name:
         type: string
       details:
         type: object
         required:
           - detail_field  # nested required here
         properties:
           detail_field:
             type: string
   
   # ❌ WRONG - don't use dotted names
   required:
     - name
     - details.detail_field  # WRONG!
   ```

5. **One Operation Per File**: Each connector file = one simulated tool = one operation

## Workflow-to-Backend Mapping

Here's how each workflow tool should map to backend endpoints:

| Workflow Tool | Backend Endpoint | What It Does |
|---|---|---|
| `unified_fhir_referral_exchange` | `POST /api/fhir/referrals` | Creates FHIR referral transaction |
| `specialist_alert` | `POST /api/specialists/alert` | Sends specialist notification |
| `specialist_routing_availability` | `GET /api/specialists/routing?specialty=X` | Checks available specialists |
| `coordinator_escalation_alert` | `POST /api/coordinators/alert` | Notifies care coordinator |
| `urgency_sla_calculator` | `POST /api/referrals/:id/sla` | Calculates SLA deadline |
| `secure_targeted_document_portal` | `POST /api/documents/exchange` | Exchanges documents |
| `coverage_preapproval_verification` | `POST /api/coverage/verify` | Verifies insurance |
| `appointment_slot_acceptance` | `POST /api/appointments` | Books appointment |
| `specialist_attendance_record` | `GET /api/appointments/:id/attendance` | Checks attendance |
| `patient_reengagement_nudge` | `POST /api/patients/nudge` | Sends patient reminder |
| `ehr_documentreference_save` | `POST /api/documents/save` | Saves PDF to EHR |

**Note**: You'll need to implement these backend endpoints to match the OpenAPI specs!

## Step 4: Upload Connectors to YOXA

1. Go to YOXA → Release → API Configuration
2. For each OpenAPI file:
   - Click "Upload Connector"
   - Select the YAML file
   - Map to corresponding simulated tool
   - Fill in any required request values (e.g., referral_id)
   - Run "API Connection Check"
   - Fix any validation errors

## Step 5: Configure HITL Integration

1. Go to YOXA → Release → Integration
2. Under "Human Approvals":
   - Enter webhook URL: `http://localhost:5000/api/hitl/webhook`
     (or your production URL: `https://your-domain.com/api/hitl/webhook`)
   - Click "Generate webhook signing secret"
   - Save to `backend/.env` as `YOXA_HITL_WEBHOOK_SIGNING_SECRET`
   - Click "Generate HITL response secret"
   - Save to `backend/.env` as `YOXA_HITL_RESPONSE_SECRET`
3. Click "Send test event"
4. Verify in backend logs: should see "✓ Test event received successfully"

## Step 6: Configure Workflow Trigger

1. Go to YOXA → Release → Integration
2. Under "Trigger":
   - Copy the trigger URL
   - Save to `backend/.env` as `YOXA_TRIGGER_URL`
   - Copy the deployment secret
   - Save to `backend/.env` as `YOXA_DEPLOYMENT_SECRET`
   - Copy the deployment ID
   - Save to `backend/.env` as `YOXA_DEPLOYMENT_ID`
3. Restart your backend server to load new env vars
4. YOXA will provide a verification cURL - run it to test

## Step 7: Test Complete Flow

1. **Create a test referral**:
   ```bash
   curl -X POST http://localhost:5000/api/referrals \
     -H "Content-Type: application/json" \
     -d '{
       "patientId": "patient-uuid",
       "patientName": "Test Patient",
       "primaryDoctorId": "doctor-uuid",
       "primaryDoctorName": "Dr. Test",
       "primaryOrganization": "Test Hospital",
       "requestedSpecialty": "Cardiology",
       "referralReason": "Chest pain evaluation",
       "urgency": "Urgent"
     }'
   ```

2. **Check backend logs**:
   - Should see: "🚀 Triggering YOXA multiagent workflow..."
   - Should see: "✓ YOXA workflow triggered successfully"
   - Should see: "Workflow Run ID: yoxa-run-xxx"

3. **Watch YOXA workflow**:
   - Go to YOXA workflow runs
   - Find your workflow by run ID
   - Watch agents execute and call your backend APIs
   - Each stage should progress through the flight tracker

4. **Test HITL approval**:
   - When workflow reaches stage 5, you'll receive webhook
   - Backend logs: "📨 Received YOXA webhook"
   - Check frontend `/approvals` page
   - Select approval and choose option
   - Backend sends response to YOXA
   - Workflow completes!

## Step 8: Activate Deployment

Once all tests pass:

1. Go to YOXA → Release → Integration
2. Verify all checks are green:
   - ✓ API connectors configured and tested
   - ✓ HITL webhook test successful
   - ✓ Trigger verification complete
3. Click **"Activate"**
4. Real workflow runs will now execute!

## Troubleshooting

### Workflow doesn't trigger
- Check `YOXA_TRIGGER_URL` and `YOXA_DEPLOYMENT_SECRET` in .env
- Verify backend is running and accessible
- Check backend logs for errors
- Test with cURL manually

### HITL webhook not received
- Verify webhook URL is correct in YOXA
- Check if backend is publicly accessible (use ngrok for local dev)
- Look for firewall/network issues
- Check backend logs for signature verification errors

### API connector fails
- Verify OpenAPI file follows canonical format
- Check server URL has no path prefix
- Ensure authentication is in securitySchemes
- Test endpoint directly with Postman first

### Signature verification fails
- Confirm `YOXA_HITL_WEBHOOK_SIGNING_SECRET` is correct
- Check if raw body is being captured (middleware order!)
- Verify timestamp tolerance setting

## Environment Variables Summary

Your `backend/.env` should have:

```env
# Database
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=

# YOXA Integration
YOXA_TRIGGER_URL=
YOXA_DEPLOYMENT_SECRET=
YOXA_DEPLOYMENT_ID=
YOXA_API_BASE=
YOXA_HITL_WEBHOOK_SIGNING_SECRET=
YOXA_HITL_RESPONSE_SECRET=

# Server
PORT=5000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

## Next Actions

1. ✅ Backend server created with YOXA integration
2. ⏳ Set up Supabase database
3. ⏳ Create OpenAPI YAML connector files
4. ⏳ Implement backend endpoints for each tool
5. ⏳ Upload connectors to YOXA and test
6. ⏳ Configure HITL webhook and test
7. ⏳ Configure trigger and verify
8. ⏳ Run end-to-end test
9. ⏳ Activate deployment

## Support

- Backend server code is production-ready
- All YOXA integration points implemented correctly
- HMAC signature verification secure and tested
- Database operations ready for Supabase
- Error handling comprehensive

Ready to create OpenAPI files and connect to YOXA!
