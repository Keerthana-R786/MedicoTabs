# YOXA OpenAPI Connector Files

This directory contains 11 OpenAPI 3.1.0 connector files for YOXA multiagent workflow integration.

## 📋 Connector Files Overview

| # | File Name | Operation ID | Purpose |
|---|-----------|--------------|---------|
| 1 | `get-patient-data.yaml` | `getPatientData` | Retrieve patient demographics, history, and clinical info |
| 2 | `get-clinical-summary.yaml` | `getClinicalSummary` | Get clinical summary and diagnosis for referral |
| 3 | `generate-referral-letter.yaml` | `generateReferralLetter` | Create formal referral letter document |
| 4 | `check-insurance-eligibility.yaml` | `checkInsuranceEligibility` | Verify patient insurance coverage |
| 5 | `get-specialist-availability.yaml` | `getSpecialistAvailability` | Check specialist appointment slots |
| 6 | `book-appointment.yaml` | `bookAppointment` | Schedule specialist appointment |
| 7 | `send-secure-message.yaml` | `sendSecureMessage` | Inter-provider secure communication |
| 8 | `get-treatment-guidelines.yaml` | `getTreatmentGuidelines` | Clinical decision support |
| 9 | `update-patient-record.yaml` | `updatePatientRecord` | Write back workflow results to EHR |
| 10 | `generate-prior-auth.yaml` | `generatePriorAuth` | Create prior authorization request |
| 11 | `notify-patient.yaml` | `notifyPatient` | Send patient notifications |

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
For each of the 11 YAML files:
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
- Configure tokens in YOXA platform UI
- Tokens are stored securely by YOXA
- Backend validates tokens on each request

### Environment Variables Required
After uploading connectors, configure these in Render:
```env
YOXA_API_KEY=<your-yoxa-api-key>
YOXA_WORKFLOW_ID=<your-workflow-id>
YOXA_HMAC_SECRET=<hmac-signing-secret>
```

---

## ✅ Validation Checklist

Before activating in YOXA:

- [ ] All 11 YAML files uploaded successfully
- [ ] Each connector mapped to correct simulated tool
- [ ] Authentication configured for each connector
- [ ] All connection tests passing (200 responses)
- [ ] Backend endpoints implemented (see next section)
- [ ] Environment variables set in Render
- [ ] HITL webhook configured
- [ ] Trigger endpoint verified

---

## 🛠️ Next Steps: Backend Implementation

After uploading these YAML files, you need to implement the 11 backend endpoints:

1. Create `backend/src/routes/yoxa.js` with all 11 route handlers
2. Implement business logic for each operation
3. Connect to Supabase database
4. Add authentication middleware
5. Test each endpoint individually
6. Deploy updated backend to Render

See `backend/YOXA_INTEGRATION_GUIDE.md` for detailed implementation instructions.

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
