# Email Configuration Guide

This guide explains how to set up email sending functionality for OTP verification in your application.

## Setup Options

There are two main ways to configure email for your application:

1. **Gmail Account**: Use your Gmail account with an App Password
2. **SMTP Provider**: Use a dedicated email service like SendGrid, MailGun, etc.

## Gmail Setup Instructions

### Step 1: Enable 2-Step Verification

1. Go to your [Google Account](https://myaccount.google.com/)
2. Select **Security** from the left menu
3. In the "Signing in to Google" section, select **2-Step Verification**
4. Follow the steps to turn on 2-Step Verification

### Step 2: Create an App Password

1. Go to your [Google Account](https://myaccount.google.com/)
2. Select **Security** from the left menu
3. Under "Signing in to Google," select **App Passwords** (you'll only see this if 2-Step Verification is enabled)
4. At the bottom, click **Select app** and choose **Other (Custom name)**
5. Enter a name, e.g., "MearnIt App"
6. Click **Generate**
7. The app password is the 16-character code shown on your screen
8. Copy this password (you won't be able to see it again)

### Step 3: Update Environment Variables

Update your `.env` file with the following settings:

```
# Email Configuration (for Email OTP)
EMAIL_SERVICE=gmail
EMAIL_USER=your_gmail_address@gmail.com
EMAIL_PASSWORD=your_16_character_app_password
EMAIL_FROM=Your App Name <your_gmail_address@gmail.com>
EMAIL_ENABLED=true
```

Replace:
- `your_gmail_address@gmail.com` with your actual Gmail address
- `your_16_character_app_password` with the app password generated in Step 2

## Testing Email Configuration

To test if your email configuration is working:

1. Start your application
2. Initiate an email OTP request
3. Check your server logs for email sending status
4. Check your inbox for the received email

## Troubleshooting

### Email Not Sending

1. **Check Environment Variables**: Ensure all email environment variables are set correctly
2. **Check Gmail Settings**: Make sure 2-Step Verification is enabled and App Password is correctly generated
3. **Check Server Logs**: Look for any error messages in your server logs
4. **Allow Less Secure Apps**: If using regular password (not recommended), you may need to "Allow less secure apps" in Gmail settings
5. **Check Spam Folder**: The test email might be in your spam folder

### Gmail SMTP Limits

Be aware that Gmail has sending limits:
- 500 emails per day for regular Gmail accounts
- 2,000 emails per day for Google Workspace accounts

For production applications with high volume, consider using a dedicated email service provider.

## Production Recommendations

For production environments, we recommend:

1. Use a dedicated email service provider like SendGrid, Mailgun, or Amazon SES
2. Set up SPF, DKIM, and DMARC records to improve email deliverability
3. Set up proper email monitoring and error handling
4. Consider implementing email templates for consistent branding 