import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface PromptModalProps {
  open: boolean;
  title: string;
  label: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  required?: boolean;
  multiline?: boolean;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

/**
 * In-app replacement for window.prompt() — browsers render prompt/confirm/alert
 * as unstyled native dialogs that break out of the app's UI entirely.
 */
const PromptModal: React.FC<PromptModalProps> = ({
  open, title, label, placeholder, confirmLabel = 'OK', cancelLabel = 'Cancel',
  required = false, multiline = false, onConfirm, onCancel,
}) => {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setValue('');
      setTimeout(() => (multiline ? textareaRef.current : inputRef.current)?.focus(), 0);
    }
  }, [open, multiline]);

  if (!open) return null;

  const handleConfirm = () => {
    if (required && !value.trim()) return;
    onConfirm(value.trim());
  };

  // Rendered via a portal to document.body — inline rendering would make this
  // a sibling of whatever page content wraps it (e.g. a `space-y-*` utility),
  // which applies a margin to fixed-position elements too and pushes the
  // backdrop away from the true viewport edge, leaving a gap uncovered.
  return createPortal(
    <div className="ui-modal-backdrop" onClick={onCancel}>
      <div className="neu-card w-full max-w-md p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-bold text-base-800">{title}</h3>

        <div>
          <label className="block text-[10px] font-semibold text-base-500 mb-1.5 uppercase tracking-wider">
            {label} {required && <span className="text-danger-500">*</span>}
          </label>
          {multiline ? (
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="neu-input w-full resize-none"
              rows={3}
              placeholder={placeholder}
              onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); }}
            />
          ) : (
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="neu-input w-full"
              placeholder={placeholder}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirm();
                if (e.key === 'Escape') onCancel();
              }}
            />
          )}
        </div>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onCancel} className="neu-btn px-5">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={required && !value.trim()}
            className="neu-btn-primary px-5 disabled:opacity-50"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PromptModal;
