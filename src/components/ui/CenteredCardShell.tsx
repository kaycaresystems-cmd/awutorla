import React from 'react';

interface CenteredCardShellProps {
  children: React.ReactNode;
  maxWidth?: string;
}

/**
 * Shared luxury full-page shell for standalone screens (auth, password reset, the
 * error-boundary fallback) — a centered frosted glass card with ambient silk lighting.
 */
export const CenteredCardShell: React.FC<CenteredCardShellProps> = ({
  children,
  maxWidth = 'max-w-md',
}) => (
  <div className="min-h-screen bg-[#FAF8F5] font-sans flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
    {/* Subtle Luxury Ambient Background Glows */}
    <div
      aria-hidden="true"
      className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-tr from-accent-200/25 via-gold-100/20 to-transparent rounded-full blur-3xl pointer-events-none"
    />
    <div
      aria-hidden="true"
      className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-gold-200/20 rounded-full blur-2xl pointer-events-none"
    />

    <div className={`w-full ${maxWidth} glass-strong rounded-3xl shadow-luxury overflow-hidden relative z-10 border border-gold-500/20`}>
      <div className="p-8 sm:p-10">{children}</div>
    </div>
  </div>
);

export default CenteredCardShell;
