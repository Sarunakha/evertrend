import dns from 'dns';
import { promisify } from 'util';

const resolveMx = promisify(dns.resolveMx);

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
  'tmailservices.ws',
  'tmailservices.com',
  'tmailservices.net',
  'tmailservices.org',
  'tmailservices.ru',
  'tmailservices.ws'
];

/**
 * Validates email syntax using regex
 */
export const validateEmailSyntax = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Checks if email domain is from a disposable email provider
 */
export const isDisposableEmail = (email) => {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return true;
  return DISPOSABLE_EMAIL_DOMAINS.includes(domain);
};

/**
 * Validates email domain by checking MX records
 * @param {string} email - Email address to validate
 * @returns {Promise<{valid: boolean, error?: string}>}
 */
export const validateEmailDomain = async (email) => {
  try {
    const domain = email.split('@')[1];
    
    if (!domain) {
      return { valid: false, error: 'Invalid email format' };
    }

    const mxRecords = await resolveMx(domain);
    
    if (!mxRecords || mxRecords.length === 0) {
      return { valid: false, error: 'Email domain does not have valid MX records' };
    }

    return { valid: true };
  } catch (dnsError) {
    // If MX lookup fails, try A record as fallback
    try {
      const domain = email.split('@')[1];
      if (!domain) {
        return { valid: false, error: 'Invalid email format' };
      }
      const resolve4 = promisify(dns.resolve4);
      await resolve4(domain);
      return { valid: true };
    } catch (aRecordError) {
      console.error('Email validation error:', aRecordError);
      return { valid: false, error: 'Email domain does not exist or is not reachable' };
    }
  }
};

/**
 * Comprehensive email validation
 * @param {string} email - Email address to validate
 * @param {Object} options - Validation options
 * @param {boolean} options.checkDisposable - Check against disposable email list
 * @param {boolean} options.checkMx - Check MX records
 * @returns {Promise<{valid: boolean, error?: string}>}
 */
export const validateEmail = async (email, options = {}) => {
  const { checkDisposable = true, checkMx = true } = options;

  // Step 1: Syntax validation
  if (!validateEmailSyntax(email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  // Step 2: Disposable email check
  if (checkDisposable && isDisposableEmail(email)) {
    return { valid: false, error: 'Disposable email addresses are not allowed' };
  }

  // Step 3: MX record validation
  if (checkMx) {
    const domainCheck = await validateEmailDomain(email);
    if (!domainCheck.valid) {
      return domainCheck;
    }
  }

  return { valid: true };
};

