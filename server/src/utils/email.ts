import { logger } from './logger';

export interface PaymentFailedEmailOptions {
  to: string;
  name?: string;
}

/**
 * Send a payment failure notification email.
 *
 * In production this should be wired to a real mail provider (SendGrid, SES, etc.).
 * For now it logs the notification and, if SENDGRID_API_KEY / SMTP settings are
 * present, you can swap this implementation without changing call sites.
 */
export async function sendPaymentFailedEmail({
  to,
  name,
}: PaymentFailedEmailOptions): Promise<void> {
  const greeting = name ? `Hi ${name},` : 'Hi,';
  const body = `
${greeting}

We were unable to process your recent payment for your Codebot subscription.

Please update your payment method to avoid any interruption to your service:
  https://codebot-ktjb.onrender.com/pricing

If you have any questions, please contact our support team.

— The Codebot Team
`.trim();

  // Log so the failure is always visible in server logs / alerting systems
  logger.warn('payment_failed_email', { to, subject: 'Action required: Payment failed for your Codebot subscription' });

  // If you add a mail provider, replace the block below.
  // Example (nodemailer / SendGrid / Resend):
  //   await mailer.sendMail({ from: 'noreply@codebot.app', to, subject, text: body });

  // For now just output to console so it is visible during development
  if (process.env.NODE_ENV !== 'production') {
    console.info('[email] To:', to);
    console.info('[email] Body:', body);
  }
}
