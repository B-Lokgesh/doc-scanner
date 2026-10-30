import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import {
  apiLogin,
  apiSignup,
  apiGetMe,
  setAuthToken,
  getAuthToken,
} from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { email: string; password: string; remember?: boolean }) => Promise<void>;
  signup: (data: { full_name: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateUserLocal: (updated: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(getAuthToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    const currentToken = getAuthToken();
    if (!currentToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const userData = await apiGetMe();
      setUser(userData);
      setTokenState(currentToken);
    } catch {
      // Invalid or expired token
      setAuthToken(null);
      setTokenState(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (credentials: { email: string; password: string; remember?: boolean }) => {
    setIsLoading(true);
    try {
      const res = await apiLogin({ email: credentials.email, password: credentials.password });
      setAuthToken(res.access_token);
      setTokenState(res.access_token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (data: { full_name: string; email: string; password: string }) => {
    setIsLoading(true);
    try {
      const res = await apiSignup(data);
      setAuthToken(res.access_token);
      setTokenState(res.access_token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setAuthToken(null);
    setTokenState(null);
    setUser(null);
  };

  const updateUserLocal = (updated: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updated });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
        refreshUser,
        updateUserLocal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

