import React from 'react';
import { AlertCircle, RotateCw } from 'lucide-react';

type LoadErrorProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
};

/**
 * Section-level "this failed to load" state — same neu-pressed shell as the
 * app's empty states, but tinted with the same danger palette InlineAlert
 * and toasts use, so a failed load never looks like an empty list.
 */
const LoadError: React.FC<LoadErrorProps> = ({
  title = 'Couldn’t load this',
  description = 'Something went wrong. Please try again.',
  onRetry,
  retrying = false,
  className = '',
}) => (
  <div className={`neu-pressed rounded-2xl text-center py-14 px-6 ${className}`} role="alert">
    <div className="w-14 h-14 rounded-full bg-danger-100 flex items-center justify-center mx-auto mb-3">
      <AlertCircle className="w-7 h-7 text-danger-600" strokeWidth={2.25} />
    </div>
    <p className="text-base-800 font-semibold text-sm">{title}</p>
    <p className="text-base-500 text-xs mt-1.5 max-w-xs mx-auto leading-relaxed">{description}</p>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        className="neu-btn mt-4 inline-flex items-center gap-2 text-xs py-2 px-4 disabled:opacity-50"
      >
        <RotateCw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
        {retrying ? 'Retrying...' : 'Retry'}
      </button>
    )}
  </div>
);

export default LoadError;
