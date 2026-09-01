import nodemailer from 'nodemailer';

/**
 * Real SMTP delivery for the workflow's "Platform Email" touchpoints
 * (document request notices, coverage denials, patient nudges/summaries).
 * SMTP_* were configured in .env but nothing ever sent through them —
 * every one of these previously only wrote an in-app `notifications` row,
 * which silently did nothing for recipients who aren't `users` rows
 * (patients) or who never opened the app.
 */
let transporter = null;
let warnedMissingConfig = false;

function getTransporter() {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_SECURE } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
    if (!warnedMissingConfig) {
      console.warn('⚠ SMTP_HOST/SMTP_USER/SMTP_PASSWORD not fully set — outbound email is disabled, calls will no-op.');
      warnedMissingConfig = true;
    }
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '587', 10),
    secure: SMTP_SECURE === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });
  return transporter;
}

/**
 * Sends an email and returns delivery evidence. Never throws — a failed or
 * disabled send returns { sent: false, reason } so callers can record the
 * outcome rather than crashing the tool call that triggered it.
 */
export async function sendEmail({ to, subject, html, text, attachments }) {
  if (!to) {
    return { sent: false, reason: 'No recipient email on file' };
  }

  const t = getTransporter();
  if (!t) {
    return { sent: false, reason: 'SMTP not configured' };
  }

  try {
    const info = await t.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to,
      subject,
      text: text || undefined,
      html: html || undefined,
      attachments: attachments || undefined,
    });
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error('✗ Email send failed:', error.message);
    return { sent: false, reason: error.message };
  }
}
