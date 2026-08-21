import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

export type AlertTone = 'error' | 'success' | 'warning' | 'info';

const toneConfig: Record<
  AlertTone,
  { icon: typeof AlertCircle; wrap: string; iconWrap: string; title: string; body: string }
> = {
  error: {
    icon: AlertCircle,
    wrap: 'ui-alert ui-alert--error',
    iconWrap: 'ui-alert__icon ui-alert__icon--error',
    title: 'text-base-800',
    body: 'text-base-600',
  },
  success: {
    icon: CheckCircle2,
    wrap: 'ui-alert ui-alert--success',
    iconWrap: 'ui-alert__icon ui-alert__icon--success',
    title: 'text-base-800',
    body: 'text-base-600',
  },
  warning: {
    icon: AlertTriangle,
    wrap: 'ui-alert ui-alert--warning',
    iconWrap: 'ui-alert__icon ui-alert__icon--warning',
    title: 'text-base-800',
    body: 'text-base-600',
  },
  info: {
    icon: Info,
    wrap: 'ui-alert ui-alert--info',
    iconWrap: 'ui-alert__icon ui-alert__icon--info',
    title: 'text-base-800',
    body: 'text-base-600',
  },
};

type InlineAlertProps = {
  tone?: AlertTone;
  title: string;
  description?: string;
  onDismiss?: () => void;
  className?: string;
};

/** Inline notice for forms — clinical, product-grade */
const InlineAlert: React.FC<InlineAlertProps> = ({
  tone = 'error',
  title,
  description,
  onDismiss,
  className = '',
}) => {
  const cfg = toneConfig[tone];
  const Icon = cfg.icon;

  return (
    <div className={`${cfg.wrap} ${className}`} role="alert">
      <span className={cfg.iconWrap} aria-hidden>
        <Icon className="w-4 h-4" strokeWidth={2.25} />
      </span>
      <div className="ui-alert__content min-w-0">
        <p className={`ui-alert__title ${cfg.title}`}>{title}</p>
        {description ? <p className={`ui-alert__desc ${cfg.body}`}>{description}</p> : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="ui-alert__dismiss"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      ) : null}
    </div>
  );
};

export default InlineAlert;
