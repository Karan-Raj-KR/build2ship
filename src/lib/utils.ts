// Simple className merge utility
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

// Format a deadline for display
export function formatDeadline(deadline: string | null, timezoneKnown?: boolean): string {
  if (!deadline) return "No deadline listed";
  const d = new Date(deadline);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const days = Math.ceil(diff / 86400000);

  const base = d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const suffix = timezoneKnown === false ? " (timezone unconfirmed)" : "";

  if (diff < 0) return `Closed ${base}${suffix}`;
  if (days === 0) return `Today${suffix}`;
  if (days === 1) return `Tomorrow${suffix}`;
  if (days <= 7) return `${days} days — ${base}${suffix}`;
  return base + suffix;
}

export function isDeadlinePast(deadline: string | null): boolean {
  if (!deadline) return false;
  return new Date(deadline) < new Date();
}

export function daysUntilDeadline(deadline: string | null): number | null {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function categoryLabel(cat: string | null): string {
  const map: Record<string, string> = {
    hackathon: "Hackathon",
    fellowship: "Fellowship",
    scholarship: "Scholarship",
    internship: "Internship",
    grant: "Grant",
    other: "Other",
  };
  return cat ? (map[cat] ?? cat) : "Unknown";
}

export function stageLabel(stage: string): string {
  const map: Record<string, string> = {
    saved: "Saved",
    preparing: "Preparing",
    submitted: "Submitted",
    selected: "Selected",
    rejected: "Rejected",
    withdrawn: "Withdrawn",
  };
  return map[stage] ?? stage;
}

export function stageColor(stage: string): string {
  const map: Record<string, string> = {
    saved: "text-blue-600 bg-blue-50",
    preparing: "text-yellow-700 bg-yellow-50",
    submitted: "text-purple-700 bg-purple-50",
    selected: "text-green-700 bg-green-50",
    rejected: "text-red-700 bg-red-50",
    withdrawn: "text-gray-600 bg-gray-100",
  };
  return map[stage] ?? "text-gray-600 bg-gray-100";
}

export function fundingKindLabel(kind: string | null): string {
  const map: Record<string, string> = {
    prize: "Prize",
    stipend: "Stipend / Award",
    reimbursement: "Reimbursement",
    cost: "Has Participation Cost",
    none: "No Funding",
    unknown: "Funding Unknown",
  };
  return kind ? (map[kind] ?? kind) : "Unknown";
}

export function participationModeLabel(mode: string | null): string {
  const map: Record<string, string> = {
    remote: "Remote",
    "in-person": "In-person",
    hybrid: "Hybrid",
  };
  return mode ? (map[mode] ?? mode) : "Unknown";
}

export function truncate(str: string | null, len: number): string {
  if (!str) return "";
  return str.length > len ? str.slice(0, len) + "…" : str;
}
