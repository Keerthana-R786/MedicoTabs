# YOXA OpenAPI Connector Files

This directory contains 23 OpenAPI 3.1.0 connector files for YOXA multiagent workflow integration — one per tool endpoint in `backend/src/routes/yoxa.js`.

## 📋 Connector Files Overview

| # | File Name | Backend Route |
|---|-----------|----------------|
| 1 | `calculate-urgency-sla.yaml` | `POST /api/yoxa/calculate-urgency-sla` |
| 2 | `get-patient-data.yaml` | `POST /api/yoxa/get-patient-data` |
| 3 | `get-clinical-summary.yaml` | `POST /api/yoxa/get-clinical-summary` |
| 4 | `generate-referral-letter.yaml` | `POST /api/yoxa/generate-referral-letter` |
| 5 | `check-insurance-eligibility.yaml` | `POST /api/yoxa/check-insurance-eligibility` |
| 6 | `get-specialist-availability.yaml` | `POST /api/yoxa/get-specialist-availability` |
| 7 | `book-appointment.yaml` | `POST /api/yoxa/book-appointment` |
| 8 | `send-secure-message.yaml` | `POST /api/yoxa/send-secure-message` |
| 9 | `get-treatment-guidelines.yaml` | `POST /api/yoxa/get-treatment-guidelines` |
| 10 | `update-patient-record.yaml` | `POST /api/yoxa/update-patient-record` |
| 11 | `generate-prior-auth.yaml` | `POST /api/yoxa/generate-prior-auth` |
| 12 | `coordinator-escalation-alert.yaml` | `POST /api/yoxa/coordinator-escalation-alert` |
| 13 | `notify-patient.yaml` | `POST /api/yoxa/notify-patient` |
| 14 | `patient-reengagement-nudge.yaml` | `POST /api/yoxa/patient-reengagement-nudge` |
| 15 | `unified-fhir-referral-exchange.yaml` | `POST /api/yoxa/unified-fhir-referral-exchange` |
| 16 | `secure-targeted-document-portal.yaml` | `POST /api/yoxa/secure-targeted-document-portal` |
| 17 | `specialist-alert.yaml` | `POST /api/yoxa/specialist-alert` |
| 18 | `ehr-documentreference-save.yaml` | `POST /api/yoxa/ehr-documentreference-save` |
| 19 | `specialist-attendance-record.yaml` | `POST /api/yoxa/specialist-attendance-record` |
| 20 | `specialist-routing-availability.yaml` | `POST /api/yoxa/specialist-routing-availability` |
| 21 | `coverage-preapproval-verification.yaml` | `POST /api/yoxa/coverage-preapproval-verification` |
| 22 | `appointment-slot-acceptance.yaml` | `POST /api/yoxa/appointment-slot-acceptance` |
| 23 | `consolidated-referral-summary-pdf.yaml` | `POST /api/yoxa/consolidated-referral-summary-pdf` |

---

## 🔧 Technical Specifications

### Common Features
- **OpenAPI Version**: 3.1.0
- **Server URL**: `https://medicotabs.onrender.com` (deployed backend)
- **Authentication**: Bearer token (HTTP Bearer scheme)
- **Content Type**: `application/json`
- **HTTP Method**: POST (all endpoints)

### URL Structure
All endpoints follow the pattern:
```
https://medicotabs.onrender.com/api/yoxa/{operation}
```

---

## 📤 Upload to YOXA

### Step 1: Navigate to API Configuration
1. Log into YOXA platform
2. Go to **Release → API Configuration**
3. Click **"Upload Connector"**

### Step 2: Upload Each File
For each of the 23 YAML files:
1. Click **"Upload Connector"**
2. Select the `.yaml` file
3. Map to corresponding simulated tool name in workflow
4. Click **"Save"**

### Step 3: Configure Authentication
After uploading each connector:
1. Click **"Configure"** on the connector
2. Select **"Bearer Auth"** as authentication type
3. Enter your backend API key/token
4. Click **"Save"**

### Step 4: Test Connections
For each connector:
1. Click **"Test Connection"**
2. Provide sample request values
3. Verify you get a 200 response
4. Fix any errors before proceeding

---

## 🔗 Workflow Stage Mapping

### Stage 1: Referral Creation & Routing
- `get-patient-data.yaml` → Retrieve patient information
- `get-clinical-summary.yaml` → Get clinical details
- `generate-referral-letter.yaml` → Create referral document

### Stage 2: Acceptance & Records
- `send-secure-message.yaml` → Provider communication

### Stage 3: Coverage Verification
- `check-insurance-eligibility.yaml` → Verify insurance
- `generate-prior-auth.yaml` → Create prior auth if needed

### Stage 4: Scheduling & Attendance
- `get-specialist-availability.yaml` → Check availability
- `book-appointment.yaml` → Schedule appointment
- `notify-patient.yaml` → Send appointment confirmation

### Stage 5: Completion & Archive
- `update-patient-record.yaml` → Write results back to EHR
- `get-treatment-guidelines.yaml` → Clinical decision support

---

## 🔐 Security Notes

### Authentication
All connectors use **Bearer token authentication**:
```yaml
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
security:
  - bearerAuth: []
```

**Important:**
- Never commit actual tokens to Git
- Configure the SAME token in the YOXA platform UI (Bearer Auth) for every connector above and in the backend's `YOXA_TOOLS_API_KEY` env var
- Until `YOXA_TOOLS_API_KEY` is set on the backend, `/api/yoxa/*` runs unauthenticated (logged loudly on every request) — don't leave it unset in production
- Backend validates the Bearer token on every `/api/yoxa/*` request (`backend/src/middleware/yoxaAuth.js`)

### Environment Variables Required
These are the actual variable names the backend reads (`backend/src/config/yoxa.js`) — configure them in Render:
```env
YOXA_TRIGGER_URL=<yoxa workflow trigger url>
YOXA_DEPLOYMENT_SECRET=<yoxa deployment secret>
YOXA_DEPLOYMENT_ID=<yoxa deployment id>
YOXA_API_BASE=<yoxa api base url>
YOXA_HITL_WEBHOOK_SIGNING_SECRET=<hitl webhook hmac secret>
YOXA_HITL_RESPONSE_SECRET=<hitl response secret>
YOXA_TOOLS_API_KEY=<bearer token YOXA sends on every /api/yoxa/* call — must match the YOXA platform UI config>
```

---

## ✅ Validation Checklist

Before activating in YOXA:

- [ ] All 23 YAML files uploaded successfully
- [ ] Each connector mapped to correct simulated tool
- [ ] Authentication configured for each connector
- [ ] All connection tests passing (200 responses)
- [ ] Backend endpoints implemented (see next section)
- [ ] Environment variables set in Render
- [ ] HITL webhook configured
- [ ] Trigger endpoint verified

---

## 🛠️ Backend Implementation Status

All 23 route handlers already exist in `backend/src/routes/yoxa.js`, gated by `requireYoxaAuth` (`backend/src/middleware/yoxaAuth.js`). See `backend/YOXA_INTEGRATION_GUIDE.md` for implementation details.

---

## 📖 Resources

- **YOXA Documentation**: https://docs.yoxa.ai
- **OpenAPI 3.1 Spec**: https://spec.openapis.org/oas/v3.1.0
- **Backend Integration Guide**: `../YOXA_INTEGRATION_GUIDE.md`
- **Deployment Guide**: `../../DEPLOYMENT.md`

---

## 🆘 Troubleshooting

### Connector Upload Fails
- Check YAML syntax with validator
- Ensure `servers[0].url` has no path prefix
- Verify `operationId` is unique across all connectors

### Connection Test Fails
- Verify backend is running at https://medicotabs.onrender.com
- Check endpoint exists and is accessible
- Verify authentication token is correct
- Check backend logs for errors

### YOXA Can't Call Endpoint
- Ensure backend is publicly accessible (not localhost)
- Verify CORS allows YOXA origin
- Check firewall/security group settings
- Verify SSL certificate is valid

---

**Created**: 2026-08-20  
**Version**: 1.0.0  
**Status**: Ready for YOXA upload ✅
