import nodemailer from 'nodemailer';

// Create reusable transporter object using SMTP transport
const createTransporter = async () => {
  // For development, use Ethereal Email (fake SMTP service)
  if (process.env.NODE_ENV === 'development' || !process.env.EMAIL_HOST) {
    try {
      // Create a test account if credentials not provided
      if (!process.env.ETHEREAL_USER || !process.env.ETHEREAL_PASS) {
        console.log('Creating Ethereal test account...');
        const testAccount = await nodemailer.createTestAccount();
        console.log('Ethereal account created:', testAccount.user);
        
        return nodemailer.createTransporter({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass
          }
        });
      }
      
      return nodemailer.createTransporter({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: process.env.ETHEREAL_USER,
          pass: process.env.ETHEREAL_PASS
        }
      });
    } catch (etherealError) {
      console.error('Error creating Ethereal account:', etherealError);
      // Fallback: Create a mock transporter that logs instead of sending
      console.warn('⚠️  Using mock email transporter (emails will be logged only)');
      return {
        verify: async () => true,
        sendMail: async (message) => {
          console.log('\n📧 MOCK EMAIL (Email service unavailable):');
          console.log('To:', message.to);
          console.log('Subject:', message.subject);
          console.log('Text:', message.text);
          return { messageId: 'mock-' + Date.now() };
        }
      };
    }
  }

  // For production, use real SMTP (Gmail, SendGrid, etc.)
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

export const sendEmail = async (options) => {
  let transporter;
  
  try {
    transporter = await createTransporter();
    
    // Verify connection
    await transporter.verify();
    
    const message = {
      from: `${process.env.EMAIL_FROM_NAME || 'EverTrend'} <${process.env.EMAIL_FROM || 'noreply@evertrend.com'}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html || options.message
    };

    const info = await transporter.sendMail(message);

    // In development with Ethereal, get the preview URL
    let previewUrl = null;
    if (process.env.NODE_ENV === 'development' && info.messageId) {
      previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log('\n✅ Email sent successfully!');
        console.log('📧 Preview URL:', previewUrl);
        console.log('📬 To:', options.email);
        console.log('');
      }
    }

    return { 
      success: true, 
      messageId: info.messageId,
      previewUrl: previewUrl
    };
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.response) {
      console.error('SMTP response:', error.response);
    }
    throw error;
  }
};

/**
 * Send OTP verification email
 * @param {string} email - Recipient email address
 * @param {string} otp - 6-digit OTP code
 * @returns {Promise<{success: boolean, messageId?: string, previewUrl?: string}>}
 */
export const sendOTP = async (email, otp) => {
  const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email - EverTrend</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
      <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%); border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold; letter-spacing: 2px;">EVERTREND</h1>
                  <p style="margin: 10px 0 0; color: #ffffff; font-size: 14px; opacity: 0.9;">Curating the styles of tomorrow, today.</p>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <h2 style="margin: 0 0 20px; color: #1B5E20; font-size: 24px; font-weight: 600;">Verify Your Email Address</h2>
                  <p style="margin: 0 0 30px; color: #666666; font-size: 16px; line-height: 1.6;">
                    Thank you for signing up with EverTrend! To complete your registration, please use the verification code below:
                  </p>
                  
                  <!-- OTP Code Box -->
                  <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border: 2px dashed #1B5E20; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0;">
                    <p style="margin: 0 0 15px; color: #666666; font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">Your Verification Code</p>
                    <div style="display: inline-block; background-color: #ffffff; padding: 20px 40px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                      <h1 style="margin: 0; color: #1B5E20; font-size: 42px; font-weight: bold; letter-spacing: 8px; font-family: 'Courier New', monospace;">${otp}</h1>
                    </div>
                    <p style="margin: 20px 0 0; color: #999999; font-size: 12px;">This code will expire in 10 minutes</p>
                  </div>
                  
                  <p style="margin: 30px 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
                    If you didn't request this code, please ignore this email or contact our support team if you have concerns.
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center;">
                  <p style="margin: 0; color: #999999; font-size: 12px;">
                    © ${new Date().getFullYear()} EverTrend. All rights reserved.
                  </p>
                  <p style="margin: 10px 0 0; color: #999999; font-size: 12px;">
                    This is an automated email, please do not reply.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const textMessage = `
EverTrend - Email Verification

Thank you for signing up with EverTrend!

Your verification code is: ${otp}

This code will expire in 10 minutes.

If you didn't request this code, please ignore this email.

© ${new Date().getFullYear()} EverTrend. All rights reserved.
  `;

  return await sendEmail({
    email,
    subject: 'Verify Your Email - EverTrend',
    message: textMessage,
    html: htmlTemplate
  });
};

