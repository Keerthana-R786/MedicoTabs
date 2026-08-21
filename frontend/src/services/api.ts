import axios from 'axios';
import { Patient, Referral, FlightTracker, PatientDocument, HITLApprovalRequest, Message, Notification, User, CoverageVerification } from '@/types';

const API_BASE_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:5000';

console.log('API Base URL:', API_BASE_URL);

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Authentication API
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await apiClient.post('/api/auth/login', { email, password });
    return response.data;
  },
  signup: async (userData: any) => {
    const response = await apiClient.post('/api/auth/signup', userData);
    return response.data;
  },
  logout: async () => {
    const response = await apiClient.post('/api/auth/logout');
    return response.data;
  },
  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get('/api/auth/me');
    return response.data;
  },
};

// Patients API
export const patientsAPI = {
  getAll: async (): Promise<Patient[]> => {
    const response = await apiClient.get('/api/patients');
    return response.data;
  },
  getById: async (id: string): Promise<Patient> => {
    const response = await apiClient.get(`/api/patients/${id}`);
    return response.data;
  },
  create: async (patientData: Partial<Patient>): Promise<Patient> => {
    const response = await apiClient.post('/api/patients', patientData);
    return response.data;
  },
  update: async (id: string, patientData: Partial<Patient>): Promise<Patient> => {
    const response = await apiClient.put(`/api/patients/${id}`, patientData);
    return response.data;
  },
  search: async (query: string): Promise<Patient[]> => {
    const response = await apiClient.get('/api/patients/search', { params: { q: query } });
    return response.data;
  },
};

// Documents API
export const documentsAPI = {
  getByPatientId: async (patientId: string): Promise<PatientDocument[]> => {
    const response = await apiClient.get(`/api/patients/${patientId}/documents`);
    return response.data;
  },
  upload: async (patientId: string, file: File, category: string): Promise<PatientDocument> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    const response = await apiClient.post(`/api/patients/${patientId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  download: async (documentId: string): Promise<Blob> => {
    const response = await apiClient.get(`/api/documents/${documentId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },
  delete: async (documentId: string): Promise<void> => {
    await apiClient.delete(`/api/documents/${documentId}`);
  },
};

// Flight Tracker API
export const flightTrackerAPI = {
  getByPatientId: async (patientId: string): Promise<FlightTracker[]> => {
    const response = await apiClient.get(`/api/patients/${patientId}/trackers`);
    return response.data;
  },
  getById: async (trackerId: string): Promise<FlightTracker> => {
    const response = await apiClient.get(`/api/trackers/${trackerId}`);
    return response.data;
  },
  create: async (trackerData: Partial<FlightTracker>): Promise<FlightTracker> => {
    const response = await apiClient.post('/api/trackers', trackerData);
    return response.data;
  },
  signOff: async (trackerId: string, notes?: string): Promise<FlightTracker> => {
    const response = await apiClient.post(`/api/trackers/${trackerId}/signoff`, { notes });
    return response.data;
  },
};

// Referrals API - Integrated with YOXA Workflow
export const referralsAPI = {
  getAll: async (): Promise<Referral[]> => {
    const response = await apiClient.get('/api/referrals');
    return response.data;
  },
  getById: async (id: string): Promise<Referral> => {
    const response = await apiClient.get(`/api/referrals/${id}`);
    return response.data;
  },
  getByPatientId: async (patientId: string): Promise<Referral[]> => {
    const response = await apiClient.get(`/api/patients/${patientId}/referrals`);
    return response.data;
  },
  // This triggers the YOXA multiagent workflow
  create: async (referralData: Partial<Referral>): Promise<{ referral: Referral; workflowRunId: string }> => {
    const response = await apiClient.post('/api/referrals', referralData);
    return response.data;
  },
  update: async (id: string, referralData: Partial<Referral>): Promise<Referral> => {
    const response = await apiClient.put(`/api/referrals/${id}`, referralData);
    return response.data;
  },
  acceptReferral: async (id: string, notes?: string): Promise<Referral> => {
    const response = await apiClient.post(`/api/referrals/${id}/accept`, { notes });
    return response.data;
  },
  denyReferral: async (id: string, reason: string): Promise<Referral> => {
    const response = await apiClient.post(`/api/referrals/${id}/deny`, { reason });
    return response.data;
  },
};

// Messages API (Two-way communication)
export const messagesAPI = {
  getByReferralId: async (referralId: string): Promise<Message[]> => {
    const response = await apiClient.get(`/api/referrals/${referralId}/messages`);
    return response.data;
  },
  getInbox: async (): Promise<Message[]> => {
    const response = await apiClient.get('/api/messages/inbox');
    return response.data;
  },
  send: async (messageData: Partial<Message>): Promise<Message> => {
    const response = await apiClient.post('/api/messages', messageData);
    return response.data;
  },
  markAsRead: async (messageId: string): Promise<void> => {
    await apiClient.put(`/api/messages/${messageId}/read`);
  },
};

// HITL Approval API - Integrated with YOXA Deployed HITL
export const hitlAPI = {
  getPending: async (): Promise<HITLApprovalRequest[]> => {
    const response = await apiClient.get('/api/hitl/pending');
    return response.data;
  },
  getById: async (id: string): Promise<HITLApprovalRequest> => {
    const response = await apiClient.get(`/api/hitl/${id}`);
    return response.data;
  },
  respond: async (requestId: string, selectedOptionId?: string, overrideMessage?: string): Promise<void> => {
    await apiClient.post(`/api/hitl/${requestId}/respond`, {
      selectedOptionId,
      overrideMessage,
    });
  },
};

// Coverage Verification API
export const coverageAPI = {
  getByReferralId: async (referralId: string): Promise<CoverageVerification | null> => {
    const response = await apiClient.get(`/api/referrals/${referralId}/coverage`);
    return response.data;
  },
};

// Notifications API
export const notificationsAPI = {
  getAll: async (): Promise<Notification[]> => {
    const response = await apiClient.get('/api/notifications');
    return response.data;
  },
  markAsRead: async (notificationId: string): Promise<void> => {
    await apiClient.put(`/api/notifications/${notificationId}/read`);
  },
  markAllAsRead: async (): Promise<void> => {
    await apiClient.put('/api/notifications/read-all');
  },
};

// Statistics API
export const statsAPI = {
  getDashboard: async () => {
    const response = await apiClient.get('/api/stats/dashboard');
    return response.data;
  },
};

export default apiClient;
