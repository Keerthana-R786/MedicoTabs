# YOXA OpenAPI Connector Files

This directory contains 12 OpenAPI 3.1.0 connector files for the MedicoTabs Referral Lifecycle workflow — one per simulated API tool endpoint.

The workflow's 13th tool, `doctor_completion_signoff_approval`, is a Human-in-the-Loop (HITL) approval gate configured through YOXA's HITL integration, not an API connector.

## Connector Files

| # | File Name | Workflow Tool | Stage |
|---|-----------|---------------|-------|
| 1 | `unified-fhir-referral-exchange.yaml` | `unified_fhir_referral_exchange` | 1 — Create & Route |
| 2 | `specialist-alert.yaml` | `specialist_alert` | 1 — Create & Route |
| 3 | `specialist-routing-availability.yaml` | `specialist_routing_availability` | 1 — Create & Route |
| 4 | `coordinator-escalation-alert.yaml` | `coordinator_escalation_alert` | 1 — Create & Route |
| 5 | `calculate-urgency-sla.yaml` | `tool_24_call` (Urgency SLA Calculator) | 1 — Create & Route |
| 6 | `secure-targeted-document-portal.yaml` | `secure_targeted_document_portal` | 2 — Acceptance & Records |
| 7 | `coverage-preapproval-verification.yaml` | `coverage_preapproval_verification` | 3 — Coverage Verification |
| 8 | `appointment-slot-acceptance.yaml` | `appointment_slot_acceptance` | 4 — Scheduling & Attendance |
| 9 | `specialist-attendance-record.yaml` | `specialist_attendance_record` | 4 — Scheduling & Attendance |
| 10 | `patient-reengagement-nudge.yaml` | `patient_reengagement_nudge` | 4 — Scheduling & Attendance |
| 11 | `consolidated-referral-summary-pdf.yaml` | `consolidated_referral_summary_pdf` | 5 — Completion & Archive |
| 12 | `ehr-documentreference-save.yaml` | `ehr_documentreference_save` | 5 — Completion & Archive |

---

## Technical Specifications

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

## Workflow Stage Mapping

### Stage 1: Create and Route the Referral
Tools that create the referral, persist urgency, route through FHIR, alert the specialist, check routing alternatives, calculate the SLA window, and escalate if needed.

| Connector | Purpose |
|-----------|---------|
| `unified-fhir-referral-exchange.yaml` | Create and route the FHIR referral transaction |
| `specialist-alert.yaml` | Send specialist intake alert with urgency and acknowledgment deadline |
| `specialist-routing-availability.yaml` | Check same-specialty routing options and reroute eligibility |
| `coordinator-escalation-alert.yaml` | Escalate unacknowledged or denied referrals to care coordinator |
| `calculate-urgency-sla.yaml` | Calculate SLA deadline (Emergency 30 min / Urgent 4 h / Routine 24 h) |

### Stage 2: Confirm Acceptance and Exchange Documents
Tools that confirm explicit specialist acceptance, exchange only the targeted records needed for the consultation, and handle post-acceptance re-alerts or rerouting.

| Connector | Purpose |
|-----------|---------|
| `unified-fhir-referral-exchange.yaml` | Confirm specialist acceptance through FHIR |
| `secure-targeted-document-portal.yaml` | Open secure portal for targeted document exchange |
| `specialist-alert.yaml` | Re-alert if acceptance not received within SLA |
| `specialist-routing-availability.yaml` | Reroute after failed acceptance re-alert |
| `coordinator-escalation-alert.yaml` | Escalate denied or unresolved acceptance |

### Stage 3: Verify Applicable Coverage
Tools that apply the routine-visit exemption or verify eligibility, pre-approval, and co-pay for advanced treatments.

| Connector | Purpose |
|-----------|---------|
| `coverage-preapproval-verification.yaml` | Verify insurance eligibility and pre-approval requirements |
| `coordinator-escalation-alert.yaml` | Escalate when coverage is denied or payer evidence is missing |

### Stage 4: Schedule and Verify Attendance
Tools that secure a real appointment accepted by the patient, verify attendance from the specialist's record, re-engage after missed visits, and escalate unresolved attendance issues.

| Connector | Purpose |
|-----------|---------|
| `appointment-slot-acceptance.yaml` | Record offered slot and patient acceptance |
| `specialist-attendance-record.yaml` | Retrieve specialist attendance record after appointment |
| `patient-reengagement-nudge.yaml` | Send urgency-adjusted re-engagement prompt after missed visit |
| `coordinator-escalation-alert.yaml` | Escalate unresolved attendance issues |

### Stage 5: Approve Completion, Archive, and Deliver
Tools that generate the consolidated summary PDF, save it to the patient's EHR, and deliver it to the patient. Doctor sign-off is handled by the HITL approval gate (`doctor_completion_signoff_approval`).

| Connector | Purpose |
|-----------|---------|
| `consolidated-referral-summary-pdf.yaml` | Generate standardized referral journey PDF |
| `ehr-documentreference-save.yaml` | Save PDF as FHIR DocumentReference in patient EHR |
| `coordinator-escalation-alert.yaml` | Escalate archival or delivery failures |

---

## Upload to YOXA

### Step 1: Navigate to API Configuration
1. Log into YOXA platform
2. Go to **Release → API Configuration**
3. Click **"Upload Connector"**

### Step 2: Upload Each File
For each of the 12 YAML files:
1. Click **"Upload Connector"**
2. Select the `.yaml` file
3. Map to the corresponding simulated tool name in the workflow
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

## Security Notes

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

## Validation Checklist

Before activating in YOXA:

- [ ] All 12 YAML files uploaded successfully
- [ ] Each connector mapped to correct simulated tool
- [ ] Authentication configured for each connector
- [ ] All connection tests passing (200 responses)
- [ ] HITL approval gate configured for `doctor_completion_signoff_approval`
- [ ] Environment variables set in Render
- [ ] HITL webhook configured
- [ ] Trigger endpoint verified

---

## Backend Implementation Status

All 12 route handlers exist in `backend/src/routes/yoxa.js`, gated by `requireYoxaAuth` (`backend/src/middleware/yoxaAuth.js`). Additional backend-only routes (not in the YOXA workflow) remain available for direct API use.

---

## Resources

- **YOXA Documentation**: https://docs.yoxa.ai
- **OpenAPI 3.1 Spec**: https://spec.openapis.org/oas/v3.1.0
- **Backend Integration Guide**: `../YOXA_INTEGRATION_GUIDE.md`
- **Deployment Guide**: `../../DEPLOYMENT.md`

---

## Troubleshooting

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
**Updated**: 2026-08-30
**Version**: 2.0.0
**Status**: Aligned with MedicoTabs Referral Lifecycle workflow ✅
