// ============================================================
// API: GET & PATCH /api/notifications
// Retrieves user in-app notifications and handles read states.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { fetchUserNotifications, markNotificationRead, markAllNotificationsRead } from "@/lib/notifications/inbox";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const notifications = await fetchUserNotifications(auth.userId!);
    const unreadCount = notifications.filter((n) => !n.is_read).length;

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { notificationId, markAll } = body;

    if (markAll) {
      await markAllNotificationsRead(auth.userId!);
      return NextResponse.json({ success: true, message: "All notifications marked as read" });
    }

    if (!notificationId) {
      return NextResponse.json({ error: "notificationId is required" }, { status: 400 });
    }

    await markNotificationRead(auth.userId!, notificationId);
    return NextResponse.json({ success: true, notificationId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update notification" },
      { status: 500 }
    );
  }
}
