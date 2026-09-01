# Workflow Test Plan

Concrete scenarios to run against the live deployment (app + YOXA) to verify the 5-stage workflow in `YOXA_WORKFLOW.md` behaves as designed. Each scenario lists setup, the trigger/action, and what to check in the app UI, the database, and the YOXA activity log. Record actual results in `WORKFLOW_IMPLEMENTATION_STATUS.md` as scenarios are run.

## 1. Happy path — all 5 stages
- **Setup:** Existing patient with a real email, primary doctor account, a specialist whose `specialization` matches the requested specialty.
- **Action:** Create a referral for that specialty via the app. Approve every HITL request that appears with the "approve/accept" option.
- **Expect:** Referral routes → specialist sees it in Incoming Referrals → accept → (routine) coverage skipped or (advanced treatment) coverage verified → appointment/attendance data appears on the referral → doctor completion sign-off requested → approve → PDF generated → EHR document appears under the real patient's documents → email arrives at the patient's address.

## 2. Specialist non-response → re-alert → reroute → escalate
- **Setup:** Two specialist accounts with the same `specialization`.
- **Action:** Create a referral for that specialty and specifically do **not** accept/decline as the first specialist — let it sit past its acknowledgment deadline.
- **Expect:** A re-alert notification for the same specialist, then a reroute: `referrals.specialist_id` changes to the second specialist and they see it appear in their own Incoming Referrals queue (status `routed`, no manual DB edit needed) — this is the reroute-persistence fix, verify it actually shows up in the UI, not just the YOXA run log. If no second specialist exists in that specialty, expect a `coordinator-escalation-alert` instead.

## 3. Advanced-treatment referral with coverage denied
- **Setup:** Patient with no insurance on file (or an insurance provider/member id that resolves to ineligible).
- **Action:** Create a referral with `visitType: advanced_treatment`.
- **Expect:** `coverage_preapproval-verification` runs (not skipped), `referrals.coverage_status` becomes `denied`, the referral card in `Referrals.tsx`/`IncomingReferrals.tsx` shows the "Cannot Be Claimed" badge, and the primary doctor sees the "Escalate to Coordinator" action and can click it — confirm a notification lands for the primary doctor and any coordinator-role users.

## 4. Routine referral — coverage stage skipped entirely
- **Setup:** Any patient, `visitType: general_checkup`.
- **Action:** Create the referral.
- **Expect:** The Flight Tracker has no `coverage_verification` stage at all (not "skipped," genuinely absent), and `referrals.coverage_status` stays `not_applicable` — no coverage badge should render on the referral card.

## 5. Document request round-trip
- **Setup:** A referral already accepted by a specialist.
- **Action:** As the specialist, click "Request Documents" on the accepted referral, list 2-3 items, submit. As the primary doctor, open the patient's Documents tab.
- **Expect:** The pending request appears under "Requested Documents" with the exact items and requester name. Click "Mark Fulfilled" — the specialist's copy of the referral (re-expand the card) shows the request as `fulfilled`, and both sides received a notification.

## 6. Urgency changed mid-flow
- **Setup:** An open Routine referral.
- **Action:** Update the referral's urgency to Urgent via `PUT /api/referrals/:id` (or however urgency changes are triggered in practice).
- **Expect:** `calculate-urgency-sla` reruns with the new urgency, `acknowledgment_deadline`/SLA window shrink accordingly, and later escalation/nudge timings use the new deadline, not the original one.

## 7. Doctor rejects completion sign-off
- **Setup:** A referral that has reached the "Approve Completion, Archive, and Deliver" stage.
- **Action:** On the HITL approval request, choose "Reject completion" instead of approving.
- **Expect:** No PDF is generated, no EHR document appears, no patient email is sent, and the referral stays open/flagged — confirm none of the Stage 5 side effects fired.

## 8. Missed appointment → re-engagement nudge → escalation
- **Setup:** A referral with a booked appointment slot.
- **Action:** Let the appointment time pass without a specialist attendance record confirming attendance.
- **Expect:** A `patient-reengagement-nudge` notification fires with urgency-adjusted timing (hours for Urgent/Emergency, 1-2 days for Routine). After the configured number of failed attempts, a `coordinator-escalation-alert` fires.

## Notes on running these

- Every scenario should be driven through the real app UI (not direct API calls) wherever a human-facing action exists, and cross-checked against the YOXA run's activity log for the actual tool calls made.
- Use the existing pattern from this session: create the referral, poll `hitl_approval_requests` for a pending request tied to the referral, respond via the Approvals page, then check `patient_documents`/`notifications`/`referrals` directly in Supabase to confirm real persisted state rather than trusting the YOXA run summary alone.
