import React from "react";
import {
  Calendar,
  ClipboardList,
  Search,
  FileText,
  AlertCircle,
  FolderOpen,
  Inbox,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  calendar: Calendar,
  clipboard: ClipboardList,
  search: Search,
  file: FileText,
  alert: AlertCircle,
  folder: FolderOpen,
  inbox: Inbox,
  sparkles: Sparkles,
};

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon = "inbox", title, description, action }: EmptyStateProps) {
  const Icon = iconMap[icon] ?? Inbox;
  return (
    <div className="empty-state p-8 text-center bg-white border-2 border-dashed border-[var(--line)] rounded-2xl my-4">
      <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-[var(--canvas)] border-2 border-[var(--line)] flex items-center justify-center text-[var(--muted)] shadow-[0_2px_0_#E3E7EA]">
        <Icon size={26} strokeWidth={2.2} />
      </div>
      <h3 className="text-lg font-black text-[var(--ink)] mb-1.5">{title}</h3>
      {description && (
        <p className="text-sm font-semibold text-[var(--muted)] max-w-sm mx-auto mb-5 leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
