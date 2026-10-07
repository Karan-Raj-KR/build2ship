// ============================================================
// EMAIL PROVIDER ABSTRACTION
// Configured-but-disabled architecture. Uses Brevo when configured.
// Never pretends email was sent if provider keys are missing.
// ============================================================

import { EmailDispatchResult } from "./types";
import { APP_NAME } from "@/config/app";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey?: string;
}

/**
 * Sends an email using the configured provider (Brevo), or returns
 * configured_but_disabled status cleanly without failing or claiming sent.
 */
export async function sendEmail(options: EmailOptions): Promise<EmailDispatchResult> {
  const brevoApiKey = process.env.BREVO_API_KEY;

  if (!brevoApiKey || !process.env.EMAIL_FROM) {
    return {
      sent: false,
      provider: "configured_but_disabled",
      warning: "BREVO_API_KEY or EMAIL_FROM is not configured in the environment. Email notifications are safely held.",
    };
  }

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      signal: AbortSignal.timeout(15000),
      headers: {
        "api-key": brevoApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: APP_NAME, email: process.env.EMAIL_FROM },
        to: [{ email: options.to }],
        ...(options.idempotencyKey ? { headers: { idempotencyKey: options.idempotencyKey } } : {}),
        subject: options.subject,
        htmlContent: options.html,
        textContent: options.text,
      }),
    });

    if (!res.ok) {
      // A timeout or server error may follow acceptance: do not blindly retry.
      return {
        sent: false,
        uncertain: res.status >= 500,
        provider: "brevo",
        warning: `Brevo rejected or could not confirm the request (HTTP ${res.status})`,
      };
    }

    const data = await res.json();
    if (typeof data.messageId !== 'string') return { sent: false, uncertain: true, provider: 'brevo', warning: 'Provider response did not confirm a message ID' };
    return {
      sent: true,
      provider: "brevo",
      messageId: data.messageId,
    };
  } catch {
    return {
      sent: false,
      uncertain: true,
      provider: "brevo",
      warning: "Provider outcome is unknown; reconcile transactional logs before retrying",
    };
  }
}

// ============================================================
// EMAIL TEMPLATES
// ============================================================

export function renderNewMatchEmail(params: {
  userName: string;
  opportunityTitle: string;
  organizer: string;
  matchTier: string;
  fitScore: number;
  deadline?: string | null;
  fundingDesc?: string | null;
  linkUrl: string;
}): { html: string; text: string; subject: string } {
  const subject = `[${params.matchTier.toUpperCase()} MATCH] ${params.opportunityTitle} (${params.fitScore}% fit)`;

  const text = `
Hi ${params.userName},

Scout just discovered a new ${params.matchTier} match tailored to your profile:

${params.opportunityTitle}
Organizer: ${params.organizer}
Match Score: ${params.fitScore}%
${params.fundingDesc ? `Funding: ${params.fundingDesc}\n` : ""}${params.deadline ? `Deadline: ${new Date(params.deadline).toLocaleDateString()}\n` : ""}

View Opportunity Details:
${params.linkUrl}

Best,
The ${APP_NAME} Scout Team
`.trim();

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0f19; color: #f1f5f9; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background-color: #131b2e; border: 1px solid #1e293b; border-radius: 16px; padding: 32px;">
    <div style="font-size: 12px; font-weight: 700; color: #22d3ee; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
      ${params.matchTier} Match (${params.fitScore}%)
    </div>
    <p style="color: #94a3b8; font-size: 14px; margin-bottom: 8px;">Hi ${params.userName},</p>
    <h2 style="color: #ffffff; margin-top: 0; font-size: 22px; line-height: 1.3;">
      ${params.opportunityTitle}
    </h2>
    <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">
      By ${params.organizer}
    </p>

    <div style="background-color: #0b0f19; border: 1px solid #1e293b; border-radius: 12px; padding: 16px; margin-bottom: 24px; font-size: 13px;">
      ${params.fundingDesc ? `<p style="margin: 4px 0; color: #34d399;"><strong>Funding:</strong> ${params.fundingDesc}</p>` : ""}
      ${params.deadline ? `<p style="margin: 4px 0; color: #fbbf24;"><strong>Deadline:</strong> ${new Date(params.deadline).toLocaleDateString()}</p>` : ""}
    </div>

    <a href="${params.linkUrl}" style="display: inline-block; background: linear-gradient(135deg, #06b6d4, #2563eb); color: #ffffff; font-weight: 600; font-size: 14px; text-decoration: none; padding: 12px 24px; border-radius: 10px;">
      Review Application & Eligibility
    </a>

    <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #1e293b; font-size: 11px; color: #64748b;">
      You received this alert because of your notification settings on ${APP_NAME}.
    </div>
  </div>
</body>
</html>
`.trim();

  return { html, text, subject };
}

export function renderDeadlineWarningEmail(params: {
  userName: string;
  opportunityTitle: string;
  daysRemaining: number;
  deadline: string;
  nextAction?: string | null;
  linkUrl: string;
}): { html: string; text: string; subject: string } {
  const urgencyWord = params.daysRemaining <= 1 ? "24 HOURS LEFT" : `${params.daysRemaining} DAYS LEFT`;
  const subject = `⚠️ [DEADLINE ALERT: ${urgencyWord}] ${params.opportunityTitle}`;

  const text = `
Hi ${params.userName},

Urgent reminder: the application deadline for ${params.opportunityTitle} closes in ${params.daysRemaining} day(s) on ${new Date(params.deadline).toLocaleDateString()}.

${params.nextAction ? `Next Pending Action: ${params.nextAction}\n` : ""}

Review your application:
${params.linkUrl}

Best,
The ${APP_NAME} Team
`.trim();

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0f19; color: #f1f5f9; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background-color: #131b2e; border: 1px solid #dc2626; border-radius: 16px; padding: 32px;">
    <div style="font-size: 12px; font-weight: 700; color: #f87171; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
      ⚠️ Deadline Warning (${params.daysRemaining} days remaining)
    </div>
    <h2 style="color: #ffffff; margin-top: 0; font-size: 22px;">
      ${params.opportunityTitle}
    </h2>
    <p style="color: #cbd5e1; font-size: 14px;">
      Closes on <strong>${new Date(params.deadline).toLocaleDateString()}</strong>.
    </p>

    ${params.nextAction ? `
    <div style="background-color: #1e1b4b; border: 1px solid #4338ca; border-radius: 10px; padding: 12px 16px; margin: 20px 0; font-size: 13px; color: #c7d2fe;">
      <strong>Target Action:</strong> ${params.nextAction}
    </div>` : ""}

    <a href="${params.linkUrl}" style="display: inline-block; background-color: #ef4444; color: #ffffff; font-weight: 600; font-size: 14px; text-decoration: none; padding: 12px 24px; border-radius: 10px; margin-top: 10px;">
      Open Application Workspace
    </a>
  </div>
</body>
</html>
`.trim();

  return { html, text, subject };
}
