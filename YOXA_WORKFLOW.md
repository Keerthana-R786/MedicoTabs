# Yoxa Workflow Documentation

## Overview

The Yoxa workflow automates the end-to-end referral lifecycle — from initial referral intake through scheduling, coverage verification, appointment attendance, and final completion/delivery. It is triggered by a `new_referral_request` event and proceeds through five sequential stages, each owned by a dedicated coordinator agent with its own set of supporting tools/actions.

## Trigger

### `new_referral_request`

Initiates the workflow when a new patient referral is created.

- **Input Mode:** Text input or File input
- **Trigger Name:** `new_referral_request`
- **Description:** A primary care doctor supplies the patient file context, requested specialty, specialist preference or destination, referral reason, service type (if known), and urgency of the referral.

## Workflow Stages

### 1. Create and Route the Referral
**Coordinator Agent:** Referral Intake and Routing Agent

**Description:** Create the referral in the patient's file, persist the selected urgency, route it through the unified FHIR process to the required in-network or external specialist... *(description continues, truncated in source)*

> Agents assigned to this step execute in parallel and can communicate internally to collaborate.

**Tools/Actions:**
- Unified FHIR Referral Exchange
- Specialist Alert
- Specialist Routing and Availability
- Coordinator Escalation Alert
- Urgency SLA Calculator

#### Agent Detail: Referral Intake and Routing Agent

**Step Instructions:**

> Produce one deliverable: a confirmed referral routing record and current Flight Tracker state. Use the Unified FHIR Referral Exchange tool to create and route the referral; use the Specialist Alert tool as the distinct outbound alert for Urgent and Emergency cases and for exactly one SLA re-alert; use the Specialist Routing and Availability tool only after the re-alert fails to find an alternate same-specialty provider; and use the Coordinator Escalation Alert tool to notify a human when no alternate exists or evidence is denied, delayed, or unresolved. Re-read urgency at each action, preserve it in the tracker, and never infer acknowledgment from transmission. Return structured fields for referral identifier, urgency, specialty, destination, acknowledgment deadline, confirmed evidence, current phase, financial status if already supplied, exception state, next action, and communication delivery results. Do not invent SLA durations, provider availability, or clinical facts.

**Tool Definitions (Stage 1):**

| Tool Name | Description |
|---|---|
| Unified FHIR Referral Exchange | Creates, routes, and retrieves confirmed referral and acknowledgment data for in-network and external specialist pathways through one FHIR-based process. |
| Specialist Alert | Sends the distinct specialist intake alert or one permitted automatic re-alert with the referral urgency and acknowledgment deadline. |
| Specialist Routing and Availability | Checks the same-specialty routing options and reroutes an unacknowledged referral to the next available specialist or on-call provider. |
| Coordinator Escalation Alert | Sends a distinct actionable notification to a human care coordinator when a referral is denied, unresolved, unacknowledged after the permitted re-alert, or has no alternate provider. |
| Urgency SLA Calculator | Determines the required response window based on the referral's urgency level and writes it into the Flight Tracker as a persistent SLA deadline for downstream steps to reference. **Emergency:** 30-minute window. **Urgent:** 4-hour window. **Routine:** 24-hour window. This calculated deadline is the single source of truth for all later alert, escalation, and nudge timing in the referral's lifecycle — later steps must read this value rather than recalculating their own window. |

---

### 2. Confirm Acceptance and Exchange Documents
**Coordinator Agent:** Acceptance and Records Exchange Agent

**Description:** Confirm explicit specialist acceptance and exchange only the records specifically needed for the consultation through a secure document portal.

> Agents assigned to this step execute in parallel and can communicate internally to collaborate.

#### Agent Detail: Acceptance and Records Exchange Agent

**Step Instructions:**

> Produce one deliverable: an acceptance and targeted-records exchange state. Use the Unified FHIR Referral Exchange tool to retrieve or confirm explicit specialist acceptance. If acceptance is denied or absent after the configured SLA, use the Specialist Alert tool once for the re-alert, the Specialist Routing and Availability tool for same-specialty rerouting after non-response, and the Coordinator Escalation Alert tool when no alternate or unresolved work remains. After confirmed acceptance, use the Secure Targeted Document Portal tool to manage only consultation-specific record requests, selections, uploads, and confirmations. Use the Document Request Notice tool every time the specialist requests records, stating the exact requested items to the primary doctor's side. Re-read and display urgency and use it to prioritize turnaround, but do not create unsupported deadlines. Return structured fields for acceptance evidence, urgency, requested records, uploaded records, confirmed records, pending items, denial or non-response status, communication results, current phase, and next action. Never treat an assumed, partial, or silent exchange as complete.

**Tools/Actions:**
- Unified FHIR Referral Exchange
- Secure Targeted Document Portal
- Document Request Notice
- Specialist Alert
- Specialist Routing and Availability
- Coordinator Escalation Alert

**Tool Definitions (Stage 2):**

| Tool Name | Action Type | Description |
|---|---|---|
| Unified FHIR Referral Exchange | Simulated Output | Confirms explicit specialist acceptance and exchanges referral status through the unified FHIR process. |
| Secure Targeted Document Portal | Simulated Output | Opens a secure consultation-specific portal for requesting, selecting, uploading, and confirming only the records needed for the referral. |
| Document Request Notice | Platform Email | Sends the primary doctor's side a distinct notice listing exactly which records the specialist requested. |
| Specialist Alert | Simulated Output | Sends the permitted specialist intake re-alert when explicit acceptance is not received within the configured SLA. The re-alert fires if the specialist hasn't acknowledged... *(truncated in source)* |
| Specialist Routing and Availability | Simulated Output | Checks and performs same-specialty rerouting after the permitted acceptance re-alert fails. |
| Coordinator Escalation Alert | Simulated Output | Notifies a human care coordinator of denied acceptance, unavailable alternatives, or unresolved acceptance and document-exchange issues. |

---

### 3. Verify Applicable Coverage
**Coordinator Agent:** Coverage Verification Agent

**Description:** Apply the routine-visit exemption or verify eligibility and pre-approval requirements for surgeries, scans, and advanced treatments.

> Agents assigned to this step execute in parallel and can communicate internally to collaborate.

#### Agent Detail: Coverage Verification Agent

**Step Instructions:**

> Produce one deliverable: the current confirmed coverage and financial tracker state. Re-read and display urgency before and after the verification action. Use the Coverage and Pre-approval Verification tool only for surgeries, scans, or advanced treatments, and record confirmed eligibility, claimability, pre-approval requirement, and expected co-pay. For a confirmed routine visit, skip that tool and set financial/co-pay to exactly Not Applicable. Use the Coverage Denial Notice tool for every explicit coverage or pre-approval denial, addressing the referring doctor's side with the confirmed denial details, and use the Coordinator Escalation Alert tool to notify a human care coordinator for review. For delayed, missing, or non-responsive payer evidence, preserve the last confirmed state, mark the issue unresolved, and escalate rather than inferring a result. Return referral identifier, urgency, service applicability, financial/co-pay status, evidence source and timestamp if available, denial or pending state, outbound communication results, coordinator-review state, current phase, and next action. Do not silently release a denied or unresolved referral to scheduling.

**Tools/Actions:**
- Coverage and Pre-approval Verification
- Coverage Denial Notice
- Coordinator Escalation Alert

**Tool Definitions (Stage 3):**

| Tool Name | Action Type | Description |
|---|---|---|
| Coverage and Pre-approval Verification | Simulated Output | Checks eligibility and applicable claimability, pre-approval requirements, and expected co-pay for services that require coverage verification. |
| Coverage Denial Notice | Platform Email | Sends the referring doctor's side a distinct notice when coverage or pre-approval is explicitly denied. |
| Coordinator Escalation Alert | Simulated Output | Notifies a human care coordinator when coverage is denied or payer evidence is missing, delayed, or unresolved. |

---

### 4. Schedule and Verify Attendance
**Coordinator Agent:** Scheduling and Attendance Agent

**Description:** Secure a real appointment accepted by the patient and verify attendance from the specialist's own record after the appointment time.

> Agents assigned to this step execute in parallel and can communicate internally to collaborate.

#### Agent Detail: Scheduling and Attendance Agent

**Step Instructions:**

> Produce one deliverable: the confirmed appointment and attendance state. Re-read and display urgency and carry forward the last confirmed financial/co-pay value unchanged. Use the Appointment Slot and Acceptance tool to record only a real existing slot that the patient accepted; do not call a tentative slot booked. After the appointment time, use the Specialist Attendance Record tool to retrieve attendance from the specialist's own record. If attendance is missed or unconfirmed, use the Patient Re-engagement Nudge tool for the configured SMS, email, or call-prompt channel with urgency-adjusted timing: hours for Urgent/Emergency and one to two days for Routine. After the configured number of failed attempts, reuse the Coordinator Escalation Alert tool for the human care coordinator. For denial, delay, unavailable slots, patient non-response, or missing attendance evidence, retain the confirmed state, record the exception, and escalate when the configured threshold is reached; never infer completion. Return referral identifier, urgency, appointment evidence, patient acceptance evidence, attendance evidence, unchanged financial status, nudge attempts and delivery results, escalation status, current phase, and next action.

**Tools/Actions:**
- Appointment Slot and Acceptance
- Specialist Attendance Record
- Patient Re-engagement Nudge
- Coordinator Escalation Alert

**Tool Definitions (Stage 4):**

| Tool Name | Action Type | Description |
|---|---|---|
| Appointment Slot and Acceptance | Simulated Output | Checks real appointment availability and records the patient's acceptance of a specific slot without converting tentative availability into a booking. |
| Specialist Attendance Record | Simulated Output | Retrieves the specialist's own attendance record after the appointment time to confirm attended, missed, or unavailable evidence. |
| Patient Re-engagement Nudge | Simulated Output | Sends a distinct urgency-adjusted SMS, email, or call prompt to help a patient re-engage or reschedule after a missed or unconfirmed visit. Nudge fires if attendance... *(truncated in source)* |
| Coordinator Escalation Alert | Simulated Output | Notifies a human care coordinator after the configured patient-nudge attempts fail or another attendance issue remains unresolved. |

---

### 5. Approve Completion, Archive, and Deliver
**Coordinator Agent:** Completion, Archive, and Delivery Agent

**Description:** Obtain explicit doctor sign-off, compile the complete referral journey into a standardized PDF, save it to the patient's EHR folder, send it to the patient, and close... *(truncated in source)*

> Agents assigned to this step execute in parallel and can communicate internally to collaborate.

#### Agent Detail: Completion, Archive, and Delivery Agent

**Step Instructions:**

> Produce one deliverable: a closure evidence package or an explicitly open exception package. Re-read and display urgency and preserve the final confirmed financial/co-pay status. Use the Doctor Completion Sign-off Approval tool as a blocking approval request; accept completion only when a doctor explicitly signs off and declares recovery or treatment complete. If pending beyond the configured reasonable window, use the Doctor Sign-off Reminder tool to send a distinct reminder to the doctor. After approval, use the Consolidated Referral Summary PDF tool to generate the complete standardized PDF, then use the EHR DocumentReference Save tool to save it into the patient's existing EHR record folder, and separately use the Patient Final Summary Email tool to send the patient the PDF and final financial/co-pay status. Use the Coordinator Escalation Alert tool if sign-off, EHR save, or patient delivery is denied, delayed, non-responsive, or otherwise unresolved. Close and archive only when confirmed EHR save evidence and confirmed email-delivery evidence both exist; otherwise keep the referral open and flagged. Return referral identifier, final urgency, final financial status, approval evidence, PDF artifact reference, EHR save confirmation, patient email delivery confirmation, closure status, exception details, coordinator escalation result, and audit-trail reference. Never infer sign-off, recovery, EHR persistence, email delivery, or closure.

**Tools/Actions:**
- Doctor Completion Sign-off Approval
- Doctor Sign-off Reminder
- Consolidated Referral Summary PDF
- EHR DocumentReference Save
- Patient Final Summary Email
- Coordinator Escalation Alert

**Tool Definitions (Stage 5):**

| Tool Name | Action Type | Description |
|---|---|---|
| Doctor Completion Sign-off Approval | Ask Human for Approval | Requests blocking human approval from a doctor who must explicitly sign off and declare the patient recovered or treatment complete. |
| Doctor Sign-off Reminder | Platform Email | Sends a distinct reminder to the responsible doctor when required completion sign-off remains pending beyond the configured window. |
| Consolidated Referral Summary PDF | Output Tool (PDF .pdf) | Generates the standardized medical history PDF containing the complete confirmed referral journey, tracker audit trail, final urgency, and financial status. |
| EHR DocumentReference Save | Simulated Output | Saves the generated PDF as a FHIR DocumentReference attachment in the patient's existing EHR record folder and returns persistence evidence. |
| Patient Final Summary Email | Platform Email | Sends the patient a distinct email containing the final referral summary file and confirmed final financial/co-pay status, then returns delivery evidence. |
| Coordinator Escalation Alert | Simulated Output | Notifies a human care coordinator when approval, archival, or patient delivery is denied, delayed, non-responsive, or unresolved. |

---

## Notes
- Each stage escalates to a coordinator via a **Coordinator Escalation Alert** if issues arise, ensuring human oversight at every step.
- The workflow integrates with FHIR-based systems for referral exchange and EHR document storage.
