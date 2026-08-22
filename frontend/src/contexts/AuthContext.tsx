import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, NotificationPreferences } from '@/types';
import { authAPI } from '@/services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: 'primary_doctor' | 'specialist_doctor' | 'coordinator';
    organization: string;
    specialization?: string;
    licenseNumber: string;
    phone: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (profileData: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    organization?: string;
    specialization?: string;
    licenseNumber?: string;
  }) => Promise<void>;
  updatePreferences: (preferences: NotificationPreferences) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (!localStorage.getItem('auth_token')) {
        setIsLoading(false);
        return;
      }
      try {
        const currentUser = await authAPI.getCurrentUser();
        setUser(currentUser);
      } catch {
        localStorage.removeItem('auth_token');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const { user: loggedInUser, token } = await authAPI.login(email, password);
    localStorage.setItem('auth_token', token);
    setUser(loggedInUser);
  };

  const signup = async (userData: any) => {
    const { user: newUser, token } = await authAPI.signup(userData);
    localStorage.setItem('auth_token', token);
    setUser(newUser);
  };

  const logout = async () => {
    await authAPI.logout();
    localStorage.removeItem('auth_token');
    setUser(null);
  };

  const updateProfile = async (profileData: Parameters<AuthContextType['updateProfile']>[0]) => {
    const updatedUser = await authAPI.updateProfile(profileData);
    setUser(updatedUser);
  };

  const updatePreferences = async (preferences: NotificationPreferences) => {
    const updatedUser = await authAPI.updatePreferences(preferences);
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, login, signup, logout, updateProfile, updatePreferences }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
