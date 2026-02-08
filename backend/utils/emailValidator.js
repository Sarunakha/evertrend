import dns from 'dns';
import { promisify } from 'util';

const resolveMx = promisify(dns.resolveMx);
const resolve4 = promisify(dns.resolve4);

// Helper function to add timeout to promises
const withTimeout = (promise, timeoutMs, errorMessage) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
};

// List of known disposable email providers
const DISPOSABLE_EMAIL_DOMAINS = [
  '10minutemail.com',
  'guerrillamail.com',
  'tempmail.com',
  'mailinator.com',
  'throwaway.email',
  'temp-mail.org',
  'getnada.com',
  'mohmal.com',
  'fakeinbox.com',
  'trashmail.com',
  'maildrop.cc',
  'yopmail.com',
  'sharklasers.com',
  'grr.la',
  'mintemail.com',
  'meltmail.com',
  'spamgourmet.com',
  'spamhole.com',
  'spamtraps.com',
  'tempail.com',
  'tempe-mail.com',
  'tmpmail.net',
  'tmpmail.org',
  'tmpmail.ru',
  'tmail.ws',
  'tmailinator.com',
  'tmailservice.com',
  'tmails.net',
  'tmailservices.com',
  'tmailservices.net',
  'tmailservices.org',
  'tmailservices.ru',
  'tmailservices.ws'
];

// Common test/fake domains that should be blocked
const BLOCKED_TEST_DOMAINS = [
  'example.com',
  'example.org',
  'example.net',
  'test.com',
  'test.org',
  'test.net',
  'fake.com',
  'fake.org',
  'invalid.com',
  'notreal.com',
  'dummy.com',
  'sample.com'
];

/**
 * Validates email syntax using regex
 */
export const validateEmailSyntax = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Checks if email domain is from a disposable email provider or blocked test domain
 */
export const isDisposableEmail = (email) => {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return true;
  return DISPOSABLE_EMAIL_DOMAINS.includes(domain) || BLOCKED_TEST_DOMAINS.includes(domain);
};

/**
 * Validates email domain by checking MX records
 * @param {string} email - Email address to validate
 * @param {number} timeoutMs - Timeout in milliseconds (default: 5000)
 * @returns {Promise<{valid: boolean, error?: string}>}
 */
export const validateEmailDomain = async (email, timeoutMs = 5000) => {
  try {
    const domain = email.split('@')[1];
    
    if (!domain || domain.length === 0) {
      return { valid: false, error: 'Invalid email format - missing domain' };
    }

    // Validate domain format (basic check)
    if (!/^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/.test(domain)) {
      return { valid: false, error: 'Invalid email domain format. Please use a valid email address.' };
    }

    // First, try MX record lookup (preferred for email validation)
    try {
      const mxRecords = await withTimeout(
        resolveMx(domain),
        timeoutMs,
        'DNS lookup timeout'
      );
      
      if (!mxRecords || mxRecords.length === 0) {
        // If no MX records, try A record as fallback (some domains use A records for mail)
        try {
          await withTimeout(
            resolve4(domain),
            timeoutMs,
            'DNS lookup timeout'
          );
          return { valid: true };
        } catch (aRecordError) {
          return { valid: false, error: 'Email domain does not have valid mail servers (MX or A records). Please use a real email address.' };
        }
      }

      return { valid: true };
    } catch (dnsError) {
      // If MX lookup fails, try A record as fallback
      try {
        await withTimeout(
          resolve4(domain),
          timeoutMs,
          'DNS lookup timeout'
        );
        return { valid: true };
      } catch (aRecordError) {
        // Check if it's a timeout error
        if (dnsError.message === 'DNS lookup timeout' || aRecordError.message === 'DNS lookup timeout') {
          return { valid: false, error: 'Email domain validation timed out. Please check your internet connection and try again.' };
        }
        
        // Check for specific DNS error codes - these mean the domain doesn't exist
        if (dnsError.code === 'ENOTFOUND' || dnsError.code === 'ENODATA' || 
            aRecordError.code === 'ENOTFOUND' || aRecordError.code === 'ENODATA') {
          return { valid: false, error: 'Email domain does not exist. Please use a valid email address with a real domain.' };
        }
        
        // Log the error for debugging
        console.error('Email domain validation error:', {
          domain,
          mxError: dnsError.code || dnsError.message,
          aRecordError: aRecordError.code || aRecordError.message
        });
        
        return { valid: false, error: 'Email domain does not exist or is not reachable. Please use a valid email address.' };
      }
    }
  } catch (error) {
    // Catch any unexpected errors
    console.error('Unexpected error in domain validation:', error);
    return { valid: false, error: 'Email domain validation failed. Please use a valid email address.' };
  }
};

/**
 * Comprehensive email validation
 * @param {string} email - Email address to validate
 * @param {Object} options - Validation options
 * @param {boolean} options.checkDisposable - Check against disposable email list
 * @param {boolean} options.checkMx - Check MX records
 * @param {number} options.timeoutMs - Timeout for DNS lookups in milliseconds (default: 5000)
 * @returns {Promise<{valid: boolean, error?: string}>}
 */
export const validateEmail = async (email, options = {}) => {
  try {
    const { checkDisposable = true, checkMx = true, timeoutMs = 5000 } = options;

    // Normalize email: trim and lowercase
    if (!email || typeof email !== 'string') {
      return { valid: false, error: 'Email is required and must be a valid string.' };
    }
    
    email = email.trim().toLowerCase();

    // Step 1: Syntax validation
    if (!validateEmailSyntax(email)) {
      return { valid: false, error: 'Invalid email format. Please enter a valid email address.' };
    }

    // Step 2: Disposable email check
    if (checkDisposable && isDisposableEmail(email)) {
      return { valid: false, error: 'Disposable email addresses are not allowed. Please use a real email address.' };
    }

    // Step 3: MX record validation (required for real email addresses)
    if (checkMx) {
      const domainCheck = await validateEmailDomain(email, timeoutMs);
      if (!domainCheck || !domainCheck.valid) {
        return domainCheck || { valid: false, error: 'Email domain validation failed. Please use a real email address.' };
      }
    }

    return { valid: true };
  } catch (error) {
    // Catch any unexpected errors and treat as invalid
    console.error('Unexpected error in email validation:', error);
    return { valid: false, error: 'Email validation failed. Please use a valid, real email address.' };
  }
};

