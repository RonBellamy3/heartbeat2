/**
 * Mailer abstraction. In dev (and whenever no provider is configured) this
 * just logs the message/link to the console. Swap the body of `sendMail`
 * for a real provider (Postmark, Resend, SES, ...) in production — nothing
 * else in the app needs to change since callers only depend on this module.
 */

interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

export async function sendMail(message: MailMessage): Promise<void> {
  console.log(
    `\n[mailer] To: ${message.to}\n[mailer] Subject: ${message.subject}\n[mailer] ${message.text}\n`
  );
}

export async function sendVerificationEmail(to: string, verifyUrl: string) {
  await sendMail({
    to,
    subject: "Verify your Heartbeat email",
    text: `Welcome to Heartbeat! Verify your email by visiting:\n${verifyUrl}\n\nThis link expires in 24 hours.`,
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  await sendMail({
    to,
    subject: "Reset your Heartbeat password",
    text: `Reset your password by visiting:\n${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore this email.`,
  });
}
