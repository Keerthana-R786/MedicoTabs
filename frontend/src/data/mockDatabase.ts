import { User, Patient, PatientDocument, FlightTracker, Referral, Message, HITLApprovalRequest, CoverageVerification, Notification } from '@/types';

// Mock Users Database
export const mockUsers: User[] = [
  {
    id: 'user-001',
    email: 'dr.smith@northharbor.com',
    firstName: 'John',
    lastName: 'Smith',
    role: 'primary_doctor',
    organization: 'North Harbor Family Medicine',
    organizationId: 'org-001',
    specialization: 'Family Medicine',
    licenseNumber: 'MD-12345',
    phone: '+1-555-0101',
    createdAt: '2024-01-15T08:00:00Z',
  },
  {
    id: 'user-002',
    email: 'dr.shah@lakeside.com',
    firstName: 'Priya',
    lastName: 'Shah',
    role: 'specialist_doctor',
    organization: 'Lakeside Gastroenterology',
    organizationId: 'org-002',
    specialization: 'Gastroenterology',
    licenseNumber: 'MD-67890',
    phone: '+1-555-0202',
    createdAt: '2024-01-10T08:00:00Z',
  },
  {
    id: 'user-003',
    email: 'coordinator@harborcare.com',
    firstName: 'Sarah',
    lastName: 'Johnson',
    role: 'coordinator',
    organization: 'HarborCare Network',
    organizationId: 'org-003',
    licenseNumber: 'CC-11111',
    phone: '+1-555-0303',
    createdAt: '2024-01-05T08:00:00Z',
  },
];

// Mock Patients Database
export const mockPatients: Patient[] = [
  {
    id: 'patient-001',
    referralId: 'RFL-2025-00418',
    firstName: 'Elena',
    lastName: 'Marquez',
    dateOfBirth: '1981-06-14',
    gender: 'female',
    contactNumber: '+1-555-1234',
    email: 'elena.marquez@email.com',
    address: '123 Harbor Street, Coastal City, CC 12345',
    bloodGroup: 'O+',
    allergies: ['Penicillin'],
    insurance: {
      provider: 'HarborCare PPO',
      policyNumber: 'HC-8842107',
      memberId: 'HC8842107',
    },
    primaryDoctorId: 'user-001',
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2025-07-15T14:30:00Z',
  },
  {
    id: 'patient-002',
    referralId: 'RFL-2025-00419',
    firstName: 'Michael',
    lastName: 'Chen',
    dateOfBirth: '1975-03-22',
    gender: 'male',
    contactNumber: '+1-555-5678',
    email: 'michael.chen@email.com',
    address: '456 Ocean Avenue, Coastal City, CC 12346',
    bloodGroup: 'A+',
    allergies: [],
    insurance: {
      provider: 'BlueCross Shield',
      policyNumber: 'BC-9951234',
      memberId: 'BC9951234',
    },
    primaryDoctorId: 'user-001',
    createdAt: '2024-03-15T09:00:00Z',
    updatedAt: '2025-07-10T11:00:00Z',
  },
  {
    id: 'patient-003',
    referralId: 'RFL-2025-00420',
    firstName: 'Sarah',
    lastName: 'Williams',
    dateOfBirth: '1990-11-08',
    gender: 'female',
    contactNumber: '+1-555-9012',
    email: 'sarah.williams@email.com',
    address: '789 Bay Road, Coastal City, CC 12347',
    bloodGroup: 'B+',
    allergies: ['Sulfa drugs', 'Latex'],
    insurance: {
      provider: 'HarborCare PPO',
      policyNumber: 'HC-8843201',
      memberId: 'HC8843201',
    },
    primaryDoctorId: 'user-001',
    createdAt: '2024-11-20T13:00:00Z',
    updatedAt: '2025-07-12T16:00:00Z',
  },
];

// Mock Patient Documents Database
export const mockPatientDocuments: PatientDocument[] = [
  {
    id: 'doc-001',
    patientId: 'patient-001',
    fileName: 'Referral_Order_Elena_Marquez.pdf',
    fileType: 'application/pdf',
    fileUrl: '/mock-documents/referral-001.pdf',
    category: 'referral',
    uploadedBy: 'user-001',
    uploadedAt: '2025-07-10T09:00:00Z',
    size: 245678,
  },
  {
    id: 'doc-002',
    patientId: 'patient-001',
    fileName: 'Dysphagia_History_Examination.pdf',
    fileType: 'application/pdf',
    fileUrl: '/mock-documents/history-001.pdf',
    category: 'medical_history',
    uploadedBy: 'user-001',
    uploadedAt: '2025-07-10T09:15:00Z',
    size: 189234,
  },
  {
    id: 'doc-003',
    patientId: 'patient-001',
    fileName: 'Swallow_Study_Results_2025.pdf',
    fileType: 'application/pdf',
    fileUrl: '/mock-documents/lab-001.pdf',
    category: 'lab_result',
    uploadedBy: 'user-001',
    uploadedAt: '2025-07-10T09:20:00Z',
    size: 567890,
  },
  {
    id: 'doc-004',
    patientId: 'patient-001',
    fileName: 'Current_Medications_List.pdf',
    fileType: 'application/pdf',
    fileUrl: '/mock-documents/prescription-001.pdf',
    category: 'prescription',
    uploadedBy: 'user-001',
    uploadedAt: '2025-07-10T09:25:00Z',
    size: 123456,
  },
  {
    id: 'doc-005',
    patientId: 'patient-001',
    fileName: 'Insurance_Coverage_Details.pdf',
    fileType: 'application/pdf',
    fileUrl: '/mock-documents/insurance-001.pdf',
    category: 'other',
    uploadedBy: 'user-001',
    uploadedAt: '2025-07-10T09:30:00Z',
    size: 98765,
  },
];

// Mock Flight Trackers Database
export const mockFlightTrackers: FlightTracker[] = [
  {
    id: 'tracker-001',
    patientId: 'patient-001',
    visitReason: 'Gastroenterology Consultation - Progressive Dysphagia',
    urgency: 'Urgent',
    currentStage: 'completion_and_archive',
    stages: [
      {
        stage: 'create_and_route',
        status: 'completed',
        startedAt: '2025-07-10T09:00:00Z',
        completedAt: '2025-07-10T10:30:00Z',
        notes: 'Referral created and routed to Lakeside Gastroenterology',
        agentActions: [
          {
            id: 'action-001',
            toolName: 'unified_fhir_referral_exchange',
            timestamp: '2025-07-10T09:15:00Z',
            status: 'success',
            description: 'Created FHIR referral transaction for RFL-2025-00418',
            result: 'Referral status: active, Priority: Urgent',
          },
          {
            id: 'action-002',
            toolName: 'specialist_alert',
            timestamp: '2025-07-10T09:30:00Z',
            status: 'success',
            description: 'Sent specialist intake alert to Lakeside Gastroenterology',
            result: 'Delivery receipt: SA-2025-00418-01',
          },
        ],
      },
      {
        stage: 'acceptance_and_records',
        status: 'completed',
        startedAt: '2025-07-11T08:00:00Z',
        completedAt: '2025-07-11T11:00:00Z',
        notes: 'Specialist accepted referral and requested targeted documents',
        agentActions: [
          {
            id: 'action-003',
            toolName: 'unified_fhir_referral_exchange',
            timestamp: '2025-07-11T08:30:00Z',
            status: 'success',
            description: 'Recorded explicit specialist acceptance',
            result: 'Accepted by Dr. Priya Shah, Lakeside Gastroenterology',
          },
          {
            id: 'action-004',
            toolName: 'secure_targeted_document_portal',
            timestamp: '2025-07-11T09:00:00Z',
            status: 'success',
            description: 'Opened secure document portal for targeted records exchange',
            result: '5 documents uploaded and verified',
          },
        ],
      },
      {
        stage: 'coverage_verification',
        status: 'completed',
        startedAt: '2025-07-11T14:00:00Z',
        completedAt: '2025-07-11T15:30:00Z',
        notes: 'Coverage verified with HarborCare PPO',
        agentActions: [
          {
            id: 'action-005',
            toolName: 'coverage_preapproval_verification',
            timestamp: '2025-07-11T14:30:00Z',
            status: 'success',
            description: 'Verified eligibility and pre-approval',
            result: 'Coverage active, Pre-approval: HC-PA-8842107-0418, Copay: $75',
          },
        ],
      },
      {
        stage: 'scheduling_and_attendance',
        status: 'completed',
        startedAt: '2025-07-12T09:00:00Z',
        completedAt: '2025-07-15T14:00:00Z',
        notes: 'Appointment scheduled and attendance confirmed',
        agentActions: [
          {
            id: 'action-006',
            toolName: 'appointment_slot_acceptance',
            timestamp: '2025-07-12T10:00:00Z',
            status: 'success',
            description: 'Secured appointment slot',
            result: 'Appointment: 2025-07-15 09:30 EST, Booking: LAK-APT-74182',
          },
          {
            id: 'action-007',
            toolName: 'specialist_attendance_record',
            timestamp: '2025-07-15T11:00:00Z',
            status: 'success',
            description: 'Confirmed patient attendance',
            result: 'Patient attended, Visit completed',
          },
        ],
      },
      {
        stage: 'completion_and_archive',
        status: 'in_progress',
        startedAt: '2025-07-15T14:00:00Z',
        notes: 'Awaiting doctor sign-off',
        agentActions: [],
      },
    ],
    startedAt: '2025-07-10T09:00:00Z',
    workflowRunId: 'yoxa-run-418-001',
  },
];

// Mock Referrals Database
export const mockReferrals: Referral[] = [
  {
    id: 'referral-001',
    referralNumber: 'RFL-2025-00418',
    patientId: 'patient-001',
    patientName: 'Elena Marquez',
    primaryDoctorId: 'user-001',
    primaryDoctorName: 'Dr. John Smith',
    primaryOrganization: 'North Harbor Family Medicine',
    specialistId: 'user-002',
    specialistName: 'Dr. Priya Shah',
    specialistOrganization: 'Lakeside Gastroenterology',
    requestedSpecialty: 'Gastroenterology',
    specialistPreference: 'Dr. Priya Shah',
    referralReason: 'Progressive dysphagia with difficulty swallowing solid foods',
    serviceType: 'Endoscopic evaluation with possible dilation',
    urgency: 'Urgent',
    status: 'accepted',
    trackerId: 'tracker-001',
    targetedDocuments: ['doc-001', 'doc-002', 'doc-003', 'doc-004', 'doc-005'],
    coverageStatus: 'verified',
    appointmentDetails: {
      date: '2025-07-15',
      time: '09:30',
      location: 'Lakeside Gastroenterology, Suite 200',
      bookingId: 'LAK-APT-74182',
    },
    attendanceStatus: 'attended',
    workflowRunId: 'yoxa-run-418-001',
    acknowledgmentDeadline: '2025-07-10T13:00:00Z',
    createdAt: '2025-07-10T09:00:00Z',
    updatedAt: '2025-07-15T14:00:00Z',
  },
  {
    id: 'referral-002',
    referralNumber: 'RFL-2025-00419',
    patientId: 'patient-002',
    patientName: 'Michael Chen',
    primaryDoctorId: 'user-001',
    primaryDoctorName: 'Dr. John Smith',
    primaryOrganization: 'North Harbor Family Medicine',
    requestedSpecialty: 'Cardiology',
    referralReason: 'Chest pain and irregular heartbeat',
    urgency: 'Urgent',
    status: 'routed',
    workflowRunId: 'yoxa-run-419-001',
    acknowledgmentDeadline: '2025-07-16T14:00:00Z',
    createdAt: '2025-07-16T10:00:00Z',
    updatedAt: '2025-07-16T10:00:00Z',
  },
];

// Mock Messages Database
export const mockMessages: Message[] = [
  {
    id: 'msg-001',
    referralId: 'referral-001',
    senderId: 'user-002',
    senderName: 'Dr. Priya Shah',
    senderRole: 'Specialist',
    recipientId: 'user-001',
    recipientName: 'Dr. John Smith',
    subject: 'Referral Acceptance - Elena Marquez',
    content: 'I have accepted the referral for Elena Marquez. I have reviewed the submitted documents and would like to request a more recent swallow study if available. The appointment is scheduled for July 15th at 9:30 AM.',
    attachments: [],
    isRead: true,
    sentAt: '2025-07-11T08:45:00Z',
    repliedAt: '2025-07-11T10:00:00Z',
  },
];

// Mock HITL Approval Requests Database
export const mockHITLApprovals: HITLApprovalRequest[] = [
  {
    id: 'hitl-001',
    eventId: 'evt-yoxa-001',
    requestId: 'req-yoxa-001',
    workflowRunId: 'yoxa-run-418-001',
    deploymentId: 'deploy-medicotabs-001',
    referralId: 'referral-001',
    patientId: 'patient-001',
    title: 'Doctor Completion Sign-off Required',
    description: 'Please review the completed referral for Elena Marquez and confirm treatment completion or recovery status.',
    options: [
      {
        optionId: 'opt-001',
        title: 'Patient Recovered - Sign Off',
        description: 'Confirm patient has recovered and treatment is complete',
      },
      {
        optionId: 'opt-002',
        title: 'Treatment Complete - Ongoing Care',
        description: 'Treatment complete but patient requires ongoing monitoring',
      },
      {
        optionId: 'opt-003',
        title: 'Requires Follow-up',
        description: 'Additional follow-up appointments needed',
      },
    ],
    assignedTo: 'user-001',
    status: 'pending',
    receivedAt: '2025-07-15T14:00:00Z',
  },
];

// Mock Coverage Verifications Database
export const mockCoverageVerifications: CoverageVerification[] = [
  {
    id: 'cov-001',
    referralId: 'referral-001',
    patientId: 'patient-001',
    insuranceProvider: 'HarborCare PPO',
    memberId: 'HC8842107',
    eligibilityStatus: 'active',
    preApprovalRequired: true,
    preApprovalNumber: 'HC-PA-8842107-0418',
    preApprovalStatus: 'approved',
    expectedCopay: 75,
    coverageNotes: 'Coverage active for gastroenterology consultation and endoscopic evaluation. Pre-approval granted for possible dilation.',
    verifiedAt: '2025-07-11T15:00:00Z',
    verifiedBy: 'Coverage Verification Agent',
  },
];

// Mock Notifications Database
export const mockNotifications: Notification[] = [
  {
    id: 'notif-001',
    userId: 'user-001',
    type: 'approval',
    title: 'Approval Required',
    message: 'Doctor sign-off required for Elena Marquez referral completion',
    referralId: 'referral-001',
    isRead: false,
    createdAt: '2025-07-15T14:00:00Z',
    actionUrl: '/approvals/hitl-001',
  },
  {
    id: 'notif-002',
    userId: 'user-001',
    type: 'referral',
    title: 'Referral Accepted',
    message: 'Dr. Priya Shah accepted the referral for Elena Marquez',
    referralId: 'referral-001',
    isRead: true,
    createdAt: '2025-07-11T08:45:00Z',
  },
];

// Helper functions for mock database operations
export const getMockData = () => ({
  users: [...mockUsers],
  patients: [...mockPatients],
  documents: [...mockPatientDocuments],
  trackers: [...mockFlightTrackers],
  referrals: [...mockReferrals],
  messages: [...mockMessages],
  hitlApprovals: [...mockHITLApprovals],
  coverageVerifications: [...mockCoverageVerifications],
  notifications: [...mockNotifications],
});

let mockDataStore = getMockData();

export const resetMockDatabase = () => {
  mockDataStore = getMockData();
};

export const getMockDatabase = () => mockDataStore;

export default mockDataStore;
