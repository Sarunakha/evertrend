import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import OTP from '../models/OTP.js';
import { generateToken } from '../utils/generateToken.js';
import { protect } from '../middleware/auth.js';
import { sendEmail, sendOTP, otpEmailTemplate, verificationLinkEmailTemplate } from '../utils/sendEmail.js';
import { validateEmail } from '../utils/emailValidator.js';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';

const router = express.Router();

// @route   POST /api/auth/request-otp
// @desc    Request OTP for email verification before registration
// @access  Public
router.post('/request-otp', async (req, res) => {
  try {
    const { email } = req.body;

    // Step 1: Basic regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    // Normalize email (lowercase, trim)
    const normalizedEmail = email.trim().toLowerCase();

    // Step 2: Deep email validation - Check MX records, disposable emails, etc.
    console.log(`\n🔍 Validating email for OTP: ${normalizedEmail}`);
    let emailValidation;
    try {
      emailValidation = await validateEmail(normalizedEmail, { 
        checkMx: true,  // Enable MX check to ensure real email addresses
        checkDisposable: true,
        timeoutMs: 5000  // 5 second timeout for DNS lookups
      });
      console.log(`📧 Email validation result:`, emailValidation);
    } catch (validationError) {
      // If validation throws an error, treat it as invalid
      console.error('❌ Email validation error:', validationError);
      return res.status(400).json({
        success: false,
        message: 'Email validation failed. Please use a valid, real email address.'
      });
    }
    
    // Strict check: if validation result is missing or invalid, reject
    if (!emailValidation || !emailValidation.valid) {
      console.log(` Email validation failed for: ${normalizedEmail} - ${emailValidation?.error || 'Unknown error'}`);
      return res.status(400).json({
        success: false,
        message: emailValidation?.error || 'Invalid email address. Please use a real email address with a valid domain.'
      });
    }
    
    console.log(`✅ Email validation passed for: ${normalizedEmail}`);

    // Step 3: Check if user already exists
    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered.'
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Delete any existing OTPs for this email
    await OTP.deleteMany({ email: normalizedEmail });

    // Save OTP to database (will auto-expire after 5 minutes via TTL)
    await OTP.create({
      email: normalizedEmail,
      otp
    });

    // Send OTP email using nodemailer
    try {
      await sendOTP(normalizedEmail, otp);
      return res.status(200).json({
        success: true,
        message: 'Verification code sent to your email. Please check your inbox.'
      });
    } catch (emailError) {
      console.error('❌ Error sending OTP email:', emailError);
      
      // Delete the OTP if email sending fails
      await OTP.deleteMany({ email: normalizedEmail });
      
      // Return specific error message as requested
      return res.status(500).json({
        success: false,
        message:
          emailError?.code === 'EMAIL_NOT_CONFIGURED'
            ? 'Email service is not configured on the server. Please set EMAIL_USER and EMAIL_PASS.'
            : emailError?.code === 'EMAIL_AUTH_FAILED'
            ? 'Email service authentication failed on the server. Please use a Gmail App Password for EMAIL_PASS.'
            : 'Could not send email. Please check if the email address is valid.'
      });
    }
  } catch (error) {
    console.error('Request OTP error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while sending the verification code. Please try again.'
    });
  }
});

// @route   POST /api/auth/verify-and-signup
// @desc    Verify OTP and create user account (only if OTP is valid)
// @access  Public
router.post('/verify-and-signup', async (req, res) => {
  try {
    const { name, email, password, otp } = req.body;

    // Validate required fields
    if (!name || name.trim().length < 3 || name.trim().length > 30) {
      return res.status(400).json({
        success: false,
        message: 'Name must be between 3 and 30 characters.'
      });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters.'
      });
    }

    if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: 'OTP must be exactly 6 digits.'
      });
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();
    const username = name.trim();

    // Check if user already exists (double-check)
    const userExists = await User.findOne({ 
      $or: [
        { email: normalizedEmail }, 
        { username: username }
      ] 
    });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or username.'
      });
    }

    // Find the OTP record for this email
    const otpRecord = await OTP.findOne({ email: normalizedEmail })
      .sort({ createdAt: -1 }); // Get the most recent OTP

    // Verify OTP exists and matches
    if (!otpRecord || otpRecord.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code.'
      });
    }

    // Check if OTP is expired (though TTL should handle this, we check anyway)
    const now = new Date();
    const otpAge = (now - otpRecord.createdAt) / 1000; // Age in seconds
    if (otpAge > 300) { // 5 minutes
      await OTP.deleteMany({ email: normalizedEmail });
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code.'
      });
    }

    // OTP is valid - NOW create the user
    // Password will be hashed automatically by the User model's pre-save hook
    const user = await User.create({
      username: username,
      email: normalizedEmail,
      password: password,
      role: 'Buyer', // Default role
      isVerified: true // Mark as verified since they verified via OTP
    });

    // Delete the used OTP
    await OTP.deleteMany({ email: normalizedEmail });

    console.log(`✅ User registered successfully: ${user.email}`);

    // Generate JWT token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Registration successful! Your account has been created.',
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        token
      }
    });
  } catch (error) {
    console.error('Verify and signup error:', error);
    
    // Handle specific error types
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: Object.values(error.errors).map(e => e.message).join(', ')
      });
    }
    
    if (error.code === 11000) {
      // Duplicate key error (MongoDB)
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.`
      });
    }
    
    // Database connection errors
    if (error.name === 'MongoServerError' || error.name === 'MongoNetworkError') {
      return res.status(500).json({
        success: false,
        message: 'Database connection error. Please try again later.'
      });
    }
    
    // Generic error
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred during registration. Please try again.'
    });
  }
});

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', [
  body('username').trim().isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['Admin', 'Seller', 'Buyer']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { username, email, password, role } = req.body;

    // Deep email validation before creating user
    // Validate that email is real and has valid mail servers
    console.log(`\n🔍 Validating email: ${email}`);
    let emailValidation;
    try {
      emailValidation = await validateEmail(email, { 
        checkMx: true,  // Enable MX check to ensure real email addresses
        checkDisposable: true,
        timeoutMs: 5000  // 5 second timeout for DNS lookups
      });
      console.log(`📧 Email validation result:`, emailValidation);
    } catch (validationError) {
      // If validation throws an error, treat it as invalid
      console.error('❌ Email validation error:', validationError);
      return res.status(400).json({
        success: false,
        message: 'Email validation failed. Please use a valid, real email address.'
      });
    }
    
    // Strict check: if validation result is missing or invalid, reject
    if (!emailValidation || !emailValidation.valid) {
      console.log(`❌ Email validation failed for: ${email} - ${emailValidation?.error || 'Unknown error'}`);
      return res.status(400).json({
        success: false,
        message: emailValidation?.error || 'Invalid email address. Please use a real email address with a valid domain.'
      });
    }
    
    console.log(`✅ Email validation passed for: ${email}`);

    // Check if user already exists
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      // If user exists and is trying to register as Seller, allow role upgrade
      if (role === 'Seller' && userExists.role === 'Buyer') {
        // Upgrade existing buyer to seller
        userExists.role = 'Seller';
        await userExists.save();
        
        return res.status(200).json({
          success: true,
          message: 'Account upgraded to Seller successfully! Please login with your credentials.',
          data: {
            _id: userExists._id,
            username: userExists.username,
            email: userExists.email,
            role: userExists.role,
            isVerified: userExists.isVerified
          }
        });
      }
      
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or username'
      });
    }

    // Generate 6-digit OTP
    const verificationOTP = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationOTPExpire = Date.now() + 15 * 60 * 1000; // 15 minutes
    
    // Also generate token for link-based verification
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    // Send verification email with OTP + link (only create user if email sends successfully)
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3002'}/verify-email?token=${verificationToken}`;

    try {
      const otpTpl = otpEmailTemplate(verificationOTP, 15);
      const linkTpl = verificationLinkEmailTemplate(verificationUrl);
      await sendEmail({
        to: email,
        subject: 'Verify Your EverTrend Account',
        text: `Your One-Time Password is: ${verificationOTP}\nVerification link: ${verificationUrl}`,
        html: `
          ${otpTpl.html}
          <div style="height: 12px;"></div>
          ${linkTpl.html}
        `
      });
    } catch (emailError) {
      console.error('❌ Error sending verification email:', emailError);
      // Dev fallback: if SMTP auth is not configured correctly, don't block registration UX.
      // In production, keep this strict and return 500.
      if (process.env.NODE_ENV === 'development' && emailError?.code === 'EMAIL_AUTH_FAILED') {
        const user = await User.create({
          username,
          email,
          password,
          role: role || 'Buyer',
          verificationToken,
          verificationTokenExpire,
          verificationOTP,
          verificationOTPExpire
        });

        return res.status(201).json({
          success: true,
          message:
            'Registration successful (development mode). Email could not be sent; use the verification code/link below.',
          data: {
            _id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            isVerified: user.isVerified
          },
          requiresVerification: true,
          developmentMode: true,
          emailSent: false,
          verificationOTP,
          verificationUrl
        });
      }
      return res.status(500).json({
        success: false,
        message:
          emailError?.code === 'EMAIL_NOT_CONFIGURED'
            ? 'Email service is not configured on the server. Please set EMAIL_USER and EMAIL_PASS.'
            : emailError?.code === 'EMAIL_AUTH_FAILED'
            ? 'Email service authentication failed on the server. Please use a Gmail App Password for EMAIL_PASS.'
            : 'Failed to send verification email. Please check your email address and try again.'
      });
    }

    // Create user (unverified by default) AFTER email succeeds
    const user = await User.create({
      username,
      email,
      password,
      role: role || 'Buyer',
      verificationToken,
      verificationTokenExpire,
      verificationOTP,
      verificationOTPExpire
    });

    // Return success response
    const response = {
      success: true,
      message: 'Registration successful! Please check your email for the verification code.',
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified
      },
      requiresVerification: true,
      emailSent: true
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle specific error types
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: Object.values(error.errors).map(e => e.message).join(', ')
      });
    }
    
    if (error.code === 11000) {
      // Duplicate key error (MongoDB)
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
      });
    }
    
    // Database connection errors
    if (error.name === 'MongoServerError' || error.name === 'MongoNetworkError') {
      return res.status(500).json({
        success: false,
        message: 'Database connection error. Please try again later.'
      });
    }
    
    // Generic error
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred during registration. Please try again.'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+password');
    
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (user.status === 'Suspended' || user.isSuspended) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact admin at admin@evertrend.com'
      });
    }

    // Check if email is verified (skip for Admin users)
    if (!user.isVerified && user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email address to continue.',
        requiresVerification: true,
        userId: user._id,
        email: user.email
      });
    }

    res.json({
      success: true,
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        token: generateToken(user._id)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Send password reset token to email
// @access  Public
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal if user exists for security
      return res.json({
        success: true,
        message: 'If an account with that email exists and is verified, a password reset link has been sent.'
      });
    }

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email address before resetting your password.'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 60 * 60 * 1000; // 1 hour

    // Save reset token to user
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = resetTokenExpiry;
    await user.save({ validateBeforeSave: false });

    // Send password reset email
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3002'}/reset-password?token=${resetToken}`;
    
    try {
      await sendEmail({
        email: user.email,
        subject: 'Reset Your EverTrend Password',
        message: `You requested a password reset. Click the following link to reset your password: ${resetUrl}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Password Reset Request</h2>
            <p>You requested to reset your password. Click the button below to reset it:</p>
            <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #1B5E20; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">Reset Password</a>
            <p>Or copy and paste this link into your browser:</p>
            <p style="color: #666; word-break: break-all;">${resetUrl}</p>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Error sending password reset email:', emailError);
      // Reset the token if email fails
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({
        success: false,
        message: 'Error sending email. Please try again later.'
      });
    }

    res.json({
      success: true,
      message: 'If an account with that email exists and is verified, a password reset link has been sent.',
      // Remove this in production - only for development
      ...(process.env.NODE_ENV === 'development' && { resetToken, resetUrl })
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/auth/verify-email
// @desc    Verify user email with OTP or token
// @access  Public
router.post('/verify-email', [
  body('otp').optional().isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  body('token').optional().notEmpty().withMessage('Verification token is required'),
  body('email').optional().isEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { otp, token, email } = req.body;
    let user;

    // Verify with OTP
    if (otp && email) {
      user = await User.findOne({ email }).select('+verificationOTP');
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (user.isVerified) {
        return res.status(400).json({
          success: false,
          message: 'Email is already verified'
        });
      }

      if (!user.verificationOTP || user.verificationOTP !== otp) {
        return res.status(400).json({
          success: false,
          message: 'Invalid verification code'
        });
      }

      if (!user.verificationOTPExpire || user.verificationOTPExpire < Date.now()) {
        return res.status(400).json({
          success: false,
          message: 'Verification code has expired. Please request a new one.'
        });
      }
    }
    // Verify with token
    else if (token) {
      user = await User.findOne({
        verificationToken: token,
        verificationTokenExpire: { $gt: Date.now() }
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired verification token'
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Either OTP with email or token is required'
      });
    }

    // Verify user
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpire = undefined;
    user.verificationOTP = undefined;
    user.verificationOTPExpire = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Email verified successfully! You can now log in.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/auth/resend-verification
// @desc    Resend verification email
// @access  Public
router.post('/resend-verification', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal if user exists for security
      return res.json({
        success: true,
        message: 'If an account with that email exists, a verification email has been sent.'
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Generate new OTP and token
    const verificationOTP = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationOTPExpire = Date.now() + 15 * 60 * 1000; // 15 minutes
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    user.verificationOTP = verificationOTP;
    user.verificationOTPExpire = verificationOTPExpire;
    user.verificationToken = verificationToken;
    user.verificationTokenExpire = verificationTokenExpire;
    await user.save({ validateBeforeSave: false });

    // Send verification email
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3002'}/verify-email?token=${verificationToken}`;
    
    try {
      const otpTpl = otpEmailTemplate(verificationOTP, 15);
      const linkTpl = verificationLinkEmailTemplate(verificationUrl);
      await sendEmail({
        to: user.email,
        subject: 'Verify Your EverTrend Account',
        text: `Your One-Time Password is: ${verificationOTP}\nVerification link: ${verificationUrl}`,
        html: `
          ${otpTpl.html}
          <div style="height: 12px;"></div>
          ${linkTpl.html}
        `
      });
    } catch (emailError) {
      console.error('❌ Error sending verification email:', emailError);
      if (process.env.NODE_ENV === 'development' && emailError?.code === 'EMAIL_AUTH_FAILED') {
        return res.json({
          success: true,
          message:
            'Verification code generated (development mode). Email could not be sent; use the verification code/link below.',
          developmentMode: true,
          emailSent: false,
          verificationOTP,
          verificationUrl
        });
      }
      return res.status(500).json({
        success: false,
        message:
          emailError?.code === 'EMAIL_NOT_CONFIGURED'
            ? 'Email service is not configured on the server. Please set EMAIL_USER and EMAIL_PASS.'
            : emailError?.code === 'EMAIL_AUTH_FAILED'
            ? 'Email service authentication failed on the server. Please use a Gmail App Password for EMAIL_PASS.'
            : 'Failed to send verification email. Please try again later.'
      });
    }

    res.json({
      success: true,
      message: 'If an account with that email exists, a verification email has been sent.',
      emailSent: true
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/auth/reset-password/:resetToken
// @desc    Reset password with token
// @access  Public
router.put('/reset-password/:resetToken', [
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { resetToken } = req.params;
    const { password } = req.body;

    // Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken: resetToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successful. Please login with your new password.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/auth/google
// @desc    Authenticate user with Google
// @access  Public
router.post('/google', [
  body('tokenId').notEmpty().withMessage('Google token is required')
], async (req, res) => {
  try {
    // Check if Google Client ID is configured
    if (!process.env.GOOGLE_CLIENT_ID) {
      console.error('GOOGLE_CLIENT_ID is not set in environment variables');
      return res.status(500).json({
        success: false,
        message: 'Google authentication is not properly configured on the server. Please contact support.'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { tokenId } = req.body;

    // Validate tokenId format (should be a JWT-like string)
    if (!tokenId || typeof tokenId !== 'string' || tokenId.length < 100) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Google token format. Please try signing in again.'
      });
    }

    // Initialize Google OAuth2 client
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

    // Verify the token
    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken: tokenId,
        audience: process.env.GOOGLE_CLIENT_ID
      });
    } catch (error) {
      console.error('Google token verification error:', error);
      
      // Provide more specific error messages
      if (error.message?.includes('Token used too early') || error.message?.includes('expired')) {
        return res.status(401).json({
          success: false,
          message: 'Google token has expired. Please try signing in again.'
        });
      }
      
      if (error.message?.includes('audience') || error.message?.includes('client ID')) {
        return res.status(401).json({
          success: false,
          message: 'Google token client ID mismatch. Please check your Google OAuth configuration.'
        });
      }
      
      return res.status(401).json({
        success: false,
        message: 'Invalid Google token. Please try signing in again.'
      });
    }

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email not provided by Google'
      });
    }

    // Check if user exists by email or googleId
    let user = await User.findOne({
      $or: [{ email }, { googleId }]
    });

    if (user) {
      if (user.status === 'Suspended' || user.isSuspended) {
        return res.status(403).json({
          success: false,
          message: 'Your account has been suspended. Please contact admin at admin@evertrend.com.'
        });
      }
      // Update user with Google ID if not set
      if (!user.googleId) {
        user.googleId = googleId;
        // Auto-verify email for Google users
        user.isVerified = true;
        await user.save();
      }
    } else {
      // Create new user from Google account
      // Generate username from email or name
      const baseUsername = name?.toLowerCase().replace(/\s+/g, '') || email.split('@')[0];
      let username = baseUsername;
      let usernameExists = await User.findOne({ username });
      let counter = 1;
      
      // Ensure unique username
      while (usernameExists) {
        username = `${baseUsername}${counter}`;
        usernameExists = await User.findOne({ username });
        counter++;
      }

      user = await User.create({
        username,
        email,
        googleId,
        isVerified: true, // Google emails are pre-verified
        role: 'Buyer' // Default role
      });
    }

    // Generate JWT token
    const token = generateToken(user._id);

    res.json({
      success: true,
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        token
      }
    });
  } catch (error) {
    console.error('Google auth error:', error);
    
    // Handle specific error types
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error: ' + error.message
      });
    }
    
    if (error.name === 'MongoServerError' || error.name === 'MongoError') {
      return res.status(500).json({
        success: false,
        message: 'Database error. Please try again later.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Google authentication failed. Please try again.'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current logged in user
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
