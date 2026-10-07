// ============================================================
// DEADLINE ALERT ENGINE
// Scans active applications and tracked opportunities for upcoming deadlines.
// Evaluates thresholds (7d, 3d, 24h) and generates in-app and email alerts.
// Automatically skips completed, rejected, or withdrawn applications.
// ============================================================

import { Application, Opportunity } from "@/types/database";
import { APP_URL } from "@/config/app";
import { createUserNotification, fetchUserNotifications } from "./inbox";
import { renderDeadlineWarningEmail, sendEmail } from "./email";

export interface DeadlineCheckResult {
  evaluatedCount: number;
  alertsGenerated: number;
  skippedCount: number;
}

/**
 * Checks all active applications for approaching deadlines and triggers alerts.
 */
export async function checkUpcomingDeadlines(
  userId: string,
  userEmail: string | null,
  userName: string,
  applications: (Application & { opportunities?: Opportunity })[],
  thresholdDays = [7, 3, 1]
): Promise<DeadlineCheckResult> {
  const now = Date.now();
  let alertsGenerated = 0;
  let skippedCount = 0;

  // Retrieve user's existing notifications to prevent duplicate alerts
  const existingNotifications = await fetchUserNotifications(userId);

  for (const app of applications) {
    // 1. Skip terminal or completed application states
    if (app.stage === "submitted" || app.stage === "selected" || app.stage === "rejected" || app.stage === "withdrawn") {
      skippedCount++;
      continue;
    }

    const opp = app.opportunities;
    const deadlineStr = app.target_date || opp?.deadline;
    if (!deadlineStr) {
      continue;
    }

    const deadlineMs = new Date(deadlineStr).getTime();
    const diffMs = deadlineMs - now;
    const daysRemaining = Math.ceil(diffMs / 86400000);

    // If deadline has already passed
    if (daysRemaining < 0) {
      continue;
    }

    // 2. Check if daysRemaining matches any configured threshold
    const matchedThreshold = thresholdDays.find((t) => daysRemaining === t);
    if (matchedThreshold !== undefined) {
      // 3. Deduplication: Check if an alert was already dispatched for this application & threshold
      const alreadyAlerted = existingNotifications.some((n) => {
        return (
          n.type === "deadline" &&
          n.metadata?.application_id === app.id &&
          n.metadata?.days_remaining === matchedThreshold
        );
      });

      if (!alreadyAlerted) {
        const title = opp?.title || "Tracked Opportunity";
        const urgencyLabel = matchedThreshold <= 1 ? "24 hours" : `${matchedThreshold} days`;

        // Create In-App Notification
        await createUserNotification(userId, {
          title: `Deadline Alert: ${urgencyLabel} left`,
          message: `${title} application deadline closes in ${daysRemaining} day(s). Action: ${app.next_action || "Complete submission"}`,
          type: "deadline",
          link_url: `/workspace`,
          metadata: {
            application_id: app.id,
            opportunity_id: opp?.id,
            days_remaining: matchedThreshold,
            urgency: matchedThreshold <= 1 ? "critical" : "high",
          },
        });

        // Dispatch Email if user email is available
        if (userEmail) {
          const emailData = renderDeadlineWarningEmail({
            userName: userName || "Student",
            opportunityTitle: title,
            daysRemaining: matchedThreshold,
            deadline: deadlineStr,
            nextAction: app.next_action,
            linkUrl: `${APP_URL}/workspace`,
          });
          await sendEmail({
            to: userEmail,
            subject: emailData.subject,
            html: emailData.html,
            text: emailData.text,
          });
        }

        alertsGenerated++;
      }
    }
  }

  return {
    evaluatedCount: applications.length,
    alertsGenerated,
    skippedCount,
  };
}
