import User from '../models/User.js';
import Message from '../models/Message.js';
import ContactSubmission from '../models/ContactSubmission.js';
import Notification from '../models/Notification.js';
import { sendEmail } from '../utils/sendEmail.js';

/**
 * POST /api/contact/submit
 * Submit Contact Us form: send email to admin and save to DB with notification.
 */
export const submitContact = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, subject, and message are required.'
      });
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(String(email).trim().toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    const admins = await User.find({ role: 'Admin' }).select('_id email').lean();
    if (!admins || admins.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Admin user not found. Please try again later.'
      });
    }

    const senderName = String(name).trim();
    const senderEmail = String(email).trim().toLowerCase();
    const subjectTrimmed = String(subject).trim();
    const contentTrimmed = String(message).trim();

    const emailBody = `
New inquiry from the Contact Us form (EverTrend)

From: ${senderName}
Email: ${senderEmail}
Subject: ${subjectTrimmed}

Message:
${contentTrimmed}

---
This message was sent via the EverTrend Contact Us form.
    `.trim();

    const htmlBody = `
      <h2>New inquiry from the Contact Us form (EverTrend)</h2>
      <p><strong>From:</strong> ${senderName}</p>
      <p><strong>Email:</strong> ${senderEmail}</p>
      <p><strong>Subject:</strong> ${subjectTrimmed}</p>
      <h3>Message:</h3>
      <p>${contentTrimmed.replace(/\n/g, '<br>')}</p>
      <hr />
      <p><em>This message was sent via the EverTrend Contact Us form.</em></p>
    `;

    // 1) Always persist to DB first (so email issues never block saving)
    const messageDoc = await Message.create({
      type: 'contact_form',
      // Make contact form messages visible to ANY admin.
      // (If you later want per-admin assignment, set receiverId explicitly.)
      receiverId: null,
      senderName,
      senderEmail,
      subject: subjectTrimmed,
      content: contentTrimmed,
      contactStatus: 'pending'
    });

    // Also save a copy to ContactSubmission collection (for compatibility with Atlas checks)
    // receiverId is required on ContactSubmission, so we use the first admin.
    await ContactSubmission.create({
      receiverId: admins[0]._id,
      senderName,
      senderEmail,
      subject: subjectTrimmed,
      content: contentTrimmed,
      isRead: false
    });

    await Promise.allSettled(
      admins.map((admin) =>
        Notification.create({
          recipientId: admin._id,
          senderId: null,
          type: 'CONTACT_FORM',
          message: `New inquiry from ${senderName} via Contact Us form.`,
          relatedId: messageDoc._id,
          isRead: false
        })
      )
    );

    // 2) Best-effort email send (do not fail the request if email fails)
    const adminEmails = admins.map((a) => a.email).filter(Boolean);
    if (adminEmails.length > 0) {
      try {
        // comma-separated list is supported by nodemailer
        await sendEmail({
          email: adminEmails.join(','),
          subject: `[EverTrend Contact] ${subjectTrimmed}`,
          message: emailBody,
          html: htmlBody
        });
      } catch (emailError) {
        console.error('Contact submit email error (non-blocking):', emailError);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Your message has been sent to our team!'
    });
  } catch (error) {
    console.error('Contact submit error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to send your message. Please try again later.'
    });
  }
};
