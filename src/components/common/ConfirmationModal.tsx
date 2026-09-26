import React, { useState } from 'react';
import { AlertTriangle, AlertCircle, CheckCircle2, X } from 'lucide-react';

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
  requireReason?: boolean;
  reasonLabel?: string;
  reasonOptions?: string[];
  onConfirm: (reason?: string, note?: string) => void | Promise<void>;
  onClose: () => void;
  children?: React.ReactNode;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  isLoading = false,
  requireReason = false,
  reasonLabel = 'Select Reason:',
  reasonOptions,
  onConfirm,
  onClose,
  children,
}) => {
  const [selectedReason, setSelectedReason] = useState(
    reasonOptions && reasonOptions.length > 0 ? reasonOptions[0] : ''
  );
  const [note, setNote] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(selectedReason, note);
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <AlertCircle className="w-6 h-6 text-rose-400" />,
          button: 'bg-rose-600 hover:bg-rose-500 shadow-rose-950',
          badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          border: 'border-rose-500/40',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-amber-400" />,
          button: 'bg-amber-600 hover:bg-amber-500 shadow-amber-950',
          badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          border: 'border-amber-500/40',
        };
      default:
        return {
          icon: <CheckCircle2 className="w-6 h-6 text-emerald-400" />,
          button: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950',
          badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          border: 'border-emerald-500/40',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className={`w-full max-w-md rounded-2xl bg-slate-900 border ${styles.border} p-6 shadow-2xl space-y-4`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-xl shrink-0 ${styles.badge} border`}>
              {styles.icon}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{title}</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {description}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1 rounded text-slate-400 hover:text-white transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {children}

        {requireReason && reasonOptions && (
          <div className="space-y-3 pt-2 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">
                {reasonLabel}
              </label>
              <select
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-emerald-500"
              >
                {reasonOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">
                Optional Explanatory Note:
              </label>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add additional context or audit explanation..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-emerald-500 placeholder-slate-500"
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-md transition active:scale-95 flex items-center gap-1.5 ${styles.button}`}
          >
            {isLoading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>{confirmLabel}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
