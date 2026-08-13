import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
  maxWidth?: string;
  children: React.ReactNode;
}

/**
 * Shared luxury dialog shell for every modal in the app — backdrop blur, rounded-3xl container,
 * gold hairline borders, elegant header with icon badge, and a scrollable body.
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  maxWidth = 'max-w-lg',
  children,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop scrim */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-accent-950/40 backdrop-blur-md transition-opacity"
      />

      <div
        className={`relative w-full ${maxWidth} glass-strong rounded-3xl shadow-popover border border-gold-500/30 overflow-hidden z-10 my-6 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 sm:px-7 sm:py-5 border-b border-gray-200/80 bg-white/40 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            {icon && (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-50 to-accent-50 text-accent-800 border border-gold-500/20 flex items-center justify-center shrink-0 shadow-sm">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate font-display tracking-wide">{title}</h2>
              {subtitle && <p className="text-xs text-gray-500 truncate font-sans">{subtitle}</p>}
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-800 transition-colors shrink-0"
          >
            <X size={17} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
