import { createContext, useContext, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import env from '../config/env';
import { fetchCurrentUser, loginUser, logoutUser, registerUser } from '../lib/api';
import { ApiError } from '../lib/http';
import type { LoginUser, UserLoginRequest, UserRegisterRequest } from '../types/user';

type AuthContextValue = {
  loginUser: LoginUser | null;
  loading: boolean;
  login: (payload: UserLoginRequest) => Promise<void>;
  register: (payload: UserRegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  googleLogin: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const currentUserQuery = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      try {
        const response = await fetchCurrentUser();
        return response.data;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          return null;
        }
        throw error;
      }
    }
  });

  const value = useMemo<AuthContextValue>(() => ({
    loginUser: currentUserQuery.data ?? null,
    loading: currentUserQuery.isLoading,
    login: async (payload: UserLoginRequest) => {
      await loginUser(payload);
      await currentUserQuery.refetch();
    },
    register: async (payload: UserRegisterRequest) => {
      await registerUser(payload);
    },
    logout: async () => {
      await logoutUser();
      queryClient.setQueryData(['current-user'], null);
    },
    refresh: async () => {
      await currentUserQuery.refetch();
    },
    googleLogin: () => {
      window.location.href = `${env.apiBaseUrl}/oauth2/authorization/google`;
    }
  }), [currentUserQuery, queryClient]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
