import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiFetch, getStoredToken, setStoredToken } from '../lib/api';

export interface AuthUser {
  id: number;
  email: string;
  role: 'tenant' | 'landlord' | 'admin';
  full_name: string;
  phone: string;
  avatar_url?: string;
  email_verified: boolean;
  phone_verified: boolean;
  identity_verified: boolean;
  trust?: {
    score: number;
    tier: string;
    isVerified: boolean;
    completedRentals: number;
    averageRating: number;
    reviewCount: number;
    complaintCount: number;
  };
}

interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AuthContextValue {
  user: AuthUser | null;
  profile: any;
  preferences: any;
  loading: boolean;
  unreadNotifications: number;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (payload: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
    role: 'tenant' | 'landlord';
  }) => Promise<{ user: AuthUser; verificationToken?: string }>;
  logout: () => void;
  refreshMe: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [preferences, setPreferences] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'info') => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3800);
    },
    []
  );

  const refreshNotifications = useCallback(async () => {
    if (!getStoredToken()) {
      setUnreadNotifications(0);
      return;
    }
    try {
      const data = await apiFetch<{ unreadCount: number }>('/api/notifications');
      setUnreadNotifications(data.unreadCount || 0);
    } catch {
      // ignore
    }
  }, []);

  const refreshMe = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setProfile(null);
      setPreferences(null);
      setLoading(false);
      return;
    }
    try {
      const data = await apiFetch<any>('/api/auth/me');
      setUser(data.user);
      setProfile(data.profile);
      setPreferences(data.preferences);
      await refreshNotifications();
    } catch {
      setStoredToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [refreshNotifications]);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  const login = async (email: string, password: string) => {
    const data = await apiFetch<{ token: string; user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(data.token);
    setUser(data.user);
    await refreshMe();
    showToast(`Signed in as ${data.user.full_name}`, 'success');
    return data.user;
  };

  const register = async (payload: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
    role: 'tenant' | 'landlord';
  }) => {
    const data = await apiFetch<{ token: string; user: AuthUser; verificationToken?: string }>(
      '/api/auth/register',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    setStoredToken(data.token);
    setUser(data.user);
    await refreshMe();
    showToast('Account created successfully', 'success');
    return { user: data.user, verificationToken: data.verificationToken };
  };

  const logout = () => {
    setStoredToken(null);
    setUser(null);
    setProfile(null);
    setPreferences(null);
    setUnreadNotifications(0);
    showToast('Signed out', 'info');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        preferences,
        loading,
        unreadNotifications,
        login,
        register,
        logout,
        refreshMe,
        refreshNotifications,
        showToast,
      }}
    >
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto rounded-lg border px-4 py-3 text-sm font-medium shadow-md transition-all ${
              t.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : t.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-900'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
