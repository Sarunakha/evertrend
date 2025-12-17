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

