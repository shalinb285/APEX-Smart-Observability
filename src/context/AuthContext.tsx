
// APEX Authentication & Identity Context
// OIDC-compatible session handling with in-memory token vaults.
// Does NOT store private encryption keys or access tokens in plaintext in localStorage.

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';

import { User, UserRole, AuthTokens } from '../types/saas';
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {

  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ==========================================
  // INITIALIZE EXISTING SESSION
  // ==========================================

  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      try {
        const token = getAccessToken();

        // Do not call /me without an access token.
        if (!token) {
          return;
        }

        // Validate the existing backend session.
        const currentUser = await saasApi.getCurrentUser();

        if (!mounted) return;

        setUser(currentUser);

        setTokens({
          accessToken: token,
          tokenType: 'Bearer',
          expiresIn: 3600,
        });

        // Unlock organization encryption vault.
        await keyManager.unlockVault(currentUser.currentOrgId);

      } catch (error) {
        console.warn('Session initialization failed:', error);

        // Clear invalid or expired session.
        setAccessToken(null);

        if (mounted) {
          setUser(null);
          setTokens(null);
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
  }, []);

  // ==========================================
  // REAL BACKEND LOGIN
  // ==========================================

  const login = useCallback(
    async (email: string, password?: string) => {

      if (!password) {
        throw new Error('Password is required');
      }

      try {
        // STEP 1: Authenticate with FastAPI.
        const authResponse = await saasApi.login(
          email,
          password
        );

        // STEP 2: Store genuine backend access token.
        // saasApi.login already calls setAccessToken().
        const accessToken = authResponse.access_token;

        if (!accessToken) {
          throw new Error('Backend did not return an access token');
        }

        setTokens({
          accessToken,
          tokenType: 'Bearer',
          expiresIn: 3600,
        });

        // STEP 3: Fetch authenticated user details.
        const currentUser = await saasApi.getCurrentUser();

        setUser(currentUser);

        // STEP 4: Unlock organization encryption vault.
        await keyManager.unlockVault(
          currentUser.currentOrgId
        );

        // Preserve existing MFA interface.
        return {
          mfaRequired: currentUser.mfaEnabled,
        };

      } catch (error) {

        // Authentication failed: clear partial session.
        setAccessToken(null);
        setUser(null);
        setTokens(null);

        keyManager.lockAndPurgeVault();

        throw error;
      }
    },
    []
  );

  // ==========================================
  // MFA VERIFICATION
  // ==========================================

  const completeMfa = useCallback(
    async (code: string) => {

      // Existing demo validation.
      // Actual server-side MFA verification
      // must be connected separately.

      if (code && /^\d{6}$/.test(code)) {
        return true;
      }

      return false;
    },
    []
  );

  // ==========================================
  // REGISTRATION
  // ==========================================

  const register = useCallback(
    async (
      fullName: string,
      email: string,
      password?: string
    ) => {

      // Existing mock registration implementation.
      const newUser: User = {
        id: `usr-${Date.now().toString(36)}`,
        email,
        fullName,
        emailVerified: false,
        mfaEnabled: false,
        currentOrgId: 'org-apex-enterprise',
        roles: {
          'org-apex-enterprise': 'Engineer',
        },
        createdAt: new Date().toISOString(),
      };

      setUser(newUser);

      await keyManager.unlockVault(
        newUser.currentOrgId
      );
    },
    []
  );

  // ==========================================
  // LOGOUT
  // ==========================================

  const logout = useCallback(async () => {

    // Clear backend access token.
    setAccessToken(null);

    // Purge cryptographic vault.
    keyManager.lockAndPurgeVault();

    setUser(null);
    setTokens(null);

  }, []);

  // ==========================================
  // PASSWORD RESET
  // ==========================================

  const requestPasswordReset = useCallback(
    async (email: string) => {
      console.info(
        `Password reset dispatched for ${email}`
      );
    },
    []
  );

  // ==========================================
  // EMAIL VERIFICATION
  // ==========================================

  const verifyEmail = useCallback(
    async (token: string) => {

      if (token) {
        if (user) {
          setUser({
            ...user,
            emailVerified: true,
          });
        }

        return true;
      }

      return false;
    },
    [user]
  );

  // ==========================================
  // INVITATION ACCEPTANCE
  // ==========================================

  const acceptInvitation = useCallback(
    async (invitationId: string) => {
      return !!invitationId;
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
