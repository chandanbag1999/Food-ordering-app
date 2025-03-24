# Email-Based Password Reset Flow

This document explains how to use and test the email-based password reset feature in the application.

## Overview

The email-based password reset flow allows users to reset their password through an OTP sent to their registered email address. This flow is designed to be more user-friendly and consists of three main steps:

1. **Request Password Reset**: The user initiates a password reset and receives an OTP via email.
2. **Verify OTP**: The user enters the OTP to verify their identity.
3. **Reset Password**: The user sets a new password.

## Testing the Flow

### Prerequisites

- You should have the application running locally with `npm run dev`.
- Make sure your email configuration is set up correctly in your `.env` file (see `docs/email-setup.md`).

### Step 1: Initiate Password Reset

Make a POST request to the following endpoint:

```
POST http://localhost:5001/api/v1/auth/password/email-otp-reset
```

Request body:
```json
{
  "email": "user@example.com"
}
```

If you're logged in and want to use your session user's email:
```json
{}
```

#### Expected Response

```json
{
  "success": true,
  "message": "OTP sent to your email address. Please check your inbox.",
  "data": {
    "email": "user@example.com"
  }
}
```

In development mode, you'll also see the OTP and email status in the response:

```json
{
  "success": true,
  "message": "OTP sent to your email address. Please check your inbox.",
  "data": {
    "email": "user@example.com",
    "otp": "123456",
    "emailStatus": "sent"
  }
}
```

### Step 2: Verify OTP

After receiving the OTP, make a POST request to the following endpoint:

```
POST http://localhost:5001/api/v1/auth/password/verify-email-otp
```

Request body:
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

#### Expected Response

```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "email": "user@example.com",
    "resetToken": "5f9d7a3b1c2d4e6f8a0b9c7d5e3f1a2b4c6d8e0f"
  }
}
```

The `resetToken` is required for the next step.

### Step 3: Reset Password

Finally, make a POST request to the following endpoint:

```
POST http://localhost:5001/api/v1/auth/password/reset-with-email-otp
```

Request body:
```json
{
  "email": "user@example.com",
  "resetToken": "5f9d7a3b1c2d4e6f8a0b9c7d5e3f1a2b4c6d8e0f",
  "newPassword": "NewSecurePassword123"
}
```

#### Expected Response

```json
{
  "success": true,
  "message": "Password has been reset successfully"
}
```

## Security Features

1. **IP Rate Limiting**: To prevent brute force attacks, the API limits the number of password reset requests from the same IP.
2. **Limited OTP Retries**: There's a limit to how many OTP verification attempts are allowed.
3. **Timed Tokens**: All tokens and OTPs expire after a specified time period.
4. **Obscured Responses**: For security, the API doesn't reveal if an email exists in the system when requesting a password reset.
5. **Confirmation Email**: After a successful password reset, a confirmation email is sent to the user.

## Debugging and Troubleshooting

### Common Issues

1. **Email Not Receiving OTP**:
   - Check your email configuration in the `.env` file.
   - Look at the server logs for email sending errors.
   - In development mode, the OTP appears in the response for testing.

2. **Invalid OTP Errors**:
   - OTPs expire after 10 minutes. Request a new one if needed.
   - Make sure you're using the correct email and OTP combination.

3. **Token Errors During Reset**:
   - Reset tokens expire after 15 minutes. If expired, restart the process.
   - Tokens can only be used once. If your request fails, you'll need to start over.

### Viewing Email Content in Development

In development mode, if email sending is simulated, the content of the email is logged to the console, making it easy to see what would be sent in a production environment.

## Error Codes

| Error Code | Description |
|------------|-------------|
| 400 | Bad Request (missing parameters, invalid OTP, etc.) |
| 404 | User not found |
| 429 | Too Many Attempts (rate limited) |
| 500 | Server Error |

## Example Using cURL

```bash
# Step 1: Initiate password reset
curl -X POST http://localhost:5001/api/v1/auth/password/email-otp-reset \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'

# Step 2: Verify OTP (replace 123456 with the actual OTP received)
curl -X POST http://localhost:5001/api/v1/auth/password/verify-email-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "otp": "123456"}'

# Step 3: Reset password (replace resetToken with the token received in step 2)
curl -X POST http://localhost:5001/api/v1/auth/password/reset-with-email-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "resetToken": "5f9d7a3b1c2d4e6f8a0b9c7d5e3f1a2b4c6d8e0f", "newPassword": "NewSecurePassword123"}'
``` 