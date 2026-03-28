# eSewa Login Guide - Step by Step

## ⚠️ IMPORTANT: Exact Login Steps

If you're reaching the eSewa login page but cannot log in, follow these steps **EXACTLY**:

### Step 1: Clear Browser Data
1. Open browser DevTools (F12)
2. Go to Application tab → Clear Storage
3. Clear cookies for `rc-epay.esewa.com.np`
4. Refresh the page

### Step 2: Enter Credentials EXACTLY

**eSewa ID:**
```
9806800001
```
- Type it manually (don't copy-paste if it adds spaces)
- No spaces before or after
- Try alternative IDs if this doesn't work: `9806800002`, `9806800003`, `9806800004`, `9806800005`

**Password:**
```
Nepal@123
```
- **Case-sensitive**: Capital N, lowercase epal, @ symbol, then 123
- Type it manually to avoid copy-paste issues
- Make sure Caps Lock is OFF
- The @ symbol is required (Shift + 2 on most keyboards)

### Step 3: Complete reCAPTCHA
1. Check the "I'm not a robot" checkbox
2. **WAIT** for the green checkmark to appear
3. If it asks you to select images, complete that challenge
4. Do NOT proceed until you see the green checkmark

### Step 4: Click LOGIN
- Click the green "LOGIN" button
- Wait for the page to process (don't click multiple times)

## Common Issues & Solutions

### Issue: "Invalid Credentials" Error
**Solution:**
- Double-check password: `Nepal@123` (exact case)
- Try a different test account (9806800002, etc.)
- Clear browser cache and try again
- Make sure you're typing, not copy-pasting

### Issue: reCAPTCHA Keeps Failing
**Solution:**
- Refresh the page
- Try in an incognito/private window
- Disable browser extensions temporarily
- Try a different browser (Chrome, Firefox, Edge)

### Issue: Page Loads But Login Button Doesn't Work
**Solution:**
- Check browser console (F12) for JavaScript errors
- Verify form was submitted correctly (check Network tab)
- Try disabling ad blockers
- Check if there are CORS errors in console

### Issue: Login Succeeds But Payment Fails
**Solution:**
- This means signature validation failed
- Check backend logs for signature generation
- Verify signature string format matches exactly
- Check that form data matches signature generation

## Testing Checklist

Before trying to login:
- [ ] Backend server is running
- [ ] Form submission logs appear in browser console
- [ ] No JavaScript errors in browser console
- [ ] Network tab shows successful form POST to eSewa
- [ ] You're using the test environment URL: `rc-epay.esewa.com.np`

## Alternative Test Accounts

If `9806800001` doesn't work, try these (all use same password `Nepal@123`):
- `9806800002`
- `9806800003`
- `9806800004`
- `9806800005`

## Still Can't Login?

1. **Check Backend Logs:**
   - Look for "eSewa Signature Generation" logs
   - Verify signature is being generated correctly
   - Check for any errors in payment route

2. **Check Browser Console:**
   - Open DevTools (F12)
   - Go to Console tab
   - Look for any red error messages
   - Check Network tab for failed requests

3. **Verify Form Submission:**
   - In browser console, you should see:
     - "Submitting eSewa form:"
     - "Form created with X fields"
     - "Form submitted successfully"

4. **Contact eSewa Support:**
   - If test accounts are locked or not working
   - eSewa may need to reset test accounts
   - Check eSewa documentation for updated test credentials

## Quick Test

To verify your credentials work, try logging in directly at:
```
https://rc-epay.esewa.com.np/auth
```

If you can login there but not through your app, the issue is with form submission, not credentials.
