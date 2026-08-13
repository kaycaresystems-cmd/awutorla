import React from 'react';

interface CenteredCardShellProps {
  children: React.ReactNode;
  maxWidth?: string;
}

/**
 * Shared full-page shell for standalone screens (auth, password reset, the
 * error-boundary fallback) — a centered white card on a neutral page
 * background. Each screen supplies its own heading and content as children.
 */
export const CenteredCardShell: React.FC<CenteredCardShellProps> = ({
  children,
  maxWidth = 'max-w-md',
}) => (
  <div className="min-h-screen bg-white font-sans flex items-center justify-center p-4 sm:p-6">
    <div className={`w-full ${maxWidth} glass-strong overflow-hidden`}>
      <div className="p-8">{children}</div>
    </div>
  </div>
);

export default CenteredCardShell;
