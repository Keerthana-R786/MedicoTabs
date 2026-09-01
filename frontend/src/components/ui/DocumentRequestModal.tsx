import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface DocumentRequestModalProps {
  open: boolean;
  onConfirm: (items: string[], note: string) => void;
  onCancel: () => void;
}

/**
 * Lets a specialist name the specific documents they need from the primary
 * doctor — separate from PromptModal, which only takes one plain string.
 */
const DocumentRequestModal: React.FC<DocumentRequestModalProps> = ({ open, onConfirm, onCancel }) => {
  const [itemsText, setItemsText] = useState('');
  const [note, setNote] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setItemsText('');
      setNote('');
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  }, [open]);

  if (!open) return null;

  const items = itemsText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const handleConfirm = () => {
    if (items.length === 0) return;
    onConfirm(items, note.trim());
  };

  return createPortal(
    <div className="ui-modal-backdrop" onClick={onCancel}>
      <div className="neu-card w-full max-w-md p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-bold text-base-800">Request Documents</h3>

        <div>
          <label className="block text-[10px] font-semibold text-base-500 mb-1.5 uppercase tracking-wider">
            Documents needed <span className="text-danger-500">*</span>
          </label>
          <textarea
            ref={textareaRef}
            value={itemsText}
            onChange={(e) => setItemsText(e.target.value)}
            className="neu-input w-full resize-none"
            rows={4}
            placeholder={'One item per line, e.g.\nRecent bloodwork\nPrior imaging results\nCurrent medication list'}
          />
          <p className="text-[10px] text-base-400 mt-1">One document per line</p>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-base-500 mb-1.5 uppercase tracking-wider">
            Note to primary doctor (optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="neu-input w-full resize-none"
            rows={2}
            placeholder="Any context for this request..."
          />
        </div>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onCancel} className="neu-btn px-5">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={items.length === 0}
            className="neu-btn-primary px-5 disabled:opacity-50"
          >
            Send Request
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default DocumentRequestModal;
