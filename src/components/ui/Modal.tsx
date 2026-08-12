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
 * Shared dialog shell for every modal in the app — backdrop, sizing, header
 * (icon + title/subtitle + close button), and a scrollable body. Each modal
 * supplies its own body content (including its own footer/actions, since
 * those live inside a <form> for submit-on-Enter behavior).
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
      <div onClick={onClose} className="fixed inset-0 bg-gray-900/50" />

      <div
        className={`relative w-full ${maxWidth} bg-white rounded-xl shadow-popover overflow-hidden z-10 my-6 border border-gray-200 flex flex-col max-h-[90vh]`}
      >
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div className="w-9 h-9 rounded-lg bg-accent-50 text-accent-600 flex items-center justify-center shrink-0">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-gray-900 truncate">{title}</h2>
              {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
