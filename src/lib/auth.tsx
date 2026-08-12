import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { UserRole } from '../types/database.types';

export interface AuthProfile {
  id: string;
  full_name: string | null;
  phone_number: string | null;
  role: UserRole;
}

// Walk-in clients (created via the create-walkin-client Edge Function) sign in with a
// single access code rather than an email/password. Supabase auth still needs a valid
// email under the hood, so the code is deterministically mapped to one — this domain
// must match WALKIN_EMAIL_DOMAIN used by the Edge Function that creates these accounts
// (supabase/functions/create-walkin-client/index.ts).
const WALKIN_EMAIL_DOMAIN = 'walkin.clients.internal';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: AuthProfile | null;
  loading: boolean;
  // True after the user opens a password-reset email link — the app should show the
  // "set a new password" screen instead of its normal signed-in content until this
  // resolves (Supabase treats the reset link as a real, though narrowly-scoped, session).
  isPasswordRecovery: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithClientCode: (code: string) => Promise<{ error: string | null }>;
  sendPasswordReset: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

export interface WalkInClientResult {
  clientId: string;
  accessCode: string;
  isNewAccount: boolean;
  smsSent: boolean;
}

/**
 * Registers (or recognizes a returning) walk-in client via the create-walkin-client
 * Edge Function. Must be called by a signed-in tailor/admin — the function itself
 * re-checks this server-side. Throws on failure.
 */
export async function createWalkInClient(fullName: string, phone: string): Promise<WalkInClientResult> {
  const { data, error } = await supabase.functions.invoke('create-walkin-client', {
    body: { fullName, phone },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as WalkInClientResult;
}

export interface StaffAccountResult {
  userId: string;
  tempPassword: string;
}

/**
 * Creates a tailor/admin account via the create-staff-account Edge Function. Must be
 * called by a signed-in admin — the function itself re-checks this server-side. There
 * is no self-service staff signup: this (and the Team Roles panel that calls it) is
 * the only way a tailor/admin account comes into existence. Throws on failure.
 */
export async function createStaffAccount(
  fullName: string,
  email: string,
  role: Extract<UserRole, 'tailor' | 'admin'>,
  phone?: string
): Promise<StaffAccountResult> {
  const { data, error } = await supabase.functions.invoke('create-staff-account', {
    body: { fullName, email, role, phone },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as StaffAccountResult;
}

/**
 * Self-service recovery for a walk-in client who lost their SMS access code — no
 * sign-in required. Always resolves to the same generic message regardless of
 * whether the phone number matched anything (the resend-access-code Edge Function
 * never reveals that), so there is nothing meaningful to throw here except a
 * genuine network failure.
 */
export async function resendAccessCode(phone: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('resend-access-code', {
    body: { phone },
  });
  if (error) throw new Error('Could not reach the recovery service. Please try again.');
  if (data?.error) throw new Error(data.error);
  return data.message as string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!isMounted) return;
      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true);
      setSession(newSession);
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile(userId: string) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, phone_number, role')
        .eq('id', userId)
        .maybeSingle();

      if (isMounted && !error) {
        setProfile((data as unknown as AuthProfile) || null);
      }
    }

    if (session?.user) {
      loadProfile(session.user.id);
    } else {
      setProfile(null);
    }

    return () => {
      isMounted = false;
    };
  }, [session?.user?.id]);

  const signIn: AuthContextValue['signIn'] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message || null };
  };

  const signInWithClientCode: AuthContextValue['signInWithClientCode'] = async (code) => {
    const normalized = code.trim().toUpperCase();
    if (!normalized) return { error: 'Enter your access code.' };

    const syntheticEmail = `${normalized.toLowerCase()}@${WALKIN_EMAIL_DOMAIN}`;
    const { error } = await supabase.auth.signInWithPassword({
      email: syntheticEmail,
      password: normalized,
    });
    return { error: error ? 'Invalid or expired access code.' : null };
  };

  const sendPasswordReset: AuthContextValue['sendPasswordReset'] = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    return { error: error?.message || null };
  };

  const updatePassword: AuthContextValue['updatePassword'] = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (!error) setIsPasswordRecovery(false);
    return { error: error?.message || null };
  };

  const signOut = async () => {
    setIsPasswordRecovery(false);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user || null,
        profile,
        loading,
        isPasswordRecovery,
        signIn,
        signInWithClientCode,
        sendPasswordReset,
        updatePassword,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
