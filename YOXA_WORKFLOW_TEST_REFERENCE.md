# YOXA Workflow — Test Reference

Companion to `YOXA_WORKFLOW.md` (the spec). This file documents what each
stage must actually *do* in this codebase, the edge-case scenarios that
prove it, and the results of running those scenarios against the local
backend on 2026-09-01. Use it to re-verify the workflow after any change to
`backend/src/routes/yoxa.js`, `hitl.js`, `referrals.js`, or the tracker
utils.

## How to test

Every `/api/yoxa/*` call needs `Authorization: Bearer <YOXA_TOOLS_API_KEY>`
(from `backend/.env`). Drive scenarios with direct `curl`/`fetch` calls
against a locally running backend (`node src/index.js` in `backend/`) —
this exercises the exact same code YOXA calls, without needing a live
YOXA run. For HITL, sign webhook payloads with
`YOXA_HITL_WEBHOOK_SIGNING_SECRET` (see `hmacVerifier.js`); the actual
`respondToApproval` call to YOXA's API cannot be exercised outside a real
workflow run — that leg has to be verified in a real deployment.

---

## Stage 1 — Create and Route the Referral

**Tools:** Unified FHIR Referral Exchange, Specialist Alert, Specialist
Routing and Availability, Coordinator Escalation Alert, Urgency SLA
Calculator.

| Scenario | Expected behavior | Result |
|---|---|---|
| Referral created | `unified-fhir-referral-exchange` routes it, `create_and_route` tracker stage advances | ✅ Pass |
| SLA calculated per urgency | Emergency=30min, Urgent=4h, Routine=24h acknowledgment window | ✅ Pass — verified exact deadlines |
| Specialist alerted | `specialist-alert` notifies the assigned specialist | ✅ Pass (when `specialist_id` is a real user UUID) |
| Specialist unresponsive → re-alert → reroute | `specialist-routing-availability` with `current_specialist_id` set reassigns to next available same-specialty provider, notifies them, updates referral | ✅ Pass — real DB-backed candidate search and reassignment confirmed |
| No alternate specialist exists | `coordinator-escalation-alert` fires | ✅ Pass after fix — see below |
| Urgency changed mid-flight | SLA deadline recalculates, tracker logs the change, assigned specialist is notified of new deadline | 🔧 **Was entirely missing** — fixed: `PUT /api/referrals/:id` now recalculates `acknowledgment_deadline`, logs a `urgency_updated` tracker action, and notifies the specialist if one is assigned. UI control added (urgency dropdown on the Referrals list). |

**🔴 Critical bug found & fixed:** `documentRequestsRouter` was mounted at
the bare `/api` prefix *before* `/api/yoxa`, `/api/hitl`, `/api/trackers`,
etc. Its unscoped `router.use(requireDoctorAuth)` intercepted every request
to those routers first (Express matches by registration order), rejecting
all of them with `401 Unauthorized` — this is exactly what the pasted
production activity log showed (every single connector call failing 401).
Fixed by moving that mount to load last among `/api/*` routers.

**🟡 Gap found & fixed:** Coordinator Escalation Alert always returned a
fake `coordinator-001` id and never resolved a real user — escalations
were invisible to any actual coordinator. Fixed to look up real `role =
'coordinator'` users, notify them in-app, and email them (real SMTP send,
verified).

---

## Stage 2 — Confirm Acceptance and Exchange Documents

**Tools:** Unified FHIR Referral Exchange, Secure Targeted Document
Portal, Document Request Notice, Specialist Alert, Specialist Routing and
Availability, Coordinator Escalation Alert.

| Scenario | Expected behavior | Result |
|---|---|---|
| Specialist requests specific documents | Primary doctor is told exactly what's needed | 🔧 UI already existed (`IncomingReferrals.tsx` → `DocumentRequestModal` → `PatientDetail.tsx` fulfillment) but only created an in-app notification — no actual email despite SMTP being configured. **Fixed**: added `backend/src/utils/mailer.js` (nodemailer + the existing `SMTP_*` env vars, previously installed but never used anywhere in the codebase) and wired it in; verified a real email send and the correct tracker log (`"Emailed to primary doctor"`). |
| Documents shared via secure portal | `secure-targeted-document-portal` records the targeted document list on the referral | ✅ Implemented, not re-tested this session (unchanged, low risk) |
| Acceptance denied / non-responsive | Re-alert → reroute → escalate, same pattern as Stage 1 | Shares the same Specialist Alert / Routing / Escalation tools already verified in Stage 1 |

---

## Stage 3 — Verify Applicable Coverage

**Tools:** Coverage and Pre-approval Verification, Coverage Denial
Notice, Coordinator Escalation Alert.

| Scenario | Expected behavior | Result |
|---|---|---|
| Routine visit | Coverage step skipped entirely | ✅ Pass — the `coverage_verification` tracker stage doesn't exist at all for a General-Checkup referral (correct by design) |
| Advanced treatment, patient has valid insurance | `is_eligible: true`, `coverage_status: verified` persisted on referral, tracker stage completed with copay/pre-approval number | ✅ Pass — persisted `coverage_status` confirmed directly against the DB |
| Advanced treatment, no insurance on file | Denied, referral **must not** proceed to scheduling silently | 🔧 **Was broken**: denial was recorded on the referral, but no doctor/coordinator was ever actually told. **Fixed**: referring doctor is emailed + notified in-app, every coordinator is notified in-app, tracker note records both. Verified end-to-end with a disposable no-insurance test patient (cleaned up afterward). |

---

## Stage 4 — Schedule and Verify Attendance

**Tools:** Appointment Slot and Acceptance, Specialist Attendance Record,
Patient Re-engagement Nudge, Coordinator Escalation Alert.

| Scenario | Expected behavior | Result |
|---|---|---|
| Patient accepts a real offered slot | Referral gets `appointment_details`, `attendance_status: scheduled`, tracker advances | ✅ Pass |
| Patient declines the slot | Tracker marked `requires_attention`, no booking recorded | ✅ Implemented (code-reviewed, matches spec) |
| Attendance confirmed after appointment time | `attendance_status: attended`, referral status → `completed` when consultation is also marked complete | ✅ Pass |
| Missed / unconfirmed attendance → nudge | Nudge fires with urgency-adjusted timing (hours for Urgent/Emergency, 1–2 days Routine) | 🔧 **Was broken two ways**: (1) hardcoded a flat 7-day next-nudge regardless of urgency — spec requires urgency-adjusted timing; (2) tried to notify the patient via the in-app `notifications` table, which is keyed to `users(id)` — patients aren't `users`, so every nudge silently failed to reach anyone (masked by a caught, swallowed FK error). **Fixed**: resolves the real patient through the referral (also fixes agents sending the patient's *name* instead of a UUID — confirmed this literally happens in a live run), computes urgency-based timing (2h Emergency / 6h Urgent / 36h Routine), sends a real email to the patient, and notifies the doctor in-app. Verified end-to-end including recovery from a transient SMTP hiccup. |

---

## Stage 5 — Approve Completion, Archive, and Deliver

**Tools:** Doctor Completion Sign-off Approval (HITL), Doctor Sign-off
Reminder, Consolidated Referral Summary PDF, EHR DocumentReference Save,
Patient Final Summary Email, Coordinator Escalation Alert.

| Scenario | Expected behavior | Result |
|---|---|---|
| PDF summary generated | Real PDF built (pdfkit), uploaded to Supabase storage, indexed in `patient_documents` | ✅ Pass — confirmed the file actually lands in the patient's document list, not just a canned response |
| EHR DocumentReference save | Same real-storage behavior, tracker's **Stage 5** (`completion_and_archive`) reflects it | 🔧 **Bug found & fixed**: this Stage-5-only tool was hardcoded to log onto the Stage-2 (`acceptance_and_records`) tracker stage. Fixed to target `completion_and_archive`. |
| Doctor **approves** completion | Referral closes only once real archive evidence exists, tracker stage completes, `signed_off_by`/`signed_off_at` recorded | ✅ Pass (after fix — see below) |
| Doctor **rejects** completion | Referral **must stay open**, no false "signed off" state, a coordinator is told | 🔴 **Was badly broken**: the HITL respond handler marked the referral `completed` and the tracker "Doctor sign-off received" for **every** response — approve, reject, *or* escalate. A rejected or escalated referral was being silently reported as done. **Fixed**: reads the actual `decision` off the selected option (approved/rejected/escalated), only closes on explicit approval, and notifies coordinators on reject/escalate. Verified all three paths directly (reject → referral stays `accepted`, coordinator notified; approve → referral closes). The real network leg to YOXA's own API (`respondToApproval`) can't be exercised from this sandbox (TLS-blocked, and a fabricated `request_id` isn't recognized by a live YOXA run anyway) — verify that leg in a real deployment. |
| Doctor doesn't respond in time | Doctor Sign-off Reminder fires | Not independently testable — this is a YOXA-native Platform Email tool (see below), not a backend connector |
| **Full sequencing**: sign-off → PDF → EHR save | Stage must NOT read "completed" until real EHR-save evidence exists — approval and PDF generation alone were previously enough to flip it, contradicting "close only when confirmed EHR save evidence... exists" | 🔴 **Bug found & fixed**: sign-off approval and PDF generation both independently set the stage to `completed` immediately. Restructured so approval → `in_progress` ("archiving pending"), PDF generation → still `in_progress`, and EHR save is the only step that marks the stage `completed` (and only then bumps referral status from `completed` → `archived`, and sets the tracker's `completed_at`). Verified the full 3-step sequence end-to-end: `accepted` → `completed` (sign-off) → `archived` (EHR evidence confirmed), with the stage staying `in_progress` through every intermediate step. |

---

## Tools that are *not* backend connectors (by design, not a gap)

`Document Request Notice`, `Coverage Denial Notice`, `Doctor Sign-off
Reminder`, and `Patient Final Summary Email` are declared "Platform Email"
action types in `YOXA_WORKFLOW.md` — they're sent natively by the YOXA
platform itself, not called back into this backend. `UPLOAD_GUIDE.md`
confirms exactly 12 connectors + 1 HITL approval gate are meant to exist.
The three `*.yaml` files for these that were deleted earlier were
apparently a mistaken attempt to make them backend connectors; the current
state (no connector file) is correct.

This app has its own **separate, in-app** document-request feature
(specialist → doctor, independent of YOXA's own agent-driven notice) — see
Stage 2 above.

---

## Gaps fixed in the follow-up pass

All three gaps flagged at the end of the first pass are now fixed and verified:

- **`specialist-alert` silently dropped notifications for an unresolved
  specialist.** Same failure mode as the patient-nudge bug. Fixed: falls
  back to the referral's own `specialist_id`, then to a name-based lookup
  against `users` (role `specialist_doctor`), and now sends a real email
  too. Verified both an unresolvable name (`status: failed_no_specialist`,
  honest about non-delivery) and a resolvable one (`delivered`, real email
  sent) directly against the backend.
- **Urgency-change tracker notes always landed on `create_and_route`**
  regardless of which stage was actually active. Fixed: looks up the
  tracker's stages and targets the first `in_progress` one (falling back
  to the first `pending`, then the first stage) instead of a hardcoded
  key. Verified the note lands on the correct stage.
- **Stage 5 could read "completed" after sign-off approval or PDF
  generation alone**, before any EHR-save evidence existed — contradicting
  "close only when confirmed EHR save evidence... exists." Fixed by
  restructuring the sequence: approval → stage `in_progress` ("archiving
  pending"), PDF generation → still `in_progress`, EHR save → the only
  step that marks the stage `completed`, which now also promotes the
  referral from `completed` (signed off) to `archived` (fully closed with
  evidence) and stamps the tracker's `completed_at`. Verified the full
  3-step sequence end-to-end against a real referral, confirming the
  stage stayed `in_progress` through every intermediate step and only
  flipped at the true closing action.
