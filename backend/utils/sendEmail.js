import nodemailer from 'nodemailer';

class EmailNotConfiguredError extends Error {
  constructor(message = 'Email service is not configured.') {
    super(message);
    this.name = 'EmailNotConfiguredError';
    this.code = 'EMAIL_NOT_CONFIGURED';
  }
}

let cachedTransporter = null;
let verifiedOnce = false;

const getTransporter = () => {
  if (cachedTransporter) return cachedTransporter;

  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const debug = process.env.EMAIL_DEBUG === 'true';

  if (!user || !pass) {
    throw new EmailNotConfiguredError('Missing EMAIL_USER or EMAIL_PASS in environment variables.');
  }

  // Gmail transport (requires App Password if 2FA enabled)
  cachedTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
    logger: debug,
    debug,
    // Fail fast so frontend doesn't hit Axios 30s timeout
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000
  });

  return cachedTransporter;
};

/**
 * Send an email.
 * Supports both {to, subject, html, text} and legacy {email, subject, html, message}.
 */
export const sendEmail = async (options) => {
  const transporter = getTransporter();
  if (!verifiedOnce) {
    try {
      // Verify at most once per process
      await transporter.verify();
      verifiedOnce = true;
    } catch (err) {
      // Normalize nodemailer auth errors so callers can show helpful messages
      if (err?.code === 'EAUTH') {
        const e = new Error('Email authentication failed. Check EMAIL_USER/EMAIL_PASS (use a Gmail App Password).');
        e.name = 'EmailAuthError';
        e.code = 'EMAIL_AUTH_FAILED';
        throw e;
      }
      throw err;
    }
  }

  const to = options.to || options.email;
  const subject = options.subject;
  const html = options.html;
  const text = options.text || options.message || '';

  if (!to) throw new Error('sendEmail: missing "to" (or legacy "email")');
  if (!subject) throw new Error('sendEmail: missing "subject"');
  if (!html && !text) throw new Error('sendEmail: missing "html" or "text"');

  const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  const fromName = process.env.EMAIL_FROM_NAME || 'EverTrend';

  let info;
  try {
    info = await transporter.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to,
      subject,
      text,
      html: html || text
    });
  } catch (err) {
    if (err?.code === 'EAUTH') {
      const e = new Error('Email authentication failed. Check EMAIL_USER/EMAIL_PASS (use a Gmail App Password).');
      e.name = 'EmailAuthError';
      e.code = 'EMAIL_AUTH_FAILED';
      throw e;
    }
    throw err;
  }

  return { success: true, messageId: info.messageId };
};

export const otpEmailTemplate = (otp, minutes = 15) => ({
  subject: 'Your EverTrend verification code',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 20px;">
      <h2 style="margin: 0 0 12px; color: #111827;">Verify your email</h2>
      <p style="margin: 0 0 16px; color: #374151; line-height: 1.6;">
        Your One-Time Password (OTP) is:
      </p>
      <div style="background: #F3F4F6; border-radius: 10px; padding: 18px; text-align: center; margin: 16px 0;">
        <div style="font-size: 34px; letter-spacing: 8px; font-weight: 700; color: #111827;">
          ${otp}
        </div>
      </div>
      <p style="margin: 0; color: #6B7280; font-size: 13px;">
        This code is valid for ${minutes} minutes. If you did not request this, you can ignore this email.
      </p>
    </div>
  `
});

export const verificationLinkEmailTemplate = (verificationLink) => ({
  subject: 'Verify your EverTrend email',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 20px;">
      <h2 style="margin: 0 0 12px; color: #111827;">Verify your email</h2>
      <p style="margin: 0 0 16px; color: #374151; line-height: 1.6;">
        Please verify your email by clicking the button below:
      </p>
      <p style="margin: 18px 0;">
        <a href="${verificationLink}" style="display:inline-block; background:#1B5E20; color:#ffffff; text-decoration:none; padding:12px 18px; border-radius:8px; font-weight:600;">
          Verify Email
        </a>
      </p>
      <p style="margin: 0; color: #6B7280; font-size: 13px; line-height: 1.6;">
        Or copy and paste this link into your browser:
        <br />
        <span style="word-break: break-all;">${verificationLink}</span>
      </p>
    </div>
  `
});

/**
 * Send OTP verification email
 * @param {string} email - Recipient email address
 * @param {string} otp - 6-digit OTP code
 * @returns {Promise<{success: boolean, messageId?: string, previewUrl?: string}>}
 */
export const sendOTP = async (email, otp) => {
  const tpl = otpEmailTemplate(otp, 10);
  return await sendEmail({ to: email, subject: tpl.subject, html: tpl.html, text: `Your One-Time Password is: ${otp}` });
};

