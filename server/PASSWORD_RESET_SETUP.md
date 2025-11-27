# Password Reset Setup Guide

## Issue Fixed
The 500 error has been fixed. The system will now handle email sending failures gracefully without crashing.

## SMTP Configuration Required

The password reset feature requires SMTP configuration. The error you're seeing is due to missing or incorrect SMTP credentials.

### Steps to Fix:

1. **Create/Update `.env` file** in the `server` directory:
   ```bash
   cp server/env_template.txt server/.env
   ```

2. **For Gmail (dreamwave610@gmail.com):**
   
   You need to use a Gmail App Password, NOT your regular Gmail password.
   
   **Steps to generate Gmail App Password:**
   
   a. Go to your Google Account: https://myaccount.google.com/
   
   b. Navigate to: **Security** → **2-Step Verification** (must be enabled)
   
   c. Scroll down to **App passwords**
   
   d. Select **Mail** and **Other (Custom name)**
   
   e. Enter "Inkinki Smart School" as the name
   
   f. Click **Generate**
   
   g. Copy the 16-character password (it will look like: `abcd efgh ijkl mnop`)

3. **Update `.env` file:**
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_TLS=True
   SMTP_USER=dreamwave610@gmail.com
   SMTP_PASSWORD=your-16-character-app-password-here
   EMAILS_FROM_EMAIL=dreamwave610@gmail.com
   EMAILS_FROM_NAME=Inkinki Smart School
   ```

4. **Restart the server:**
   ```bash
   docker-compose restart app
   ```

### Important Notes:

- **2-Step Verification must be enabled** on your Gmail account to generate App Passwords
- Use the **16-character App Password**, not your regular Gmail password
- Remove spaces from the App Password when adding to `.env` (e.g., `abcdefghijklmnop`)
- The system will now work even if email fails (for security), but emails won't be sent until SMTP is configured correctly

### Testing:

After configuring SMTP:
1. Go to login page
2. Click "Forgot Password?"
3. Enter your email
4. Check your email for the 6-digit verification code
5. Use the code to reset your password

### Troubleshooting:

If emails still don't send:
- Check server logs: `docker-compose logs app | grep -i email`
- Verify SMTP credentials are correct
- Ensure 2-Step Verification is enabled on Gmail
- Check that the App Password was copied correctly (no spaces)

