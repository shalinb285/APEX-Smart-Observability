
// APEX Authentication & Identity Context
// Secure session handling with in-memory token management.
// MFA must be verified by the backend before granting full access.

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';

import { User, AuthTokens } from '../types/saas';
import { saasApi } from '../services/saasApi';
import { keyManager } from '../services/crypto/keyManager';
import {
  getAccessToken,
  setAccessToken,
} from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  tokens: AuthTokens | null;

  login: (
    email: string,
    password?: string
  ) => Promise<{ mfaRequired?: boolean }>;

  completeMfa: (code: string) => Promise<boolean>;

  register: (
    fullName: string,
    email: string,
    password?: string
  ) => Promise<void>;

  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<boolean>;
  acceptInvitation: (invitationId: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export const AuthProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {

  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ==========================================
  // CLEAR LOCAL AUTHENTICATION STATE
  // ==========================================

  const clearSession = useCallback(() => {
    setAccessToken(null);

    setUser(null);
    setTokens(null);

    keyManager.lockAndPurgeVault();
  }, []);

  // ==========================================
  // INITIALIZE EXISTING SESSION
  // ==========================================

  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      try {
        const token = getAccessToken();

        if (!token) return;

        // Validate the existing backend session.
        const currentUser = await saasApi.getCurrentUser();

        if (!mounted) return;

        // MFA-enabled accounts must not enter the
        // application without verified MFA.
        if (currentUser.mfaEnabled) {
          clearSession();
          return;
        }

        // Establish the authenticated session.
        setUser(currentUser);

        setTokens({
          accessToken: token,
          tokenType: 'Bearer',
          expiresIn: 3600,
        });

        // Unlock encryption vault only after
        // successful authentication.
        await keyManager.unlockVault(
          currentUser.currentOrgId
        );

      } catch (error) {
        console.warn(
          'Session initialization failed:',
          error
        );

        if (mounted) {
          clearSession();
        }

      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initSession();

    return () => {
      mounted = false;
    };

  }, [clearSession]);

  // ==========================================
  // BACKEND LOGIN
  // ==========================================

  const login = useCallback(
    async (email: string, password?: string) => {

      if (!password) {
        throw new Error('Password is required');
      }

      // Remove any previous partial session.
      clearSession();

      try {

        // STEP 1: Authenticate with FastAPI.
        const authResponse = await saasApi.login(
          email,
          password
        );

        // STEP 2: Check whether backend requires MFA.
        // The backend should return an MFA challenge,
        // NOT a fully privileged access token.
        const mfaRequired =
          authResponse?.mfa_required === true ||
          authResponse?.mfaRequired === true;

        if (mfaRequired) {
          clearSession();

          return {
            mfaRequired: true,
          };
        }

        // STEP 3: Obtain backend access token.
        const accessToken = authResponse?.access_token;

        if (!accessToken) {
          throw new Error(
            'Authentication response did not contain an access token.'
          );
        }

        // Store token temporarily for profile validation.
        setAccessToken(accessToken);

        // STEP 4: Fetch authenticated user profile.
        const currentUser = await saasApi.getCurrentUser();

        // Fail closed if the account requires MFA.
        if (currentUser.mfaEnabled) {
          clearSession();

          return {
            mfaRequired: true,
          };
        }

        // STEP 5: Unlock organization encryption vault.
        await keyManager.unlockVault(
          currentUser.currentOrgId
        );

        // STEP 6: Establish application session.
        setUser(currentUser);

        setTokens({
          accessToken,
          tokenType: 'Bearer',
          expiresIn: 3600,
        });

        return {
          mfaRequired: false,
        };

      } catch (error) {

        // Never preserve partially authenticated state.
        clearSession();

        throw error;
      }
    },
    [clearSession]
  );

  // ==========================================
  // MFA VERIFICATION
  // ==========================================

  const completeMfa = useCallback(
    async (_code: string): Promise<boolean> => {

      // MFA verification is intentionally disabled
      // until a real backend verification endpoint
      // and challenge-based authentication flow exist.

      console.error(
        'MFA verification is not connected to the backend.'
      );

      return false;
    },
    []
  );

  // ==========================================
  // REGISTRATION
  // ==========================================

  const register = useCallback(
    async (
      _fullName: string,
      _email: string,
      _password?: string
    ) => {

      // Do not create fake frontend-only accounts.
      throw new Error(
        'Registration is not yet connected to the backend.'
      );
    },
    []
  );

  // ==========================================
  // LOGOUT
  // ==========================================

  const logout = useCallback(async () => {
    clearSession();
  }, [clearSession]);

  // ==========================================
  // PASSWORD RESET
  // ==========================================

  const requestPasswordReset = useCallback(
    async (_email: string) => {
      throw new Error(
        'Password reset is not yet connected to the backend.'
      );
    },
    []
  );

  // ==========================================
  // EMAIL VERIFICATION
  // ==========================================

  const verifyEmail = useCallback(
    async (_token: string): Promise<boolean> => {
      // A real backend verification endpoint is required.
      return false;
    },
    []
  );

  // ==========================================
  // INVITATION ACCEPTANCE
  // ==========================================

  const acceptInvitation = useCallback(
    async (_invitationId: string): Promise<boolean> => {
      // A real backend invitation endpoint is required.
      return false;
    },
    []
  );

  // ==========================================
  // AUTHENTICATION PROVIDER
  // ==========================================

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        tokens,
        login,
        completeMfa,
        register,
        logout,
        requestPasswordReset,
        verifyEmail,
        acceptInvitation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ==========================================
// AUTH HOOK
// ==========================================

export const useAuth = () => {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error(
      'useAuth must be used within an AuthProvider'
    );
  }

  return ctx;
};
