import { getMockDatabase } from '@/data/mockDatabase';
import { Patient, Referral, FlightTracker, PatientDocument, HITLApprovalRequest, Message, Notification, User } from '@/types';

// Mock API service using local data
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const mockAuthAPI = {
  login: async (email: string, _password: string) => {
    await delay(500);
    const db = getMockDatabase();
    const user = db.users.find(u => u.email === email);
    if (user) {
      const token = `mock-token-${user.id}`;
      localStorage.setItem('auth_token', token);
      localStorage.setItem('current_user', JSON.stringify(user));
      return { user, token };
    }
    throw new Error('Invalid credentials');
  },
  logout: async () => {
    await delay(300);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');
  },
  getCurrentUser: async (): Promise<User> => {
    await delay(200);
    const userStr = localStorage.getItem('current_user');
    if (userStr) return JSON.parse(userStr);
    throw new Error('Not authenticated');
  },
};

export const mockPatientsAPI = {
  getAll: async (): Promise<Patient[]> => {
    await delay(300);
    return getMockDatabase().patients;
  },
  getById: async (id: string): Promise<Patient> => {
    await delay(200);
    const patient = getMockDatabase().patients.find(p => p.id === id);
    if (!patient) throw new Error('Patient not found');
    return patient;
  },
  create: async (patientData: Partial<Patient>): Promise<Patient> => {
    await delay(500);
    const db = getMockDatabase();
    const newPatient: Patient = {
      id: `patient-${Date.now()}`,
      referralId: `RFL-2025-${String(Math.floor(Math.random() * 10000)).padStart(5, '0')}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...patientData,
    } as Patient;
    db.patients.push(newPatient);
    return newPatient;
  },
  update: async (id: string, patientData: Partial<Patient>): Promise<Patient> => {
    await delay(400);
    const db = getMockDatabase();
    const index = db.patients.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Patient not found');
    db.patients[index] = { ...db.patients[index], ...patientData, updatedAt: new Date().toISOString() };
    return db.patients[index];
  },
  search: async (query: string): Promise<Patient[]> => {
    await delay(300);
    const db = getMockDatabase();
    const q = query.toLowerCase();
    return db.patients.filter(p => 
      p.firstName.toLowerCase().includes(q) ||
      p.lastName.toLowerCase().includes(q) ||
      p.referralId.toLowerCase().includes(q) ||
      p.contactNumber.includes(q)
    );
  },
};

export const mockDocumentsAPI = {
  getByPatientId: async (patientId: string): Promise<PatientDocument[]> => {
    await delay(300);
    return getMockDatabase().documents.filter(d => d.patientId === patientId);
  },
  upload: async (patientId: string, file: File, category: string): Promise<PatientDocument> => {
    await delay(800);
    const db = getMockDatabase();
    const newDoc: PatientDocument = {
      id: `doc-${Date.now()}`,
      patientId,
      fileName: file.name,
      fileType: file.type,
      fileUrl: `/mock-documents/${file.name}`,
      category: category as any,
      uploadedBy: 'user-001',
      uploadedAt: new Date().toISOString(),
      size: file.size,
    };
    db.documents.push(newDoc);
    return newDoc;
  },
  download: async (documentId: string): Promise<Blob> => {
    await delay(500);
    return new Blob(['Mock document content'], { type: 'application/pdf' });
  },
  delete: async (documentId: string): Promise<void> => {
    await delay(400);
    const db = getMockDatabase();
    const index = db.documents.findIndex(d => d.id === documentId);
    if (index !== -1) db.documents.splice(index, 1);
  },
};

export const mockFlightTrackerAPI = {
  getByPatientId: async (patientId: string): Promise<FlightTracker[]> => {
    await delay(300);
    return getMockDatabase().trackers.filter(t => t.patientId === patientId);
  },
  getById: async (trackerId: string): Promise<FlightTracker> => {
    await delay(200);
    const tracker = getMockDatabase().trackers.find(t => t.id === trackerId);
    if (!tracker) throw new Error('Tracker not found');
    return tracker;
  },
  create: async (trackerData: Partial<FlightTracker>): Promise<FlightTracker> => {
    await delay(500);
    const db = getMockDatabase();
    const newTracker: FlightTracker = {
      id: `tracker-${Date.now()}`,
      currentStage: 'create_and_route',
      stages: [
        { stage: 'create_and_route', status: 'in_progress', startedAt: new Date().toISOString(), agentActions: [] },
        { stage: 'acceptance_and_records', status: 'pending', agentActions: [] },
        { stage: 'coverage_verification', status: 'pending', agentActions: [] },
        { stage: 'scheduling_and_attendance', status: 'pending', agentActions: [] },
        { stage: 'completion_and_archive', status: 'pending', agentActions: [] },
      ],
      startedAt: new Date().toISOString(),
      workflowRunId: `yoxa-run-${Date.now()}`,
      ...trackerData,
    } as FlightTracker;
    db.trackers.push(newTracker);
    return newTracker;
  },
  signOff: async (trackerId: string, notes?: string): Promise<FlightTracker> => {
    await delay(600);
    const db = getMockDatabase();
    const tracker = db.trackers.find(t => t.id === trackerId);
    if (!tracker) throw new Error('Tracker not found');
    tracker.signedOffBy = 'user-001';
    tracker.signedOffAt = new Date().toISOString();
    tracker.completedAt = new Date().toISOString();
    const currentUser = JSON.parse(localStorage.getItem('current_user') || '{}');
    tracker.signedOffBy = currentUser.id;
    return tracker;
  },
};

export const mockReferralsAPI = {
  getAll: async (): Promise<Referral[]> => {
    await delay(300);
    return getMockDatabase().referrals;
  },
  getById: async (id: string): Promise<Referral> => {
    await delay(200);
    const referral = getMockDatabase().referrals.find(r => r.id === id);
    if (!referral) throw new Error('Referral not found');
    return referral;
  },
  getByPatientId: async (patientId: string): Promise<Referral[]> => {
    await delay(300);
    return getMockDatabase().referrals.filter(r => r.patientId === patientId);
  },
  create: async (referralData: Partial<Referral>): Promise<{ referral: Referral; workflowRunId: string }> => {
    await delay(1000);
    const db = getMockDatabase();
    const workflowRunId = `yoxa-run-${Date.now()}`;
    const newReferral: Referral = {
      id: `referral-${Date.now()}`,
      referralNumber: `RFL-2025-${String(Math.floor(Math.random() * 10000)).padStart(5, '0')}`,
      status: 'routed',
      workflowRunId,
      acknowledgmentDeadline: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...referralData,
    } as Referral;
    db.referrals.push(newReferral);
    return { referral: newReferral, workflowRunId };
  },
  update: async (id: string, referralData: Partial<Referral>): Promise<Referral> => {
    await delay(400);
    const db = getMockDatabase();
    const index = db.referrals.findIndex(r => r.id === id);
    if (index === -1) throw new Error('Referral not found');
    db.referrals[index] = { ...db.referrals[index], ...referralData, updatedAt: new Date().toISOString() };
    return db.referrals[index];
  },
  acceptReferral: async (id: string, notes?: string): Promise<Referral> => {
    await delay(500);
    const db = getMockDatabase();
    const referral = db.referrals.find(r => r.id === id);
    if (!referral) throw new Error('Referral not found');
    referral.status = 'accepted';
    referral.updatedAt = new Date().toISOString();
    return referral;
  },
  denyReferral: async (id: string, reason: string): Promise<Referral> => {
    await delay(500);
    const db = getMockDatabase();
    const referral = db.referrals.find(r => r.id === id);
    if (!referral) throw new Error('Referral not found');
    referral.status = 'denied';
    referral.updatedAt = new Date().toISOString();
    return referral;
  },
};

export const mockMessagesAPI = {
  getByReferralId: async (referralId: string): Promise<Message[]> => {
    await delay(300);
    return getMockDatabase().messages.filter(m => m.referralId === referralId);
  },
  getInbox: async (): Promise<Message[]> => {
    await delay(300);
    const currentUser = JSON.parse(localStorage.getItem('current_user') || '{}');
    return getMockDatabase().messages.filter(m => m.recipientId === currentUser.id);
  },
  send: async (messageData: Partial<Message>): Promise<Message> => {
    await delay(500);
    const db = getMockDatabase();
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      isRead: false,
      sentAt: new Date().toISOString(),
      ...messageData,
    } as Message;
    db.messages.push(newMessage);
    return newMessage;
  },
  markAsRead: async (messageId: string): Promise<void> => {
    await delay(200);
    const db = getMockDatabase();
    const message = db.messages.find(m => m.id === messageId);
    if (message) message.isRead = true;
  },
};

export const mockHITLAPI = {
  getPending: async (): Promise<HITLApprovalRequest[]> => {
    await delay(300);
    const currentUser = JSON.parse(localStorage.getItem('current_user') || '{}');
    return getMockDatabase().hitlApprovals.filter(h => h.assignedTo === currentUser.id && h.status === 'pending');
  },
  getById: async (id: string): Promise<HITLApprovalRequest> => {
    await delay(200);
    const approval = getMockDatabase().hitlApprovals.find(h => h.id === id);
    if (!approval) throw new Error('Approval not found');
    return approval;
  },
  respond: async (requestId: string, selectedOptionId?: string, overrideMessage?: string): Promise<void> => {
    await delay(600);
    const db = getMockDatabase();
    const approval = db.hitlApprovals.find(h => h.requestId === requestId);
    if (!approval) throw new Error('Approval not found');
    const currentUser = JSON.parse(localStorage.getItem('current_user') || '{}');
    approval.status = 'answered';
    approval.selectedOptionId = selectedOptionId;
    approval.overrideMessage = overrideMessage;
    approval.answeredBy = currentUser.id;
    approval.answeredAt = new Date().toISOString();
  },
};

export const mockCoverageAPI = {
  getByReferralId: async (referralId: string) => {
    await delay(300);
    return getMockDatabase().coverageVerifications.find(c => c.referralId === referralId) || null;
  },
};

export const mockNotificationsAPI = {
  getAll: async (): Promise<Notification[]> => {
    await delay(300);
    const currentUser = JSON.parse(localStorage.getItem('current_user') || '{}');
    return getMockDatabase().notifications.filter(n => n.userId === currentUser.id);
  },
  markAsRead: async (notificationId: string): Promise<void> => {
    await delay(200);
    const db = getMockDatabase();
    const notification = db.notifications.find(n => n.id === notificationId);
    if (notification) notification.isRead = true;
  },
  markAllAsRead: async (): Promise<void> => {
    await delay(300);
    const currentUser = JSON.parse(localStorage.getItem('current_user') || '{}');
    const db = getMockDatabase();
    db.notifications.filter(n => n.userId === currentUser.id).forEach(n => n.isRead = true);
  },
};

export const mockStatsAPI = {
  getDashboard: async () => {
    await delay(400);
    const db = getMockDatabase();
    const currentUser = JSON.parse(localStorage.getItem('current_user') || '{}');
    return {
      totalPatients: db.patients.filter(p => p.primaryDoctorId === currentUser.id).length,
      activeReferrals: db.referrals.filter(r => ['routed', 'accepted'].includes(r.status)).length,
      pendingApprovals: db.hitlApprovals.filter(h => h.status === 'pending' && h.assignedTo === currentUser.id).length,
      completedToday: db.trackers.filter(t => t.completedAt && new Date(t.completedAt).toDateString() === new Date().toDateString()).length,
      urgentCases: db.referrals.filter(r => r.urgency === 'Urgent' && r.status !== 'completed').length,
    };
  },
};
