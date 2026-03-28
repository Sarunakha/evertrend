# Contact Us – Email transporter (.env)

The Contact Us feature uses the same email setup as the rest of the app (see `utils/sendEmail.js`). Add these to your **backend** `.env` for sending contact form emails to the admin (e.g. Gmail).

## Required for production / real SMTP (Gmail)

```env
# SMTP (Gmail example)
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-app-password

# Optional: custom "From" name and address
EMAIL_FROM=noreply@evertrend.com
EMAIL_FROM_NAME=EverTrend

# Optional: explicit SMTP host/port (defaults work for Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
```

- **EMAIL_USER** – Gmail address used to send (e.g. `sarunakhadka90@gmail.com`).
- **EMAIL_PASS** – Gmail **App Password** (not your normal password). Create one at: [Google Account → Security → 2-Step Verification → App passwords](https://myaccount.google.com/apppasswords).

Contact form emails are always sent **to** `sarunakhadka90@gmail.com` (set in `controllers/contactController.js`).

## Development (no SMTP)

If `EMAIL_HOST` is not set (or `NODE_ENV=development`), the app can use Ethereal (fake SMTP) or a mock that only logs emails. You can leave `EMAIL_USER` / `EMAIL_PASS` unset in development; contact form submission will still work and the “email” will be logged or available via Ethereal preview URL in the server console.

## Summary – minimum to add to `.env`

For real emails to admin Gmail, add:

- `EMAIL_USER` – sender Gmail
- `EMAIL_PASS` – Gmail App Password

Optional: `EMAIL_FROM`, `EMAIL_FROM_NAME`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_SECURE` if you need to override defaults.
