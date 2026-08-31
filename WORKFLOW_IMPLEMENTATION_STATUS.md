# Workflow Implementation Status

Tracks how much of `YOXA_WORKFLOW.md`'s 5-stage design is actually implemented and visible in the running app, updated as gaps are closed. See `WORKFLOW_TEST_PLAN.md` for the scenarios used to verify this.

| Stage | Backend persists correctly | Frontend shows/acts on it | Status |
|---|---|---|---|
| 1. Create & Route | Routing, alerting, escalation all persist. Reroute-to-alternate-specialist now writes back to `referrals` (`backend/src/routes/yoxa.js` `/specialist-routing-availability`) instead of only suggesting one. | Specialist accept/decline works (`IncomingReferrals.tsx` → `POST /api/referrals/:id/accept\|deny`). A rerouted referral now appears in the newly-assigned specialist's queue via the standard "routed" status + notification. | ✅ Fixed this pass |
| 2. Accept & Exchange Documents | Accept/decline: complete. Document *requests* now persist in a real `document_requests` table (`backend/src/routes/documentRequests.js`), separate from `patient_documents` (uploads) and `referrals.targeted_documents` (what was shared). | Specialist can request named documents (`IncomingReferrals.tsx` → "Request Documents" button → `DocumentRequestModal`). Primary doctor sees pending requests and can mark them fulfilled (`PatientDetail.tsx` Documents tab → "Requested Documents" panel). Both sides get a notification. | ✅ Built this pass |
| 3. Verify Coverage | `coverage_verifications` table + `referrals.coverage_status` were already written correctly. | `GET /api/referrals/:id/coverage` now exists (was previously called by dead frontend code that hit a 404). Coverage status is now shown as a badge on `Referrals.tsx` and `IncomingReferrals.tsx` cards. A denial shows a visible "Escalate to Coordinator" action (`POST /api/referrals/:id/coverage/escalate`) that notifies the primary doctor + any `coordinator`-role users. | ✅ Fixed this pass |
| 4. Schedule & Attendance | Appointment booking/acceptance/attendance persist correctly to `referrals.appointment_details`/`attendance_status`. | Already displayed read-only in `Referrals.tsx` and `PatientPortal.tsx`. Per the workflow doc these are agent-simulated actions (real slot data supplied by the agent, not a human clicking "book"), so no dedicated booking/attendance UI was built — the data model already supports it if that changes. | ✔️ No gap — by design |
| 5. Approve, Archive, Deliver | Doctor sign-off, PDF generation, EHR save, coordinator escalation on failure all persist correctly. Confirmed live: a real PDF was saved under the correct patient's storage folder and a real email was delivered to the patient's address. | Sign-off button exists (`PatientDetail.tsx` Trackers tab). Patient can download the summary PDF from the Patient Portal. | ✔️ No gap |

## Known non-gaps (deliberately not built)

- Stage 4's appointment slot offer/attendance confirmation has no human-clickable UI because the workflow design treats these as agent/YOXA-simulated actions with real data, not steps a human performs in the app.
- The "Platform Email" native tools (Patient Final Summary Email, Document Request Notice, Coverage Denial Notice, Doctor Sign-off Reminder) are YOXA-side, not backend connectors — their delivery is configured in YOXA's own tool settings (fixed-recipient vs. agent-decided), not in this codebase.

## Outstanding follow-ups (not in this pass)

- `document_requests` table needs to be created in Supabase manually (SQL added to `DEPLOYMENT.md`) before this feature works in production.
- The reroute fix persists a new specialist but doesn't yet handle the "no alternatives at all" terminal case beyond what `coordinator-escalation-alert` already does — that path was already correct and untouched.
