/**
 * Portal notifications, via the same Resend account as the public forms.
 *
 * Deliberately best-effort: every caller has already written the thing to the
 * database before calling this, so a failed send loses a notification, never a
 * record. Nothing here throws — a Resend outage must not turn a submitted
 * support request into a 500 and an apologetic error page.
 *
 * Env vars:
 *   RESEND_API_KEY   , shared with the public forms. No PUBLIC_ prefix.
 *   GAP_SUPPORT_TO   , optional. Default hello@peaksnowsports.com
 *   GAP_SUPPORT_FROM , optional. Must be a Resend-verified sender.
 */

const DEFAULT_TO = 'hello@peaksnowsports.com';
const DEFAULT_FROM = 'Peak GAP <gap@peaksnowsports.com>';

export interface Notification {
  subject: string;
  /** Plain-text body, one array entry per line. */
  lines: (string | null | undefined)[];
  /** Usually the student, so hitting reply answers them directly. */
  replyTo?: string;
  /** Overrides GAP_SUPPORT_TO — used when emailing one student, not the team. */
  to?: string | string[];
}

/**
 * Send, and report whether it went. Returns false rather than throwing when
 * Resend is unconfigured or unreachable.
 */
export async function notifyStaff(notification: Notification): Promise<boolean> {
  const key = import.meta.env.RESEND_API_KEY ?? process.env.RESEND_API_KEY;
  if (!key) return false;

  const to =
    notification.to !== undefined
      ? Array.isArray(notification.to)
        ? notification.to
        : [notification.to]
      : (import.meta.env.GAP_SUPPORT_TO ?? process.env.GAP_SUPPORT_TO ?? DEFAULT_TO)
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean);

  if (to.length === 0) return false;

  const from =
    import.meta.env.GAP_SUPPORT_FROM ??
    process.env.GAP_SUPPORT_FROM ??
    DEFAULT_FROM;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        reply_to: notification.replyTo,
        subject: notification.subject,
        text: notification.lines.filter((l) => l !== null && l !== undefined).join('\n'),
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
