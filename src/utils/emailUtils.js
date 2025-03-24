const nodemailer = require('nodemailer');

/**
 * Creates a nodemailer transporter using available environment variables
 * @returns {nodemailer.Transporter} Configured transporter
 */
const createTransporter = () => {
  try {
    console.log('Attempting to create email transporter...');
    
    // Check if we have host/port configuration or service configuration
    const host = process.env.EMAIL_HOST || process.env.MAIL_HOST;
    const port = process.env.EMAIL_PORT || process.env.MAIL_PORT;
    const username = process.env.EMAIL_USERNAME || process.env.EMAIL_USER || process.env.MAIL_USERNAME || process.env.MAIL_USER;
    const password = process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS || process.env.MAIL_PASSWORD || process.env.MAIL_PASS;
    const service = process.env.EMAIL_SERVICE || process.env.MAIL_SERVICE;
    
    console.log(`Email config: host=${host}, port=${port}, username=${username ? '✓' : '✗'}, password=${password ? '✓' : '✗'}, service=${service}`);
    
    let transporter;
    
    // Create appropriate transporter based on available config
    if (host && port && username && password) {
      // Host/port-based configuration
      transporter = nodemailer.createTransport({
        host,
        port: parseInt(port),
        secure: parseInt(port) === 465,
        auth: {
          user: username,
          pass: password
        }
      });
      console.log(`Created SMTP transporter with host ${host} and port ${port}`);
    } else if (service && username && password) {
      // Service-based configuration
      transporter = nodemailer.createTransport({
        service,
        auth: {
          user: username,
          pass: password
        }
      });
      console.log(`Created service-based transporter with service ${service}`);
    } else {
      // For Gmail configuration
      if (username && password && (username.includes('@gmail.com') || username.includes('@googlemail.com'))) {
        transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: username,
            pass: password
          }
        });
        console.log('Created Gmail transporter based on username domain');
      } else {
        console.log('Email configuration incomplete. Please check environment variables.');
        // Default configuration for Gmail in case user wants to manually update
        transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: username || '',
            pass: password || ''
          }
        });
        console.log('Using default Gmail configuration, may not work without proper credentials');
      }
    }
    
    return transporter;
  } catch (error) {
    console.error('Error creating email transporter:', error);
    return null;
  }
};

/**
 * Generate HTML template for OTP emails
 * @param {string} otp - The OTP code
 * @param {string} appName - The name of the application
 * @returns {string} HTML email template
 */
const generateOtpEmailTemplate = (otp, appName = 'MearnIt') => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your OTP Code</title>
      <style type="text/css">
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          margin: 0;
          padding: 0;
          background-color: #f6f6f6;
          color: #333333;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #ffffff;
        }
        .header {
          text-align: center;
          padding: 20px 0;
          background-color: #FF3008;
          color: white;
        }
        .content {
          padding: 20px;
          border: 1px solid #eeeeee;
        }
        .otp-code {
          font-size: 30px;
          font-weight: bold;
          text-align: center;
          margin: 20px 0;
          padding: 10px;
          background-color: #f5f5f5;
          border-radius: 5px;
          letter-spacing: 5px;
        }
        .footer {
          text-align: center;
          font-size: 12px;
          color: #999999;
          padding: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${appName}</h1>
        </div>
        <div class="content">
          <h2>Your One-Time Password</h2>
          <p>Please use the following OTP to complete your request. This code will expire in 5 minutes.</p>
          <div class="otp-code">${otp}</div>
          <p>If you didn't request this OTP, please ignore this email or contact support if you have concerns.</p>
        </div>
        <div class="footer">
          <p>This is an automated message, please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Send an OTP email to the user
 * @param {string} to - Recipient email address
 * @param {string} otp - The OTP code
 * @returns {Promise<Object>} Result of sending operation
 */
const sendOtpEmail = async (to, otp) => {
  try {
    console.log(`Attempting to send OTP email to ${to}`);
    
    // Get the app name from environment variables with fallback
    const fromName = process.env.EMAIL_FROM_NAME || process.env.APP_NAME || 'MearnIt';
    const fromAddress = process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USERNAME || process.env.EMAIL_USER || 'noreply@example.com';
    const from = `${fromName} <${fromAddress}>`;
    
    // Create transporter
    const transporter = createTransporter();
    if (!transporter) {
      console.log('Could not create email transporter');
      return {
        success: false,
        error: 'Email transporter could not be created',
        simulated: true
      };
    }
    
    // Generate email HTML
    const htmlContent = generateOtpEmailTemplate(otp, fromName);
    
    // Configure email options
    const mailOptions = {
      from,
      to,
      subject: `Your ${fromName} OTP Code`,
      text: `Your OTP code is: ${otp}. This code will expire in 5 minutes.`,
      html: htmlContent
    };
    
    // Send the email
    console.log('Sending email with options:', {
      from,
      to,
      subject: mailOptions.subject
    });
    
    // In development mode, log the OTP in console
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] Email OTP for ${to}: ${otp}`);
    }
    
    // Actually send the email
    try {
      console.log('Sending email now...');
      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', info.messageId);
      return {
        success: true,
        messageId: info.messageId
      };
    } catch (sendError) {
      console.error('Error sending email:', sendError);
      
      // For development purposes, return a simulated success in dev mode
      if (process.env.NODE_ENV === 'development') {
        console.log('Development mode: Simulating email success despite error');
        return {
          success: true,
          simulated: true,
          error: sendError.message,
          otp: otp // Include OTP in dev mode for testing
        };
      }
      
      return {
        success: false,
        error: sendError.message
      };
    }
  } catch (error) {
    console.error('Error in sendOtpEmail:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

const sendPasswordResetConfirmation = async (email) => {
  try {
    const transporter = await createTransporter();
    
    if (!transporter) {
      console.warn('Email transporter not available. Would have sent password reset confirmation.');
      return {
        success: true,
        simulated: true,
        message: 'Email sending simulated (transporter not available)'
      };
    }
    
    // Simple HTML template for the confirmation email
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 5px;">
        <h2 style="color: #333;">Password Reset Confirmation</h2>
        <p style="color: #555; font-size: 16px;">Your password has been successfully reset.</p>
        <p style="color: #555; font-size: 16px;">If you did not request this change, please contact support immediately.</p>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e1e1e1; color: #777; font-size: 14px;">
          <p>This is an automated email. Please do not reply.</p>
        </div>
      </div>
    `;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@mernapp.com',
      to: email,
      subject: 'Password Reset Confirmation',
      html: html
    };
    
    await transporter.sendMail(mailOptions);
    
    return {
      success: true,
      simulated: false,
      message: 'Password reset confirmation email sent successfully'
    };
    
  } catch (error) {
    console.error('Error sending password reset confirmation email:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to send password reset confirmation email'
    };
  }
};

module.exports = {
  sendOtpEmail,
  createTransporter,
  generateOtpEmailTemplate,
  sendPasswordResetConfirmation
}; 