// User and Authentication Types
export interface NotificationPreferences {
  emailAlerts: boolean;
  referralUpdates: boolean;
  approvalReminders: boolean;
  weeklyDigest: boolean;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'primary_doctor' | 'specialist_doctor' | 'coordinator';
  organization: string;
  organizationId: string;
  specialization?: string;
  licenseNumber: string;
  phone: string;
  createdAt: string;
  notificationPreferences?: NotificationPreferences;
}

// Patient Types
export interface Patient {
  id: string;
  referralId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  contactNumber: string;
  email: string;
  address: string;
  bloodGroup?: string;
  allergies?: string[];
  insurance: {
    provider: string;
    policyNumber: string;
    memberId: string;
  };
  primaryDoctorId: string;
  createdAt: string;
  updatedAt: string;
}

// Document Types
export interface PatientDocument {
  id: string;
  patientId: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  category: 'lab_result' | 'imaging' | 'prescription' | 'referral' | 'medical_history' | 'other';
  uploadedBy: string;
  uploadedAt: string;
  size: number;
}

// Flight Tracker Types
export type TrackerStage = 
  | 'create_and_route'
  | 'acceptance_and_records'
  | 'coverage_verification'
  | 'scheduling_and_attendance'
  | 'completion_and_archive';

export type TrackerStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'requires_attention';

export type UrgencyLevel = 'Routine' | 'Urgent' | 'Emergency';

export interface FlightTrackerStage {
  stage: TrackerStage;
  status: TrackerStatus;
  startedAt?: string;
  completedAt?: string;
  notes?: string;
  agentActions?: AgentAction[];
  // Coverage Verification specifics — set only when notes === 'Covered'.
  copay?: number;
  preApprovalNumber?: string;
}

export interface AgentAction {
  id: string;
  toolName: string;
  timestamp: string;
  status: 'success' | 'pending' | 'failed';
  description: string;
  result?: string;
}

export interface FlightTracker {
  id: string;
  patientId: string;
  visitReason: string;
  urgency: UrgencyLevel;
  currentStage: TrackerStage;
  stages: FlightTrackerStage[];
  startedAt: string;
  completedAt?: string;
  signedOffBy?: string;
  signedOffAt?: string;
  workflowRunId?: string; // YOXA workflow_run_id
}

// Referral Types
export interface Referral {
  id: string;
  referralNumber: string;
  patientId: string;
  patientName: string;
  primaryDoctorId: string;
  primaryDoctorName: string;
  primaryOrganization: string;
  specialistId?: string;
  specialistName?: string;
  specialistOrganization?: string;
  requestedSpecialty: string;
  specialistPreference?: string;
  referralReason: string;
  serviceType?: string;
  // Determines whether the Coverage Verification stage/agent runs at all —
  // general checkups skip it entirely; only advanced treatments/operations need it.
  visitType?: 'general_checkup' | 'advanced_treatment';
  urgency: UrgencyLevel;
  // Contact & coverage details collected at referral creation
  patientContactNumber?: string;
  patientEmail?: string;
  patientAddress?: string;
  preferredContactMethod?: 'phone' | 'sms' | 'email';
  insuranceProvider?: string;
  insuranceMemberId?: string;
  status: 'pending' | 'routed' | 'accepted' | 'denied' | 'rerouted' | 'completed' | 'archived';
  trackerId?: string;
  targetedDocuments?: string[]; // Document IDs
  coverageStatus?: 'not_applicable' | 'verified' | 'denied' | 'pending';
  appointmentDetails?: {
    date: string;
    time: string;
    location: string;
    bookingId: string;
  };
  attendanceStatus?: 'scheduled' | 'attended' | 'missed' | 'unconfirmed';
  workflowRunId?: string; // YOXA workflow_run_id
  acknowledgmentDeadline?: string;
  createdAt: string;
  updatedAt: string;
}

// Communication Types
export interface Message {
  id: string;
  referralId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  recipientId: string;
  recipientName: string;
  subject: string;
  content: string;
  attachments?: string[];
  isRead: boolean;
  sentAt: string;
  repliedAt?: string;
}

// HITL Approval Types
export interface HITLApprovalRequest {
  id: string;
  eventId: string;
  requestId: string; // Yoxa request_id
  workflowRunId: string; // Yoxa workflow_run_id
  deploymentId: string;
  referralId?: string;
  patientId?: string;
  title: string;
  description: string;
  options: HITLOption[];
  assignedTo?: string;
  status: 'pending' | 'answered' | 'expired';
  selectedOptionId?: string;
  overrideMessage?: string;
  answeredBy?: string;
  answeredAt?: string;
  receivedAt: string;
}

export interface HITLOption {
  optionId: string;
  title: string;
  description?: string;
}

// Coverage Verification Types
export interface CoverageVerification {
  id: string;
  referralId: string;
  patientId: string;
  insuranceProvider: string;
  memberId: string;
  eligibilityStatus: 'active' | 'inactive' | 'pending';
  preApprovalRequired: boolean;
  preApprovalNumber?: string;
  preApprovalStatus?: 'approved' | 'denied' | 'pending';
  expectedCopay?: number;
  coverageNotes?: string;
  verifiedAt?: string;
  verifiedBy?: string;
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  type: 'referral' | 'approval' | 'message' | 'alert' | 'system';
  title: string;
  message: string;
  referralId?: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
}

// Statistics Types
export interface DashboardStats {
  totalPatients: number;
  activeReferrals: number;
  pendingApprovals: number;
  completedToday: number;
  urgentCases: number;
}

// Patient Portal Types — reduced, patient-facing payload shapes
// (no patientId/primaryDoctorId — scoping is implicit to the authenticated patient)
export interface PatientPortalPatient {
  id: string;
  referralId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  contactNumber: string;
  email: string;
  address: string;
  bloodGroup?: string;
  allergies?: string[];
  insurance: {
    provider: string;
    policyNumber: string;
    memberId: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PatientPortalReferral {
  id: string;
  referralNumber: string;
  requestedSpecialty: string;
  specialistName?: string;
  specialistOrganization?: string;
  primaryDoctorName: string;
  primaryOrganization: string;
  referralReason: string;
  urgency: UrgencyLevel;
  status: Referral['status'];
  coverageStatus?: Referral['coverageStatus'];
  attendanceStatus?: Referral['attendanceStatus'];
  appointmentDetails?: Referral['appointmentDetails'];
  trackerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PatientPortalTracker {
  id: string;
  visitReason: string;
  urgency: UrgencyLevel;
  currentStage: TrackerStage;
  stages: FlightTrackerStage[];
  startedAt: string;
  completedAt?: string;
  signedOffAt?: string;
  workflowRunId?: string;
}

export interface PatientPortalDocument {
  id: string;
  fileName: string;
  fileType: string;
  category: PatientDocument['category'];
  uploadedAt: string;
  size: number;
}

export interface PatientPortalSummary {
  patient: PatientPortalPatient;
  referrals: PatientPortalReferral[];
  trackers: PatientPortalTracker[];
  documents: PatientPortalDocument[];
}
