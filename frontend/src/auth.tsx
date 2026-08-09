import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setUnauthorizedHandler, unwrap } from './api';
import type { Role, User } from './types';

type AuthContextValue = {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  canManageCustomers: boolean;
  canManageProducts: boolean;
  canManageChallans: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredUser() {
  const raw = localStorage.getItem('mini_erp_user');

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [token, setToken] = useState(() => localStorage.getItem('mini_erp_token'));
  const [user, setUser] = useState<User | null>(() => readStoredUser());

  const logout = () => {
    localStorage.removeItem('mini_erp_token');
    localStorage.removeItem('mini_erp_user');
    setToken(null);
    setUser(null);
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  });

  const login = async (email: string, password: string) => {
    const result = await unwrap<{ token: string; user: User }>(api.post('/auth/login', { email, password }));
    localStorage.setItem('mini_erp_token', result.token);
    localStorage.setItem('mini_erp_user', JSON.stringify(result.user));
    setToken(result.token);
    setUser(result.user);
    navigate('/dashboard', { replace: true });
  };

  const value = useMemo(() => {
    const role = user?.role as Role | undefined;

    return {
      token,
      user,
      isAuthenticated: Boolean(token && user),
      login,
      logout,
      canManageCustomers: role === 'ADMIN' || role === 'SALES',
      canManageProducts: role === 'ADMIN' || role === 'WAREHOUSE',
      canManageChallans: role === 'ADMIN' || role === 'SALES',
    };
  }, [token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
