# Quick Upload Guide for YOXA

## Quick Start

### 1. Open YOXA Platform
Go to: **Release → API Configuration**

### 2. Upload All 15 Files

Click **"Upload Connector"** and upload each file in this order:

```
Stage 1 — Create and Route the Referral:
  1. unified-fhir-referral-exchange.yaml
  2. specialist-alert.yaml
  3. specialist-routing-availability.yaml
  4. coordinator-escalation-alert.yaml
  5. calculate-urgency-sla.yaml

Stage 2 — Confirm Acceptance and Exchange Documents:
  6. secure-targeted-document-portal.yaml
  7. document-request-notice.yaml   (replaces Platform Email Document Request Notice)

Stage 3 — Verify Applicable Coverage:
  8. coverage-preapproval-verification.yaml
  9. coverage-denial-notice.yaml    (replaces Platform Email Coverage Denial Notice)

Stage 4 — Schedule and Verify Attendance:
  10. appointment-slot-acceptance.yaml
  11. specialist-attendance-record.yaml
  12. patient-reengagement-nudge.yaml

Stage 5 — Approve Completion, Archive, and Deliver:
  13. consolidated-referral-summary-pdf.yaml
  14. ehr-documentreference-save.yaml
  15. doctor-signoff-reminder.yaml  (replaces Platform Email Doctor Sign-off Reminder)
```

### 3. Map to Workflow Tools

After each upload, YOXA will ask you to map the connector to a simulated tool in your workflow. Match them like this:

| YAML File | Workflow Tool |
|-----------|---------------|
| `unified-fhir-referral-exchange.yaml` | `unified_fhir_referral_exchange` |
| `specialist-alert.yaml` | `specialist_alert` |
| `specialist-routing-availability.yaml` | `specialist_routing_availability` |
| `coordinator-escalation-alert.yaml` | `coordinator_escalation_alert` |
| `calculate-urgency-sla.yaml` | `tool_24_call` |
| `secure-targeted-document-portal.yaml` | `secure_targeted_document_portal` |
| `coverage-preapproval-verification.yaml` | `coverage_preapproval_verification` |
| `appointment-slot-acceptance.yaml` | `appointment_slot_acceptance` |
| `specialist-attendance-record.yaml` | `specialist_attendance_record` |
| `patient-reengagement-nudge.yaml` | `patient_reengagement_nudge` |
| `consolidated-referral-summary-pdf.yaml` | `consolidated_referral_summary_pdf` |
| `ehr-documentreference-save.yaml` | `ehr_documentreference_save` |
| `document-request-notice.yaml` | `documentRequestNotice` (replaces Platform Email Document Request Notice) |
| `coverage-denial-notice.yaml` | `coverageDenialNotice` (replaces Platform Email Coverage Denial Notice) |
| `doctor-signoff-reminder.yaml` | `doctorSignoffReminder` (replaces Platform Email Doctor Sign-off Reminder) |

> **Note:** The workflow's HITL gate, `doctor_completion_signoff_approval`, is a Human-in-the-Loop approval — configure it under **Release → Integration → Human Approvals**, not as an API connector.

### 4. Configure Authentication

For each uploaded connector:
1. Click **"Configure"**
2. Select **"Bearer Token"** authentication
3. Enter your API token (get from backend team)
4. Save

### 5. Test Each Connector

For each connector:
1. Click **"Test Connection"**
2. Fill in sample request data
3. Click **"Run Test"**
4. Verify 200 OK response
5. Fix any errors

---

## Common Issues

### "Server URL contains path"
**Error**: `servers[0].url` has a path prefix

**Fix**: Server URL should be `https://medicotabs.onrender.com` only, no `/api/` prefix

### "Connection timeout"
**Problem**: YOXA can't reach backend

**Fix**:
- Verify backend is running: https://medicotabs.onrender.com/health
- Check if Render service is awake (cold start delay)
- Wait 30 seconds and retry

### "Authentication failed"
**Problem**: Bearer token is invalid

**Fix**:
- Get fresh token from backend team
- Verify token has correct format
- Check token hasn't expired

---

## Success Checklist

Before activating workflow:

- [ ] All 15 connectors uploaded
- [ ] All connectors mapped to correct workflow tools
- [ ] All authentication configured
- [ ] All connection tests passing
- [ ] HITL approval gate configured for doctor sign-off
- [ ] Backend endpoints implemented
- [ ] HITL webhook configured

---

## Backend Status

**Deployed URL**: https://medicotabs.onrender.com

**Health Check**:
```bash
curl https://medicotabs.onrender.com/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-08-20T...",
  "service": "MedicoTabs Backend API"
}
```

---

## Need Help?

- Check `README.md` in this directory for detailed docs
- Review `../YOXA_INTEGRATION_GUIDE.md` for backend setup
- Contact backend team if endpoints aren't responding

---

**Ready to upload?** Start with file #1 and work through the list! 🚀
