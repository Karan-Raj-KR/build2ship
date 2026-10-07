export type DeadlineStatus =
  | 'closes_today'
  | 'urgent'
  | 'upcoming'
  | 'open'
  | 'rolling'
  | 'deadline_unknown'
  | 'closed';

export type FreshnessStatus =
  | 'verified_recent'
  | 'stale_check_needed'
  | 'source_changed'
  | 'unverified';

export interface DeadlineAnalysis {
  status: DeadlineStatus;
  label: string;
  daysRemaining: number | null;
  isApplyable: boolean;
  warning?: string;
}

export interface FreshnessAnalysis {
  status: FreshnessStatus;
  label: string;
  isStale: boolean;
  verifiedAgoDays: number | null;
  description: string;
}

/**
 * Calculates deadline intelligence.
 * CRITICAL RULE: Unknown deadline is NEVER interpreted as open.
 */
export function analyzeDeadline(deadlineStr?: string | null): DeadlineAnalysis {
  if (!deadlineStr || deadlineStr.trim() === '' || deadlineStr.toLowerCase() === 'unknown') {
    return {
      status: 'deadline_unknown',
      label: 'Deadline Unknown',
      daysRemaining: null,
      isApplyable: false,
      warning: 'No verifiable deadline extracted from official source. Must be verified before applying.',
    };
  }

  const dLower = deadlineStr.toLowerCase();
  if (dLower.includes('rolling') || dLower.includes('continuous') || dLower.includes('anytime')) {
    return {
      status: 'rolling',
      label: 'Rolling Applications',
      daysRemaining: null,
      isApplyable: true,
    };
  }

  const deadlineDate = new Date(deadlineStr);
  if (isNaN(deadlineDate.getTime())) {
    return {
      status: 'deadline_unknown',
      label: `Unverified (${deadlineStr})`,
      daysRemaining: null,
      isApplyable: false,
      warning: 'Deadline format could not be verified automatically.',
    };
  }

  const now = new Date();
  const diffTime = deadlineDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffTime <= 0) {
    return {
      status: 'closed',
      label: `Closed (${Math.abs(diffDays)}d ago)`,
      daysRemaining: diffDays,
      isApplyable: false,
      warning: 'Applications have officially closed for this edition.',
    };
  }

  if (diffDays === 0) {
    return {
      status: 'closes_today',
      label: 'Closes Today!',
      daysRemaining: 0,
      isApplyable: true,
      warning: 'Final hours to submit application.',
    };
  }

  if (diffDays <= 3) {
    return {
      status: 'urgent',
      label: `${diffDays} days left`,
      daysRemaining: diffDays,
      isApplyable: true,
      warning: 'Urgent deadline approaching.',
    };
  }

  if (diffDays <= 14) {
    return {
      status: 'upcoming',
      label: `${diffDays} days left`,
      daysRemaining: diffDays,
      isApplyable: true,
    };
  }

  return {
    status: 'open',
    label: `${diffDays} days left`,
    daysRemaining: diffDays,
    isApplyable: true,
  };
}

/**
 * Calculates freshness semantics for an opportunity
 */
export function analyzeFreshness(
  lastVerifiedAt?: string | null,
  sourceChangedAt?: string | null
): FreshnessAnalysis {
  if (!lastVerifiedAt) {
    return {
      status: 'unverified',
      label: 'Unverified',
      isStale: true,
      verifiedAgoDays: null,
      description: 'Record has not undergone automated official source verification.',
    };
  }

  const verifiedDate = new Date(lastVerifiedAt);
  if (isNaN(verifiedDate.getTime()) || verifiedDate.getTime() > Date.now()) {
    return {
      status: 'unverified',
      label: 'Verification Pending',
      isStale: true,
      verifiedAgoDays: null,
      description: 'Invalid verification timestamp.',
    };
  }

  const now = new Date();
  const diffTime = now.getTime() - verifiedDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (sourceChangedAt) {
    const changedDate = new Date(sourceChangedAt);
    if (!isNaN(changedDate.getTime()) && changedDate.getTime() > verifiedDate.getTime()) {
      return {
        status: 'source_changed',
        label: 'Source Updated',
        isStale: true,
        verifiedAgoDays: diffDays,
        description: 'Official page content changed since last verification check.',
      };
    }
  }

  if (diffDays <= 7) {
    return {
      status: 'verified_recent',
      label: diffDays === 0 ? 'Verified today' : `Verified ${diffDays}d ago`,
      isStale: false,
      verifiedAgoDays: diffDays,
      description: 'Official criteria and deadline checked within the last 7 days.',
    };
  }

  return {
    status: 'stale_check_needed',
    label: `Checked ${diffDays}d ago`,
    isStale: true,
    verifiedAgoDays: diffDays,
    description: 'Criteria may have changed. A re-verification check is advised.',
  };
}
