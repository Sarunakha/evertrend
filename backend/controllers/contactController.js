import User from '../models/User.js';
import Message from '../models/Message.js';
import Notification from '../models/Notification.js';
import { sendEmail } from '../utils/sendEmail.js';

const ADMIN_EMAIL = 'sarunakhadka90@gmail.com';

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

    const admin = await User.findOne({ role: 'Admin' }).select('_id').lean();
    if (!admin) {
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

    await sendEmail({
      email: ADMIN_EMAIL,
      subject: `[EverTrend Contact] ${subjectTrimmed}`,
      message: emailBody,
      html: htmlBody
    });

    const messageDoc = await Message.create({
      type: 'contact_form',
      receiverId: admin._id,
      senderName,
      senderEmail,
      subject: subjectTrimmed,
      content: contentTrimmed,
      contactStatus: 'pending'
    });

    await Notification.create({
      recipientId: admin._id,
      senderId: null,
      type: 'CONTACT_FORM',
      message: `New inquiry from ${senderName} via Contact Us form.`,
      relatedId: messageDoc._id,
      isRead: false
    });

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
