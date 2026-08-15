import React, { useState } from 'react';
import { Lock, Mail, KeyRound, Phone, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth, resendAccessCode } from '../../lib/auth';
import { CenteredCardShell } from '../ui/CenteredCardShell';
import { activeTabClass } from '../ui/tabStyles';

type Mode = 'clientCode' | 'signIn';

const inputClass =
  'w-full bg-white/90 border border-gray-200/90 rounded-xl p-2.5 pl-10 text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500 shadow-sm transition-all';
const labelClass = 'block text-xs font-semibold text-gray-700 mb-1 tracking-wide';
const submitButtonClass = (disabled: boolean) =>
  `w-full py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-md ${
    disabled
      ? 'bg-gray-200 text-gray-400 cursor-wait'
      : 'bg-gradient-to-r from-accent-800 to-accent-600 hover:from-accent-700 text-white shadow-accent-900/15 hover:shadow-lg'
  }`;

// There is no self-service account creation in this app. Client accounts are only
// created by atelier staff via the Quick Intake walk-in flow (create-walkin-client),
// and staff (tailor/admin) accounts are only created by an existing admin from the
// Team Roles panel (create-staff-account). This screen is sign-in only.
export const AuthScreen: React.FC = () => {
  const { signIn, signInWithClientCode, sendPasswordReset } = useAuth();
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [clientCode, setClientCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const [isRecoveringCode, setIsRecoveringCode] = useState(false);
  const [recoveryPhone, setRecoveryPhone] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const switchMode = (next: Mode) => {
    setMode(next);
    setErrorMessage(null);
    setInfoMessage(null);
    setIsRecoveringCode(false);
    setIsResettingPassword(false);
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);
    setIsSubmitting(true);
    try {
      const message = await resendAccessCode(recoveryPhone);
      setInfoMessage(message);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);
    setIsSubmitting(true);
    try {
      const { error } = await sendPasswordReset(resetEmail);
      if (error) {
        setErrorMessage(error);
      } else {
        setInfoMessage('If that email has an account, a password reset link has been sent.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);
    setIsSubmitting(true);

    try {
      if (mode === 'clientCode') {
        const { error } = await signInWithClientCode(clientCode);
        if (error) setErrorMessage(error);
      } else {
        const { error } = await signIn(email, password);
        if (error) setErrorMessage(error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CenteredCardShell>
      <div className="text-center space-y-2 mb-8">
        <img src="/logo.png" alt="Awutorla" className="h-16 w-auto mx-auto" />
        <p className="text-xs text-gray-500 font-sans">
          {mode === 'clientCode' ? 'Enter your bespoke client access code' : 'Atelier staff & artisan portal'}
        </p>
      </div>

      <div className="flex items-center bg-gray-100/90 p-1 rounded-xl text-xs mb-6 border border-gray-200/60">
        <button
          type="button"
          onClick={() => switchMode('clientCode')}
          className={`flex-1 px-3 py-2 rounded-lg font-semibold transition-all ${
            mode === 'clientCode' ? `${activeTabClass} shadow-sm` : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Client Code
        </button>
        <button
          type="button"
          onClick={() => switchMode('signIn')}
          className={`flex-1 px-3 py-2 rounded-lg font-semibold transition-all ${
            mode === 'signIn' ? `${activeTabClass} shadow-sm` : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Staff Sign In
        </button>
      </div>

      {mode === 'signIn' && isResettingPassword ? (
        <form onSubmit={handlePasswordResetSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Email</label>
            <div className="relative">
              <input
                type="email"
                required
                autoFocus
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClass}
              />
              <Mail size={14} className="absolute left-3 top-3 text-gray-400" />
            </div>
            <p className="mt-1.5 text-xs text-gray-400">We'll email you a link to set a new password.</p>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2 text-xs">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
          {infoMessage && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              {infoMessage}
            </div>
          )}

          <button type="submit" disabled={isSubmitting} className={submitButtonClass(isSubmitting)}>
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <span>Send Reset Link</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsResettingPassword(false);
              setErrorMessage(null);
              setInfoMessage(null);
            }}
            className="w-full text-center text-xs text-gray-500 hover:text-gray-900"
          >
            Back to sign in
          </button>
        </form>
      ) : mode === 'clientCode' && isRecoveringCode ? (
        <form onSubmit={handleRecoverySubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Phone Number</label>
            <div className="relative">
              <input
                type="tel"
                required
                autoFocus
                value={recoveryPhone}
                onChange={(e) => setRecoveryPhone(e.target.value)}
                placeholder="024XXXXXXX"
                className={inputClass}
              />
              <Phone size={14} className="absolute left-3 top-3 text-gray-400" />
            </div>
            <p className="mt-1.5 text-xs text-gray-400">
              The phone number your order was registered under. We'll text a new code to it.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2 text-xs">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
          {infoMessage && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              {infoMessage}
            </div>
          )}

          <button type="submit" disabled={isSubmitting} className={submitButtonClass(isSubmitting)}>
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <span>Send New Code</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsRecoveringCode(false);
              setErrorMessage(null);
              setInfoMessage(null);
            }}
            className="w-full text-center text-xs text-gray-500 hover:text-gray-900"
          >
            Back to code entry
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'clientCode' && (
            <div>
              <label className={labelClass}>Access Code</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  autoFocus
                  value={clientCode}
                  onChange={(e) => setClientCode(e.target.value.toUpperCase())}
                  placeholder="e.g. MA7X2Q"
                  className={`${inputClass} tracking-[0.2em] uppercase`}
                />
                <KeyRound size={14} className="absolute left-3 top-3 text-gray-400" />
              </div>
              <p className="mt-1.5 text-xs text-gray-400">
                Given to you by the atelier when your order was registered — sent by SMS.
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsRecoveringCode(true);
                  setErrorMessage(null);
                  setInfoMessage(null);
                }}
                className="mt-1.5 text-xs text-accent-600 hover:text-accent-700 underline"
              >
                Lost your code?
              </button>
            </div>
          )}

          {mode === 'signIn' && (
            <>
              <div>
                <label className={labelClass}>Email</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={inputClass}
                  />
                  <Mail size={14} className="absolute left-3 top-3 text-gray-400" />
                </div>
              </div>

              <div>
                <label className={labelClass}>Password</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className={inputClass}
                  />
                  <Lock size={14} className="absolute left-3 top-3 text-gray-400" />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsResettingPassword(true);
                    setResetEmail(email);
                    setErrorMessage(null);
                    setInfoMessage(null);
                  }}
                  className="mt-1.5 text-xs text-accent-600 hover:text-accent-700 underline"
                >
                  Forgot password?
                </button>
              </div>
            </>
          )}

          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2 text-xs">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {infoMessage && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              {infoMessage}
            </div>
          )}

          <button type="submit" disabled={isSubmitting} className={submitButtonClass(isSubmitting)}>
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>{mode === 'clientCode' ? 'Verifying Code...' : 'Signing In...'}</span>
              </>
            ) : (
              <span>{mode === 'clientCode' ? 'Continue' : 'Sign In'}</span>
            )}
          </button>
        </form>
      )}
    </CenteredCardShell>
  );
};

export default AuthScreen;
