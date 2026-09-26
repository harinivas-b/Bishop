# BISHOP — Supabase Email & Sender Identity Configuration Guide

This guide outlines the exact configuration required in the **Supabase Dashboard** to ensure all user-facing authentication emails display **From: BISHOP**, contain **NO clickable reset links**, and present a clean 6-digit numeric verification code.

---

## 1. Configure Email Sender Identity ("BISHOP")

By default, Supabase sends system emails from `noreply@mail.app.supabase.io` with the display name `Supabase Auth`.

### Option A: Custom SMTP Configuration (Recommended for Production)
1. Go to your **Supabase Project Dashboard**: `https://supabase.com/dashboard/project/crkxdpipyrwpgedesytm`
2. Navigate to **Authentication** -> **Providers** -> **Email Settings**.
3. Enable **Custom SMTP**.
4. Configure your SMTP provider credentials (e.g., SendGrid, Mailgun, Amazon SES, Resend, or Google Workspace SMTP):
   - **Sender Name**: `BISHOP`
   - **Sender Email**: `no-reply@yourdomain.com` (or your verified domain address)
   - **Host**: Your SMTP host
   - **Port**: `587` or `465`
   - **Username**: Your SMTP username
   - **Password**: Your SMTP password / API key
5. Alternatively, add these environment variables to your `.env.local` file:
   ```env
   SMTP_HOST=smtp.yourdomain.com
   SMTP_PORT=587
   SMTP_USER=no-reply@yourdomain.com
   SMTP_PASS=your_smtp_password
   SMTP_FROM="BISHOP" <no-reply@yourdomain.com>
   ```

---

## 2. Configure Reset Password Email Template (No Links, 6-Digit Code Only)

To remove all clickable reset links and ensure the email contains strictly a 6-digit numeric code:

1. Open **Supabase Dashboard** -> **Authentication** -> **Email Templates**.
2. Select the **Reset Password** template.
3. Update the **Subject**:
   ```
   BISHOP Password Verification Code
   ```
4. Replace the **Body (HTML)** with the following template (Notice `{{ .Token }}` instead of `{{ .ConfirmationURL }}`):

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>BISHOP Password Verification Code</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px;">
  <div style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
    
    <!-- Logo Header -->
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; background-color: #ecfdf5; border-radius: 9999px; padding: 8px 16px; color: #047857; font-weight: 800; font-size: 14px; letter-spacing: 0.05em;">
        BISHOP AUTHENTICATION
      </div>
      <h1 style="color: #0f172a; font-size: 22px; font-weight: 800; margin-top: 16px; margin-bottom: 8px;">
        Password Verification Code
      </h1>
      <p style="color: #64748b; font-size: 14px; margin: 0;">
        Use the 6-digit verification code below to reset your BISHOP account password.
      </p>
    </div>

    <!-- OTP Code Box -->
    <div style="background-color: #ecfdf5; border: 2px solid #a7f3d0; border-radius: 16px; padding: 24px; text-align: center; margin: 24px 0;">
      <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #065f46; display: block;">
        {{ .Token }}
      </span>
      <p style="color: #047857; font-size: 12px; font-weight: 600; margin-top: 8px; margin-bottom: 0;">
        This code expires in 15 minutes
      </p>
    </div>

    <!-- Security Footnote -->
    <div style="border-t: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px; text-align: center;">
      <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin: 0;">
        Do not share this code with anyone. BISHOP staff will never ask for your verification code.
        If you did not request this password reset, please ignore this email.
      </p>
    </div>

  </div>
</body>
</html>
```

5. Click **Save**.

---

## 3. Security Verification Checklist

- [x] **No Reset Link**: Email template uses `{{ .Token }}` instead of `{{ .ConfirmationURL }}`.
- [x] **Sender Identity**: Display name is set to `BISHOP`.
- [x] **OTP Verification**: Server API `/api/auth/verify-otp` validates the 6-digit code before issuing a `reset_authorization_token`.
- [x] **Authorized Password Reset**: Server API `/api/auth/reset-password` rejects any attempt without a valid `reset_authorization_token`.
- [x] **Return to Login**: Upon successful password update, the application toasts `"Password Updated Successfully"` and returns the user to the login screen.
