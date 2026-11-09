/**
 * Thin Resend wrapper (ADR-027) — plain `fetch`, no SDK, matching
 * nhl.ts's own existing no-SDK convention for a single external call.
 * VELA has no backend, so unlike ORBI's typed `EmailProvider` Protocol
 * (a real adapter boundary for a codebase with domain/provider
 * separation), this is a bare function suited to VELA's actual current
 * scale — importing ORBI's heavier convention wholesale here would be
 * over-engineering for a project this size (per the architecture
 * review backing this ADR).
 */
const RESEND_SEND_URL = "https://api.resend.com/emails";

export type EmailMessage = { to: string; subject: string; html: string; text: string };
export type EmailSendResult = { sent: boolean; error?: string };

export async function sendEmail(message: EmailMessage): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.RESEND_FROM_ADDRESS;
  if (!apiKey || !fromAddress) {
    // Honest unavailable, never a fabricated success -- same discipline
    // as ORBI's UnavailableEmailProvider.
    return { sent: false, error: "email sending is not configured (RESEND_API_KEY/RESEND_FROM_ADDRESS unset)" };
  }

  try {
    const response = await fetch(RESEND_SEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: fromAddress, to: [message.to], subject: message.subject, html: message.html, text: message.text }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return { sent: false, error: `Resend returned ${response.status}` };
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : String(err) };
  }
}
