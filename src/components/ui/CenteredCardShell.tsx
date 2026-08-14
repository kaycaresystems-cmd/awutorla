import React from 'react';

interface CenteredCardShellProps {
  children: React.ReactNode;
  maxWidth?: string;
}

/**
 * Shared full-page shell for standalone screens (auth, password reset, the
 * error-boundary fallback) — a centered flat card on a cool grey backdrop.
 */
export const CenteredCardShell: React.FC<CenteredCardShellProps> = ({
  children,
  maxWidth = 'max-w-md',
}) => (
  <div className="min-h-screen bg-gray-100 font-sans flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
    <div className={`w-full ${maxWidth} glass-strong rounded-3xl shadow-luxury overflow-hidden relative z-10 border border-gold-500/20`}>
      <div className="p-8 sm:p-10">{children}</div>
    </div>
  </div>
);

export default CenteredCardShell;
