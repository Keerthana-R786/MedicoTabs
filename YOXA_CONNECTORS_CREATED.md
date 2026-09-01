# ✅ YOXA OpenAPI Connectors — Updated

## What Was Updated

The OpenAPI connector files have been realigned to match the **MedicoTabs Referral Lifecycle** YOXA workflow exactly. Files not referenced by the workflow have been removed, and documentation has been updated across the board.

**Location:** `backend/openapi-connectors/`

---

## Connector Files (12 Total)

All files are OpenAPI 3.1.0 YAML, one per simulated API tool in the workflow:

| # | File | Workflow Tool | Stage |
|---|------|---------------|-------|
| 1 | `unified-fhir-referral-exchange.yaml` | `unified_fhir_referral_exchange` | 1 — Create & Route |
| 2 | `specialist-alert.yaml` | `specialist_alert` | 1 — Create & Route |
| 3 | `specialist-routing-availability.yaml` | `specialist_routing_availability` | 1 — Create & Route |
| 4 | `coordinator-escalation-alert.yaml` | `coordinator_escalation_alert` | 1 — Create & Route |
| 5 | `calculate-urgency-sla.yaml` | `tool_24_call` | 1 — Create & Route |
| 6 | `secure-targeted-document-portal.yaml` | `secure_targeted_document_portal` | 2 — Acceptance & Records |
| 7 | `coverage-preapproval-verification.yaml` | `coverage_preapproval_verification` | 3 — Coverage Verification |
| 8 | `appointment-slot-acceptance.yaml` | `appointment_slot_acceptance` | 4 — Scheduling & Attendance |
| 9 | `specialist-attendance-record.yaml` | `specialist_attendance_record` | 4 — Scheduling & Attendance |
| 10 | `patient-reengagement-nudge.yaml` | `patient_reengagement_nudge` | 4 — Scheduling & Attendance |
| 11 | `consolidated-referral-summary-pdf.yaml` | `consolidated_referral_summary_pdf` | 5 — Completion & Archive |
| 12 | `ehr-documentreference-save.yaml` | `ehr_documentreference_save` | 5 — Completion & Archive |

> The workflow's 13th tool, `doctor_completion_signoff_approval`, is a Human-in-the-Loop approval gate configured through YOXA's HITL integration.

---

## What Changed (2026-08-30)

### Removed (not in workflow)
- `book-appointment.yaml` — replaced by `appointment-slot-acceptance`
- `check-insurance-eligibility.yaml` — replaced by `coverage-preapproval-verification`
- `generate-prior-auth.yaml` — not in workflow
- `generate-referral-letter.yaml` — not in workflow
- `get-clinical-summary.yaml` — not in workflow
- `get-patient-data.yaml` — not in workflow
- `get-specialist-availability.yaml` — replaced by `specialist-routing-availability`
- `get-treatment-guidelines.yaml` — not in workflow
- `notify-patient.yaml` — not in workflow
- `send-secure-message.yaml` — not in workflow
- `update-patient-record.yaml` — not in workflow

### Updated
- `README.md` — rewritten for 12-file set with 5-stage workflow mapping
- `UPLOAD_GUIDE.md` — rewritten with correct file list and tool mapping

---

## How to Verify

```bash
cd backend/openapi-connectors
ls -1 *.yaml | wc -l
# Should show: 12
```

---

## Key Features

- OpenAPI 3.1.0 specification
- Server URL: `https://medicotabs.onrender.com` (origin only, no path prefix)
- Full path in `paths` section
- Unique `operationId` for each operation
- Bearer token authentication
- Complete request/response schemas with `additionalProperties: false`

---

## Next Steps

1. **Upload to YOXA**: Follow `backend/openapi-connectors/UPLOAD_GUIDE.md`
2. **Map tools**: Match each connector to its workflow simulated tool
3. **Configure HITL**: Set up `doctor_completion_signoff_approval` under Release → Integration → Human Approvals
4. **Test connections**: Verify each connector returns 200
5. **Activate**: Enable the workflow in YOXA

---

**Updated**: 2026-08-30
**Version**: 2.0.0
**Status**: Aligned with MedicoTabs Referral Lifecycle workflow ✅
