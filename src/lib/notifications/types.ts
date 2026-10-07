// ============================================================
// NOTIFICATION & ALERT TYPES
// Defines in-app, email, web-push, and deadline alert models.
// ============================================================

export type NotificationType =
  | "new_match"
  | "deadline"
  | "change"
  | "scout"
  | "application";

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  link_url?: string | null;
  is_read: boolean;
  metadata?: {
    opportunity_id?: string;
    application_id?: string;
    saved_search_id?: string;
    urgency?: "critical" | "high" | "normal";
    days_remaining?: number;
    match_tier?: "exceptional" | "strong" | "possible";
  } | null;
  created_at: string;
}

export interface NotificationPreference {
  user_id: string;
  in_app_enabled: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
  frequency: "instant" | "daily" | "weekly";
  timezone: string;
  digest_day: number;
  digest_time: string;
  quiet_hours_start?: string | null; // e.g. "22:00"
  quiet_hours_end?: string | null;   // e.g. "08:00"
  deadline_reminder_days: number[];  // e.g. [7, 3, 1]
  updated_at: string;
}

export interface PushSubscriptionRecord {
  id: string;
  user_id: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  user_agent?: string | null;
  created_at: string;
}

export interface EmailDispatchResult {
  // "sent" means provider acceptance, never proof of inbox delivery.
  sent: boolean;
  uncertain?: boolean;
  provider: "brevo" | "configured_but_disabled";
  messageId?: string;
  warning?: string;
}
