/** Map raw/API errors into calm, product-quality copy */

const KNOWN: Record<string, { title: string; description: string }> = {
  'Invalid credentials': {
    title: 'Sign-in didn’t go through',
    description: 'Check your email and password, then try again. Demo accounts are listed below.',
  },
  'An account with this email already exists': {
    title: 'That email is already registered',
    description: 'Try signing in instead, or use a different work email to create a new account.',
  },
  'Not authenticated': {
    title: 'Your session expired',
    description: 'Sign in again to continue where you left off.',
  },
  'Patient not found': {
    title: 'Patient record unavailable',
    description: 'This patient may have been removed or you may not have access.',
  },
  'Referral not found': {
    title: 'Referral not found',
    description: 'It may have been updated elsewhere. Refresh the list and try again.',
  },
  'Tracker not found': {
    title: 'Tracking data unavailable',
    description: 'We couldn’t load this referral’s journey. Refresh and retry in a moment.',
  },
  'Passwords do not match': {
    title: 'Passwords don’t match',
    description: 'Re-enter both fields so they match exactly, then continue.',
  },
  'Password must be at least 6 characters': {
    title: 'Password is too short',
    description: 'Use at least 6 characters for a more secure account.',
  },
  'Login failed': {
    title: 'Unable to sign in',
    description: 'Something interrupted the request. Check your connection and try again.',
  },
  'Registration failed': {
    title: 'Account couldn’t be created',
    description: 'Review the form details and try again. If it keeps failing, contact your admin.',
  },
  'No patient record matches those details': {
    title: 'We couldn’t verify those details',
    description: 'Double-check your Referral ID and date of birth, then try again.',
  },
  'Referral ID and date of birth are required': {
    title: 'Missing details',
    description: 'Enter both your Referral ID and date of birth to continue.',
  },
};

export function formatError(raw?: string | null): { title: string; description: string } {
  const message = (raw || '').trim();
  if (message && KNOWN[message]) return KNOWN[message];

  if (!message) {
    return {
      title: 'Something went wrong',
      description: 'We hit an unexpected issue. Please try again in a moment.',
    };
  }

  // Soften "Error: foo" / technical dumps into product tone
  const cleaned = message.replace(/^Error:\s*/i, '').trim();
  return {
    title: 'We couldn’t complete that',
    description: cleaned.endsWith('.') ? cleaned : `${cleaned}.`,
  };
}

export function formatSuccess(kind: string, detail?: string): { title: string; description?: string } {
  switch (kind) {
    case 'patient-created':
      return {
        title: 'Patient record created',
        description: detail ? `Referral ID ${detail} is ready in the chart.` : 'The chart is ready to use.',
      };
    case 'referral-created':
      return {
        title: 'Referral sent into tracking',
        description: detail || 'The care handoff is live on the flight board.',
      };
    case 'reply-sent':
      return {
        title: 'Reply delivered',
        description: 'Your message is in the care team thread.',
      };
    case 'approval-submitted':
      return {
        title: 'Decision recorded',
        description: 'The workflow will continue with your response.',
      };
    case 'referral-accepted':
      return {
        title: 'Referral accepted',
        description: 'The patient is now on your incoming caseload.',
      };
    case 'referral-declined':
      return {
        title: 'Referral declined',
        description: 'The referring team has been notified with your reason.',
      };
    default:
      return { title: kind, description: detail };
  }
}
