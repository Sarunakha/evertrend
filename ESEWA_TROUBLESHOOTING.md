# eSewa Payment Integration Troubleshooting Guide

## Login Issues

### Test Credentials (EXACT - Case Sensitive)
- **eSewa ID**: `9806800001` (or 9806800002, 9806800003, 9806800004, 9806800005)
- **Password**: `Nepal@123` (exactly as shown - case sensitive)
- **MPIN**: `1122` (for mobile app only)
- **Token**: `123456` (if required)

### Common Login Problems

1. **Wrong Password Format**
   - ✅ Correct: `Nepal@123`
   - ❌ Wrong: `nepal@123`, `Nepal@123 `, `Nepal@123\n`

2. **reCAPTCHA Not Verified**
   - Make sure the "I'm not a robot" checkbox is checked
   - Wait for the green checkmark to appear
   - If reCAPTCHA fails, refresh the page and try again

3. **Account Locked**
   - If you enter wrong password multiple times, the account may be temporarily locked
   - Wait 5-10 minutes and try again
   - Try a different test account (9806800002, etc.)

4. **Signature Validation After Login**
   - If login succeeds but payment fails, check the signature
   - The signature is validated AFTER login
   - Check browser console and backend logs for signature errors

## Debugging Steps

### 1. Check Browser Console
Open browser DevTools (F12) and check:
- Network tab: Look for any failed requests
- Console tab: Check for JavaScript errors
- Look for the form submission logs

### 2. Check Backend Logs
Look for these logs in your backend console:
```
eSewa Signature Generation:
  Total Amount (string): ...
  Transaction UUID: ...
  Product Code: ...
  Signature String Format: ...
  Generated Signature: ...
```

### 3. Verify Form Data
Before submitting, check that all fields are present:
- `amount`
- `total_amount`
- `transaction_uuid`
- `product_code`
- `signature`
- `signed_field_names`
- `success_url`
- `failure_url`
- `tax_amount`
- `product_service_charge`
- `product_delivery_charge`

### 4. Test Signature Manually
You can test the signature generation using the `verify_signature.js` file:
```bash
node backend/routes/verify_signature.js
```

## Common Error Messages

### "Signature Syntax" or "Signature Mismatch"
- **Cause**: Signature string format is incorrect
- **Fix**: Ensure format is exactly: `total_amount={value},transaction_uuid={value},product_code={value}`
- **Check**: No spaces after commas, exact field names with equals signs

### "Invalid Credentials"
- **Cause**: Wrong eSewa ID or password
- **Fix**: Use exact test credentials: ID `9806800001`, Password `Nepal@123`

### "Payment Failed"
- **Cause**: Signature validation failed after login
- **Fix**: Check that form data matches signature generation exactly
- **Check**: Ensure `total_amount`, `transaction_uuid`, and `product_code` are identical

## Testing Checklist

- [ ] Backend is running and accessible
- [ ] Frontend can reach backend API
- [ ] Form data includes all required fields
- [ ] Signature is generated correctly (check logs)
- [ ] Using correct test credentials
- [ ] reCAPTCHA is verified
- [ ] Success/Failure URLs are accessible
- [ ] No CORS errors in browser console
- [ ] No network errors in browser DevTools

## Production Checklist

Before going to production:
- [ ] Update `ESEWA_PRODUCT_CODE` to production code
- [ ] Update `ESEWA_SECRET_KEY` to production key
- [ ] Update `ESEWA_FORM_URL` to production URL: `https://epay.esewa.com.np/api/epay/main/v2/form`
- [ ] Set environment variables for credentials
- [ ] Test with real eSewa account
- [ ] Verify merchant wallet access: https://merchant.esewa.com.np
