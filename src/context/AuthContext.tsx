
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

// ==========================================
// AUTHENTICATION INTERFACE
// ==========================================

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

// ==========================================
// AUTHENTICATION PROVIDER
// ==========================================

export const AuthProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {

  const [user, setUser] = useState<User | null>(null);

  const [tokens, setTokens] = useState<AuthTokens | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  // ==========================================
  // CLEAR SESSION
  // ==========================================

  const clearSession = useCallback(() => {

    // Remove access token.
    setAccessToken(null);

    // Clear application authentication state.
    setUser(null);
    setTokens(null);

    // Lock and purge encryption vault.
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

        // No token means no existing session.
        if (!token) {
          return;
        }

        // Validate existing backend session.
        const currentUser = await saasApi.getCurrentUser();

        if (!mounted) return;

        // Require a completed MFA session.
        // This frontend check is supplementary;
        // the backend must enforce MFA independently.
        if (currentUser.mfaEnabled) {

          clearSession();

          return;
        }

        // Restore authenticated user.
        setUser(currentUser);

        setTokens({
          accessToken: token,
          tokenType: 'Bearer',
          expiresIn: 3600,
        });

        // Unlock organization vault.
        await keyManager.unlockVault(
          currentUser.currentOrgId
        );

      } catch (error) {

        console.error(
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
  // LOGIN
  // ==========================================

  const login = useCallback(
    async (
      email: string,
      password?: string
    ): Promise<{ mfaRequired?: boolean }> => {

      if (!email.trim()) {
        throw new Error('Email or username is required.');
      }

      if (!password) {
        throw new Error('Password is required.');
      }

      // Clear previous session.
      clearSession();

      try {

        // STEP 1: Authenticate with backend.
        const authResponse = await saasApi.login(
          email.trim(),
          password
        );

        // STEP 2: Get access token.
        const accessToken = authResponse?.access_token;

        if (!accessToken) {
          throw new Error(
            'Authentication failed: backend did not return an access token.'
          );
        }

        // STEP 3: Temporarily set token to validate
        // authenticated user against backend.
        setAccessToken(accessToken);

        // STEP 4: Fetch authenticated user profile.
        const currentUser = await saasApi.getCurrentUser();

        // STEP 5: Check account MFA status.
        if (currentUser.mfaEnabled) {

          clearSession();

          return {
            mfaRequired: true,
          };
        }

        // STEP 6: Unlock encryption vault.
        await keyManager.unlockVault(
          currentUser.currentOrgId
        );

        // STEP 7: Establish application session.
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

        // Remove any incomplete authentication state.
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

      // MFA must be verified by the backend.
      // Never accept a locally generated or
      // arbitrary six-digit code.

      console.warn(
        'MFA verification is unavailable until the backend endpoint is implemented.'
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
    ): Promise<void> => {

      throw new Error(
        'Registration is not currently connected to the backend.'
      );

    },
    []
  );

  // ==========================================
  // LOGOUT
  // ==========================================

  const logout = useCallback(async (): Promise<void> => {

    clearSession();

  }, [clearSession]);

  // ==========================================
  // PASSWORD RESET
  // ==========================================

  const requestPasswordReset = useCallback(
    async (_email: string): Promise<void> => {

      throw new Error(
        'Password reset endpoint is not yet implemented.'
      );

    },
    []
  );

  // ==========================================
  // EMAIL VERIFICATION
  // ==========================================

  const verifyEmail = useCallback(
    async (_token: string): Promise<boolean> => {

      // Requires backend verification.
      return false;

    },
    []
  );

  // ==========================================
  // INVITATION ACCEPTANCE
  // ==========================================

  const acceptInvitation = useCallback(
    async (_invitationId: string): Promise<boolean> => {

      // Requires backend invitation endpoint.
      return false;

    },
    []
  );

  // ==========================================
  // PROVIDER
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
// AUTHENTICATION HOOK
// ==========================================

export const useAuth = () => {

  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used within an AuthProvider'
    );
  }

  return context;
};

export default AuthProvider;
