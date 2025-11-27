# Email Debugging Guide

## Current Status
✅ SMTP connection test: **SUCCESSFUL**
✅ SMTP credentials: **CONFIGURED**
✅ Email service test: **WORKING**

## Debugging Steps

### 1. Check Real-Time Logs
When you request a password reset, watch the logs in real-time:

```bash
cd server
docker-compose logs -f app
```

You should see messages like:
- `📧 Attempting to send email to [email] via smtp.gmail.com`
- `✅ Email sent successfully to [email]` (if successful)
- `❌ [error message]` (if failed)

### 2. Try Password Reset Again
1. Go to login page
2. Click "Forgot Password?"
3. Enter your email
4. Watch the docker logs immediately

### 3. Check Email Delivery
Even if the email is sent successfully, check:
- **Inbox** - might take a few seconds
- **Spam/Junk folder** - Gmail sometimes filters automated emails
- **Promotions tab** (if using Gmail)

### 4. Verify Email Address
Make sure the email you're using:
- Exists in the `staff` table
- Is active (`is_active = true`)
- Is not deleted (`is_deleted = false`)

### 5. Check Recent Logs
```bash
docker-compose logs app --tail=100 | grep -E "Email|Password reset|verification"
```

## Common Issues

### Issue: Email sent but not received
**Solutions:**
- Check spam folder
- Wait 1-2 minutes (email delivery can be delayed)
- Verify email address is correct in database
- Check if email provider is blocking automated emails

### Issue: SMTP Authentication Error
**Solution:**
- Verify SMTP_PASSWORD in `.env` is a Gmail App Password (16 characters)
- Ensure 2-Step Verification is enabled on Gmail account
- Regenerate App Password if needed

### Issue: No logs appearing
**Solution:**
- Make sure you're watching logs: `docker-compose logs -f app`
- Try the password reset request again
- Check if server is running: `docker-compose ps`

## Next Steps

1. **Try password reset now** and watch the logs
2. **Share the log output** if emails still don't arrive
3. **Check spam folder** - this is the most common issue

The system is configured correctly, so if emails are being sent (you'll see ✅ in logs), the issue is likely email delivery (spam folder) or the email address in the database.


