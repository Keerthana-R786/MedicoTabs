import axios from 'axios';
import { PatientPortalPatient, PatientPortalSummary } from '@/types';

const API_BASE_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:5000';

const PATIENT_TOKEN_KEY = 'patient_auth_token';

// Isolated axios instance — carries the patient session token, never the
// doctor `auth_token`, so the two identities can never cross-contaminate.
const patientClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

patientClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(PATIENT_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const patientAuthAPI = {
  login: async (referralId: string, dateOfBirth: string) => {
    const response = await patientClient.post('/api/patient-auth/login', { referralId, dateOfBirth });
    return response.data as { patient: PatientPortalPatient; token: string };
  },
  logout: async () => {
    await patientClient.post('/api/patient-auth/logout');
  },
  getCurrentPatient: async (): Promise<PatientPortalPatient> => {
    const response = await patientClient.get('/api/patient-auth/me');
    return response.data;
  },
  saveToken: (token: string) => localStorage.setItem(PATIENT_TOKEN_KEY, token),
  clearToken: () => localStorage.removeItem(PATIENT_TOKEN_KEY),
  hasToken: () => !!localStorage.getItem(PATIENT_TOKEN_KEY),
};

export const patientPortalAPI = {
  getSummary: async (): Promise<PatientPortalSummary> => {
    const response = await patientClient.get('/api/patient-portal/summary');
    return response.data;
  },
  downloadSummaryPdf: async (): Promise<Blob> => {
    const response = await patientClient.get('/api/patient-portal/summary/pdf', {
      responseType: 'blob',
    });
    return response.data;
  },
};

export default patientClient;
