import React, { useState } from 'react';
import { Lock, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { CenteredCardShell } from '../ui/CenteredCardShell';

// Shown when the user arrives via a Supabase password-reset email link
// (AuthProvider.isPasswordRecovery) instead of the normal signed-in app.
export const SetNewPasswordScreen: React.FC = () => {
  const { updatePassword, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await updatePassword(password);
      if (error) {
        setErrorMessage(error);
      } else {
        setSuccess(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CenteredCardShell>
      <div className="text-center space-y-1 mb-6">
        <div className="w-10 h-10 mx-auto rounded-lg bg-gray-900 text-white flex items-center justify-center text-sm font-semibold">
          LA
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mt-2">Set a New Password</h1>
      </div>

      {success ? (
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={24} />
          </div>
          <p className="text-sm text-gray-600">Password updated. Sign in again with your new password.</p>
          <button
            onClick={() => signOut()}
            className="w-full py-2.5 rounded-lg text-sm font-semibold bg-gray-900 text-white hover:bg-accent-600 transition-colors"
          >
            Continue to Sign In
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">New Password</label>
            <div className="relative">
              <input
                type="password"
                required
                minLength={6}
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 pl-9 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent-500/40 focus:border-accent-500 transition-colors"
              />
              <Lock size={14} className="absolute left-3 top-3 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Confirm New Password</label>
            <div className="relative">
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 pl-9 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent-500/40 focus:border-accent-500 transition-colors"
              />
              <Lock size={14} className="absolute left-3 top-3 text-gray-400" />
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2 text-xs">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
              isSubmitting ? 'bg-gray-200 text-gray-400 cursor-wait' : 'bg-gray-900 text-white hover:bg-accent-600'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Updating...</span>
              </>
            ) : (
              <span>Update Password</span>
            )}
          </button>
        </form>
      )}
    </CenteredCardShell>
  );
};

export default SetNewPasswordScreen;
