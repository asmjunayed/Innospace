import React, { createContext, useContext, useState, useEffect } from 'react';
import { Role, UserSession } from '../types';

interface AuthContextType {
  user: UserSession | null;
  role: Role | null;
  loginAs: (role: Role) => void;
  logout: () => void;
  switchRole: () => void;
}

const DEMO_USERS: Record<Role, UserSession> = {
  mo: {
    email: 'mo@fieldverify.demo',
    name: 'Rafiqul Islam',
    role: 'mo',
    designation: 'Field Marketing Officer',
    region: 'Dhaka Central & South',
  },
  admin: {
    email: 'admin@fieldverify.demo',
    name: 'Farhana Ahmed',
    role: 'admin',
    designation: 'Master Data Operations & Verifier',
    region: 'National HQ',
  }
};

const STORAGE_KEY = 'fieldverify_session_user';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return null; // Not logged in by default or can default to null so user sees the login view
  });

  const loginAs = (role: Role) => {
    const demoUser = DEMO_USERS[role];
    setUser(demoUser);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(demoUser));
    } catch {
      // ignore
    }
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const switchRole = () => {
    if (!user) {
      loginAs('mo');
      return;
    }
    const nextRole: Role = user.role === 'mo' ? 'admin' : 'mo';
    loginAs(nextRole);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role ?? null,
        loginAs,
        logout,
        switchRole,
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
