import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { fetchUserNotifications, createUserNotification, markNotificationRead, markAllNotificationsRead } from "@/lib/notifications/inbox";
import { checkUpcomingDeadlines } from "@/lib/notifications/deadlines";
import { sendEmail, renderNewMatchEmail, renderDeadlineWarningEmail } from "@/lib/notifications/email";
import { savePushSubscription, removePushSubscription, dispatchWebPush } from "@/lib/notifications/webpush";
import { GET, PATCH } from "@/app/api/notifications/route";
import { GET as pushStatus, POST } from "@/app/api/notifications/push/route";
import { Application } from "@/types/database";
import { NotificationItem } from "@/lib/notifications/types";

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), from: vi.fn(), requireAuth: vi.fn() }));
vi.mock("@/lib/db/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/api-auth", () => ({ requireAuth: mocks.requireAuth }));

const testUserId = "user-notif-test-123";
const notification: NotificationItem = {
  id: "notification-1",
  user_id: testUserId,
  title: "Test Match Alert",
  message: "A new fellowship was matched.",
  type: "new_match",
  is_read: false,
  created_at: "2026-09-16T12:00:00.000Z",
};
const subscription = {
  endpoint: "https://push.example.com/subscriptions/device-1",
  keys: { p256dh: "test-p256", auth: "test-auth" },
};

function queryResult(data: unknown, error: unknown = null) {
  const result = Promise.resolve({ data, error });
  const query = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
    then: result.then.bind(result),
  };
  mocks.from.mockReturnValueOnce(query);
  return query;
}

function request(body: unknown, method = "POST") {
  return new NextRequest("http://localhost/api/notifications", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.createClient.mockResolvedValue({ from: mocks.from });
  mocks.requireAuth.mockResolvedValue({ userId: testUserId, error: null });
  vi.stubEnv("BREVO_API_KEY", "");
  vi.stubEnv("EMAIL_FROM", "");
  vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "");
  vi.stubEnv("VAPID_PRIVATE_KEY", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("In-App Notification Inbox", () => {
  it("returns only database notifications and scopes reads to the user", async () => {
    const query = queryResult([notification]);
    expect(await fetchUserNotifications(testUserId)).toEqual([notification]);
    expect(mocks.from).toHaveBeenCalledWith("user_notifications");
    expect(query.eq).toHaveBeenCalledWith("user_id", testUserId);
    expect(query.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(query.limit).toHaveBeenCalledWith(50);
  });

  it.each([{ data: [] }, { data: null }])("returns an empty inbox for empty database data $data", async ({ data }) => {
    queryResult(data);
    expect(await fetchUserNotifications(testUserId)).toEqual([]);
  });

  it("creates a notification only through the database", async () => {
    const query = queryResult(notification);
    const payload = { title: notification.title, message: notification.message, type: notification.type };
    expect(await createUserNotification(testUserId, payload)).toEqual(notification);
    expect(query.insert).toHaveBeenCalledWith({ ...payload, user_id: testUserId, is_read: false, link_url: null, metadata: {} });
  });

  it("scopes single and bulk read updates to the authenticated user", async () => {
    const single = queryResult(null);
    const bulk = queryResult(null);
    await markNotificationRead(testUserId, notification.id);
    await markAllNotificationsRead(testUserId);
    expect(single.update).toHaveBeenCalledWith({ is_read: true });
    expect(single.eq.mock.calls).toEqual([["id", notification.id], ["user_id", testUserId]]);
    expect(bulk.update).toHaveBeenCalledWith({ is_read: true });
    expect(bulk.eq.mock.calls).toEqual([["user_id", testUserId], ["is_read", false]]);
  });

  it.each(["PGRST205", "42P01", "42501"])("rejects database failures (%s) without local fallback", async (code) => {
    const error = { code, message: "Database unavailable" };
    queryResult(null, error);
    await expect(fetchUserNotifications(testUserId)).rejects.toThrow("Failed to fetch notifications");
    queryResult(null, error);
    await expect(createUserNotification(testUserId, notification)).rejects.toThrow("Failed to create notification");
    queryResult(null, error);
    await expect(markNotificationRead(testUserId, notification.id)).rejects.toThrow("Failed to mark notification");
    queryResult(null, error);
    await expect(markAllNotificationsRead(testUserId)).rejects.toThrow("Failed to mark notifications");
    queryResult([]);
    expect(await fetchUserNotifications(testUserId)).toEqual([]);
  });

  it("rejects an insert that returns no persisted row", async () => {
    queryResult(null);
    await expect(createUserNotification(testUserId, notification)).rejects.toThrow("Failed to create notification");
  });

  it("propagates client failures for reads and writes", async () => {
    mocks.createClient.mockRejectedValue(new Error("Connection failed"));
    await expect(fetchUserNotifications(testUserId)).rejects.toThrow("Connection failed");
    await expect(createUserNotification(testUserId, notification)).rejects.toThrow("Connection failed");
    await expect(markNotificationRead(testUserId, notification.id)).rejects.toThrow("Connection failed");
    await expect(markAllNotificationsRead(testUserId)).rejects.toThrow("Connection failed");
  });
});

describe("Notification API", () => {
  it("returns an empty database inbox without seeded notifications", async () => {
    queryResult([]);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ notifications: [], unreadCount: 0 });
  });

  it("returns database notifications and the unread count", async () => {
    queryResult([notification]);
    expect(await (await GET()).json()).toEqual({ notifications: [notification], unreadCount: 1 });
  });

  it("does not disguise a database read failure as an empty or seeded inbox", async () => {
    queryResult(null, { code: "PGRST205" });
    const response = await GET();
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to fetch notifications" });
  });

  it.each([{ notificationId: notification.id }, { markAll: true }])("returns errors rather than fake read-update success for %j", async (body) => {
    queryResult(null, { code: "42501" });
    const response = await PATCH(request(body, "PATCH"));
    expect(response.status).toBe(500);
    expect(await response.json()).not.toHaveProperty("success");
  });
});

describe("Deadline Alerts Engine", () => {
  function applications(): Application[] {
    return ["preparing", "submitted", "saved"].map((stage, index) => ({
      id: `application-${index}`,
      user_id: testUserId,
      opportunity_id: `opportunity-${index}`,
      stage: stage as Application["stage"],
      next_action: "Finish statement of purpose",
      target_date: new Date(Date.now() + (index === 2 ? 15 : 7) * 86400000).toISOString(),
      notes: null,
      submitted_at: null,
      sort_order: index,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  }

  it("detects seven-day deadlines, skips completed applications, and deduplicates database alerts", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-16T12:00:00Z"));
    const alert = { ...notification, type: "deadline", metadata: { application_id: "application-0", days_remaining: 7 } };
    queryResult([]);
    const insert = queryResult(alert);
    expect(await checkUpcomingDeadlines(testUserId, null, "Student", applications())).toEqual({ evaluatedCount: 3, skippedCount: 1, alertsGenerated: 1 });
    expect(insert.insert).toHaveBeenCalledWith(expect.objectContaining({ type: "deadline", metadata: expect.objectContaining(alert.metadata) }));
    queryResult([alert]);
    expect((await checkUpcomingDeadlines(testUserId, null, "Student", applications())).alertsGenerated).toBe(0);
    expect(mocks.from).toHaveBeenCalledTimes(3);
  });

  it("does not report generated alerts when persistence fails", async () => {
    queryResult([]);
    queryResult(null, { code: "42501" });
    await expect(checkUpcomingDeadlines(testUserId, null, "Student", applications())).rejects.toThrow("Failed to create notification");
  });

  it("stops when deduplication cannot read the database", async () => {
    queryResult(null, { code: "PGRST205" });
    await expect(checkUpcomingDeadlines(testUserId, null, "Student", applications())).rejects.toThrow("Failed to fetch notifications");
    expect(mocks.from).toHaveBeenCalledTimes(1);
  });
});

describe("Email Provider Abstraction & Templates", () => {
  it("uses the verified Brevo sender and holds rejected deliveries", async () => {
    vi.stubEnv("BREVO_API_KEY", "test-key");
    vi.stubEnv("EMAIL_FROM", "verified@example.com");
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ messageId: "delivery-1" }), { status: 201 }))
      .mockResolvedValueOnce(new Response("Daily quota exceeded", { status: 429 }));
    vi.stubGlobal("fetch", fetchMock);
    const email = { to: "student@example.com", subject: "Test", html: "<p>Hello</p>", text: "Hello", idempotencyKey: testUserId };
    expect(await sendEmail(email)).toEqual({ sent: true, provider: "brevo", messageId: "delivery-1" });
    const [url, request] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect(JSON.parse(request.body)).toEqual({ sender: { name: "build2ship", email: "verified@example.com" }, to: [{ email: email.to }], subject: email.subject, htmlContent: email.html, textContent: email.text, headers: { idempotencyKey: testUserId } });
    expect((await sendEmail(email)).sent).toBe(false);
  });

  it("never claims sent when BREVO_API_KEY is absent", async () => {
    const result = await sendEmail({ to: "student@example.com", subject: "Test", html: "<p>Hello</p>", text: "Hello" });
    expect(result.sent).toBe(false);
    expect(result.provider).toBe("configured_but_disabled");
    expect(result.warning).toContain("BREVO_API_KEY");
  });

  it("renders new match and deadline templates", () => {
    const match = renderNewMatchEmail({ userName: "Student", opportunityTitle: "Research Fellowship", organizer: "University", matchTier: "exceptional", fitScore: 94, fundingDesc: "$3,000 stipend", linkUrl: "/opportunities/fellowship" });
    expect(match.subject).toContain("EXCEPTIONAL MATCH");
    expect(match.html).toContain("$3,000 stipend");
    expect(match.text).toContain("Research Fellowship");
    const deadline = renderDeadlineWarningEmail({ userName: "Student", opportunityTitle: "Research Fellowship", daysRemaining: 3, deadline: "2026-09-19", nextAction: "Upload reference letters", linkUrl: "/workspace" });
    expect(deadline.subject).toContain("3 DAYS LEFT");
    expect(deadline.html).toContain("Upload reference letters");
    expect(deadline.text).toContain("Research Fellowship");
  });
});

describe("Web Push Infrastructure", () => {
  it("saves subscriptions in the database and scopes API removal to the user", async () => {
    const record = { ...subscription, id: "push-1", user_id: testUserId };
    const save = queryResult(record);
    expect(await savePushSubscription(testUserId, subscription)).toEqual(record);
    expect(save.upsert).toHaveBeenCalledWith(expect.objectContaining({ ...subscription, user_id: testUserId }));
    const remove = queryResult(null);
    const response = await POST(request({ subscription: { endpoint: subscription.endpoint }, action: "unsubscribe" }));
    expect(response.status).toBe(200);
    expect(remove.delete).toHaveBeenCalled();
    expect(remove.eq.mock.calls).toEqual([["endpoint", subscription.endpoint], ["user_id", testUserId]]);
  });

  it.each([
    { ...subscription, endpoint: "browser-native-demo" },
    { endpoint: subscription.endpoint },
    { ...subscription, keys: { p256dh: "", auth: "" } },
    { ...subscription, endpoint: "http://push.example.com/device" },
  ])("rejects invalid or fake subscriptions without database writes: %j", async (invalid) => {
    const response = await POST(request({ subscription: invalid }));
    expect(response.status).toBe(400);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("rejects the fake sentinel even through direct library calls", async () => {
    await expect(savePushSubscription(testUserId, { ...subscription, endpoint: "browser-native-demo" })).rejects.toThrow("Valid push subscription");
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("holds activation even with VAPID configured until delivery exists", async () => {
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "test-public-key");
    expect(await (await pushStatus()).json()).toMatchObject({ enabled: false, publicKey: null });
    const response = await POST(request({ subscription }));
    expect(response.status).toBe(503);
    expect(await response.json()).not.toHaveProperty("success");
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it.each(["PGRST205", "42P01", "42501"])("does not fake persistence on push database failures (%s)", async (code) => {
    queryResult(null, { code });
    await expect(savePushSubscription(testUserId, subscription)).rejects.toThrow("Failed to save push subscription");
    queryResult(null, { code });
    await expect(removePushSubscription(subscription.endpoint)).rejects.toThrow("Failed to remove push subscription");
  });

  it("rejects saves with no returned database row", async () => {
    queryResult(null);
    await expect(savePushSubscription(testUserId, subscription)).rejects.toThrow("Failed to save push subscription");
  });

  it("propagates push client failures without local persistence", async () => {
    mocks.createClient.mockRejectedValue(new Error("Connection failed"));
    await expect(savePushSubscription(testUserId, subscription)).rejects.toThrow("Connection failed");
    await expect(removePushSubscription(subscription.endpoint)).rejects.toThrow("Connection failed");
  });

  it("does not return API success after a failed unsubscribe", async () => {
    const action = "unsubscribe";
    queryResult(null, { code: "42501" });
    const response = await POST(request({ subscription, action }));
    expect(response.status).toBe(500);
    expect(await response.json()).not.toHaveProperty("success");
  });

  it("holds push when VAPID is unconfigured", async () => {
    expect(await dispatchWebPush(testUserId, { title: "Test", body: "Test" })).toMatchObject({ success: false, dispatchedCount: 0 });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("reads only database subscriptions and never claims undelivered pushes", async () => {
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "test-public-key");
    vi.stubEnv("VAPID_PRIVATE_KEY", "test-private-key");
    const query = queryResult([]);
    expect(await dispatchWebPush(testUserId, { title: "Test", body: "Test" })).toMatchObject({ success: true, dispatchedCount: 0 });
    expect(query.eq).toHaveBeenCalledWith("user_id", testUserId);
    queryResult([subscription]);
    expect(await dispatchWebPush(testUserId, { title: "Test", body: "Test" })).toMatchObject({ success: false, dispatchedCount: 0, warning: expect.stringContaining("not implemented") });
    queryResult(null, { code: "PGRST205" });
    expect(await dispatchWebPush(testUserId, { title: "Test", body: "Test" })).toMatchObject({ success: false, dispatchedCount: 0, warning: expect.stringContaining("Failed to fetch") });
    mocks.createClient.mockRejectedValue(new Error("Connection failed"));
    expect(await dispatchWebPush(testUserId, { title: "Test", body: "Test" })).toMatchObject({ success: false, dispatchedCount: 0 });
  });
});
