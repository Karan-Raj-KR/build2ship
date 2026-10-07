// ============================================================
// OPPORTUNITY STATUS RESOLVER — single source of truth for
// opportunity availability. Used by cards, detail pages,
// filters, and workspace views.
// ============================================================
import type { SourceStatus } from "@/types/database";

export type AvailabilityStatus =
  | "open"
  | "closing_soon"
  | "closed"
  | "upcoming"
  | "unknown";

export interface ResolvedStatus {
  availability: AvailabilityStatus;
  label: string;
  color: string;
  isClosed: boolean;
}

/**
 * Resolve a single canonical availability status from an opportunity's
 * deadline and source_status. Authoritative closure or expired deadline
 * always wins over source_status="live".
 */
export function resolveOpportunityStatus(
  deadline: string | null,
  sourceStatus: SourceStatus,
  _timezoneKnown: boolean = true,
): ResolvedStatus {
  const now = new Date();
  const deadlineDate = deadline ? new Date(deadline) : null;
  const isPast = deadlineDate !== null && deadlineDate < now;
  const daysLeft =
    deadlineDate !== null
      ? Math.ceil((deadlineDate.getTime() - now.getTime()) / 86_400_000)
      : null;

  // Authoritative closed: explicit source_status or expired deadline
  if (sourceStatus === "closed" || isPast) {
    return {
      availability: "closed",
      label: "Closed",
      color: "text-gray-400",
      isClosed: true,
    };
  }

  // source_status = "live" + valid future deadline
  if (sourceStatus === "live" && deadlineDate) {
    if (daysLeft !== null && daysLeft <= 7) {
      return {
        availability: "closing_soon",
        label: `${daysLeft}d left`,
        color: "text-orange-600",
        isClosed: false,
      };
    }
    return {
      availability: "open",
      label: "Open",
      color: "text-green-600",
      isClosed: false,
    };
  }

  // source_status = "live" but no deadline — treat as open with caveat
  if (sourceStatus === "live" && !deadlineDate) {
    return {
      availability: "open",
      label: "Open (no deadline)",
      color: "text-green-600",
      isClosed: false,
    };
  }

  // source_status = "unknown" + future deadline — we think it might be open
  if (sourceStatus === "unknown" && deadlineDate) {
    return {
      availability: "upcoming",
      label: "Check status",
      color: "text-gray-500",
      isClosed: false,
    };
  }

  // No deadline, no status info
  return {
    availability: "unknown",
    label: "Status unknown",
    color: "text-gray-400",
    isClosed: false,
  };
}

/**
 * Returns true if the opportunity should be hidden when "Show closed" is unchecked.
 */
export function isClosedOrExpired(
  deadline: string | null,
  sourceStatus: SourceStatus,
): boolean {
  const status = resolveOpportunityStatus(deadline, sourceStatus);
  return status.isClosed;
}

/**
 * Format a deadline for display with timezone caveat.
 */
export function formatDeadlineDisplay(
  deadline: string | null,
  timezoneKnown: boolean = true,
): string {
  if (!deadline) return "No deadline listed";
  const d = new Date(deadline);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const days = Math.ceil(diff / 86_400_000);

  const base = d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const suffix = !timezoneKnown ? " (timezone unconfirmed)" : "";

  if (diff < 0) return `Closed ${base}${suffix}`;
  if (days === 0) return `Today${suffix}`;
  if (days === 1) return `Tomorrow${suffix}`;
  if (days <= 7) return `${days} days — ${base}${suffix}`;
  return base + suffix;
}
