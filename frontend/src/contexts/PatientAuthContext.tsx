import React, { createContext, useContext, useState, useEffect } from 'react';
import { PatientPortalPatient } from '@/types';
import { patientAuthAPI } from '@/services/patientPortalApi';

interface PatientAuthContextType {
  patient: PatientPortalPatient | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (referralId: string, dateOfBirth: string) => Promise<void>;
  logout: () => Promise<void>;
}

const PatientAuthContext = createContext<PatientAuthContextType | undefined>(undefined);

export const PatientAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [patient, setPatient] = useState<PatientPortalPatient | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (!patientAuthAPI.hasToken()) {
        setIsLoading(false);
        return;
      }
      try {
        const currentPatient = await patientAuthAPI.getCurrentPatient();
        setPatient(currentPatient);
      } catch {
        patientAuthAPI.clearToken();
        setPatient(null);
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (referralId: string, dateOfBirth: string) => {
    const { patient: loggedInPatient, token } = await patientAuthAPI.login(referralId, dateOfBirth);
    patientAuthAPI.saveToken(token);
    setPatient(loggedInPatient);
  };

  const logout = async () => {
    await patientAuthAPI.logout();
    patientAuthAPI.clearToken();
    setPatient(null);
  };

  return (
    <PatientAuthContext.Provider value={{ patient, isAuthenticated: !!patient, isLoading, login, logout }}>
      {children}
    </PatientAuthContext.Provider>
  );
};

export const usePatientAuth = () => {
  const context = useContext(PatientAuthContext);
  if (!context) throw new Error('usePatientAuth must be used within PatientAuthProvider');
  return context;
};
