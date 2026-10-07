import { NotificationItem } from "./types";

export async function fetchUserNotifications(userId: string): Promise<NotificationItem[]> {
  const { createClient } = await import("@/lib/db/server");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error("Failed to fetch notifications");
  return data || [];
}

export async function createUserNotification(
  userId: string,
  payload: Omit<NotificationItem, "id" | "created_at" | "is_read" | "user_id">
): Promise<NotificationItem> {
  const { createClient } = await import("@/lib/db/server");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_notifications")
    .insert({
      user_id: userId,
      title: payload.title,
      message: payload.message,
      type: payload.type,
      link_url: payload.link_url || null,
      metadata: payload.metadata || {},
      is_read: false,
    })
    .select()
    .maybeSingle();

  if (error || !data) throw new Error("Failed to create notification");
  return data;
}

export async function markNotificationRead(userId: string, notificationId: string): Promise<void> {
  const { createClient } = await import("@/lib/db/server");
  const supabase = await createClient();
  const { error } = await supabase
    .from("user_notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", userId);

  if (error) throw new Error("Failed to mark notification as read");
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { createClient } = await import("@/lib/db/server");
  const supabase = await createClient();
  const { error } = await supabase
    .from("user_notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) throw new Error("Failed to mark notifications as read");
}
