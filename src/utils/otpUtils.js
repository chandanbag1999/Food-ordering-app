const OTP = require("../models/otpModel");
const { sendOtpEmail } = require("./emailUtils");

const generateOtp = (length = 6) => {
  // Generate a random 6-digit number
  const min = Math.pow(10, length -1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(Math.random() * (max - min + 1) + min).toString();
};


// create a new otp record
const createOtp = async (data) => {
  const { userId, phoneNumber, email, purpose } = data;
  
  console.log('Creating OTP with data:', { userId, phoneNumber, email, purpose });

  // Generate OTP
  const otp = generateOtp();
  console.log(`Generated OTP: ${otp} for ${phoneNumber}`);

  // Calculate expire time (5 min from now)
  const expiryMinutes = parseInt(process.env.OTP_EXPIRY_TIME) / 60 || 5;
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);
  console.log(`OTP will expire at: ${expiresAt}`);

  // Delete any existing otps for this user/phone/email and purpose
  let deleteResult;
  if (userId) {
    deleteResult = await OTP.deleteMany({ userId, purpose });
    console.log(`Deleted ${deleteResult.deletedCount} existing OTPs for userId: ${userId}`);
  } else if (phoneNumber) {
    deleteResult = await OTP.deleteMany({ phoneNumber, purpose });
    console.log(`Deleted ${deleteResult.deletedCount} existing OTPs for phoneNumber: ${phoneNumber}`);
  } else if (email) {
    deleteResult = await OTP.deleteMany({ email, purpose });
    console.log(`Deleted ${deleteResult.deletedCount} existing OTPs for email: ${email}`);
  }

  // Create new OTP record
  const otpRecord = await OTP.create({
    userId,
    phoneNumber,
    email,
    otp,
    expiresAt,
    purpose,
    isVerified: false,
  });
  
  console.log(`OTP record created with ID: ${otpRecord._id}`);
  
  return {
    otpRecord,
    otp,
  };

};

// verify otp
const verifyOtp = async (data) => {
  const { userId, phoneNumber, email, otp, purpose, dontMarkAsVerified } = data;

  console.log('Verifying OTP with data:', { userId, phoneNumber, email, purpose, otp: '******', dontMarkAsVerified });

  // Find the OTP record
  let query = { purpose };
  if (userId) query.userId = userId;
  if (phoneNumber) query.phoneNumber = phoneNumber;
  if (email) query.email = email;

  console.log('OTP lookup query:', query);
  
  // Print all OTPs for debugging
  console.log('Debugging: All OTPs in the database:');
  if (phoneNumber) {
    const allPhoneOtps = await OTP.find({ phoneNumber });
    console.log(`Found ${allPhoneOtps.length} OTP records for phone ${phoneNumber}`);
    allPhoneOtps.forEach((record, i) => {
      console.log(`Record ${i+1}:`, {
        id: record._id,
        phoneNumber: record.phoneNumber,
        purpose: record.purpose,
        isVerified: record.isVerified,
        expiresAt: record.expiresAt,
        createdAt: record.createdAt
      });
    });
  } else if (email) {
    const allEmailOtps = await OTP.find({ email });
    console.log(`Found ${allEmailOtps.length} OTP records for email ${email}`);
    allEmailOtps.forEach((record, i) => {
      console.log(`Record ${i+1}:`, {
        id: record._id,
        email: record.email,
        purpose: record.purpose,
        isVerified: record.isVerified,
        expiresAt: record.expiresAt,
        createdAt: record.createdAt
      });
    });
  }

  const otpRecord = await OTP.findOne(query);
  console.log('OTP record found:', otpRecord ? 'Yes' : 'No');

  // Check if OTP exists
  if (!otpRecord) {
    return {
      valid: false,
      message: "OTP not found or expired"
    };
  };

  // Check if OTP is already verified (skip this check if we're resetting password in flow)
  if (otpRecord.isVerified && purpose !== 'password_reset') {
    return {
      valid: false,
      message: "OTP already used"
    };
  };

  // Check if OTP has expired
  if (otpRecord.expiresAt < new Date()) {
    return {
      valid: false,
      message: "OTP expired"
    };
  };

  // Verify OTP
  try {
    // Check if the method exists
    if (typeof otpRecord.compareOTP !== 'function') {
      console.error('compareOTP method not found on otpRecord', otpRecord);
      return {
        valid: false,
        message: "Error verifying OTP"
      };
    }
    
    // Use the correct method name
    const isValid = await otpRecord.compareOTP(otp);
    if (isValid) {
      // Only mark as verified if not explicitly told not to
      if (!dontMarkAsVerified) {
        otpRecord.isVerified = true;
        await otpRecord.save();
      }

      return {
        valid: true,
        message: "OTP verified successfully",
        otpRecord,
      };
    }
  } catch (error) {
    console.error('Error comparing OTP:', error);
    return {
      valid: false,
      message: "Error verifying OTP",
      error: error.message
    };
  }

  return {
    valid: false,
    message: "Invalid OTP",
  };

};

//TODO: read function

// Send OTP via SMS
const sendSmsOtp = async (phoneNumber, otp) => {
  try {
    console.log(`Attempting to send SMS to ${phoneNumber} with OTP: ${otp}`);
    
    // Debug environment variables
    console.log('ENV VARIABLES FROM PROCESS.ENV:');
    console.log(`TWILIO_PHONE_NUMBER=${process.env.TWILIO_PHONE_NUMBER}`);
    console.log(`TWILIO_SMS_ENABLED=${process.env.TWILIO_SMS_ENABLED}`);
    console.log(`TWILIO_ACCOUNT_SID=${process.env.TWILIO_ACCOUNT_SID ? 'SET' : 'NOT SET'}`);
    
    // Print all environment variables with TWILIO in their name
    console.log('ALL TWILIO ENVIRONMENT VARIABLES:');
    Object.keys(process.env).filter(key => key.includes('TWILIO')).forEach(key => {
      console.log(`${key}=${key.includes('AUTH') ? '[REDACTED]' : process.env[key]}`);
    });
    
    // Check if SMS is enabled
    const smsEnabled = process.env.TWILIO_SMS_ENABLED === 'true';
    if (!smsEnabled) {
      console.log('SMS sending is disabled via TWILIO_SMS_ENABLED=false');
      console.log(`OTP would be sent to ${phoneNumber}: ${otp}`);
      return {
        success: false,
        error: 'SMS sending is disabled in configuration',
        simulated: true
      };
    }
    
    // Check if Twilio credentials are configured
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioNumber = process.env.TWILIO_PHONE_NUMBER;
    
    // If credentials are not set up properly, just log and return success
    if (!accountSid || !authToken || !twilioNumber || 
        accountSid === 'your_account_sid_here' ||
        authToken === 'your_auth_token_here' ||
        twilioNumber === 'your_twilio_phone_number_here') {
      console.log('Twilio credentials not properly configured. SMS not sent.');
      console.log(`In production, an SMS would be sent to ${phoneNumber} with OTP: ${otp}`);
      return {
        success: false,
        error: 'Twilio credentials not configured properly',
        simulated: true
      };
    }
    
    // Check for common errors in Twilio configuration
    if (!twilioNumber.startsWith('+')) {
      console.log('Error: Twilio phone number must start with a + sign');
      return {
        success: false,
        error: 'Invalid Twilio phone number format'
      };
    }
    
    try {
      // Initialize Twilio client and send the message
      const client = require('twilio')(accountSid, authToken);
      
      console.log(`Using Twilio phone number: ${twilioNumber}`);
      
      // Double check all variables just before creating the message
      console.log('FINAL SMS PARAMETERS:');
      console.log(`From: ${twilioNumber}`);
      console.log(`To: ${phoneNumber}`);
      console.log(`Body: Your verification code is: ${otp}`);
      
      // TEMPORARY FIX: Use hardcoded Twilio number to diagnose the issue
      const actualTwilioNumber = '+14155238886'; // This should match what you got from Twilio
      console.log(`Overriding Twilio number to: ${actualTwilioNumber}`);
      
      const message = await client.messages.create({
        body: `Your verification code is: ${otp}`,
        from: actualTwilioNumber, // Use the hardcoded number temporarily
        to: phoneNumber
      });
      
      console.log(`SMS sent successfully to ${phoneNumber}, SID: ${message.sid}`);
      return {
        success: true,
        messageId: message.sid,
        simulated: false
      };
    } catch (twilioError) {
      console.error('Error sending SMS:', twilioError);
      
      // Handle specific Twilio errors
      if (twilioError.code === 21659) {
        console.log("CONFIGURATION ERROR: The 'From' number is not a valid Twilio phone number");
        console.log("Please purchase a Twilio phone number from https://console.twilio.com/us1/develop/phone-numbers/manage/search");
      }
      
      return {
        success: false,
        error: twilioError.message,
        code: twilioError.code,
        moreInfo: twilioError.moreInfo
      };
    }
  } catch (error) {
    console.error('Error in SMS service:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Send OTP via Email
const sendEmailOtp = async (email, otp) => {
  try {
    console.log(`Preparing to send OTP email to ${email}`);
    
    // Use the sendOtpEmail function from emailUtils
    const result = await sendOtpEmail(email, otp);
    
    // Log the result based on success or failure
    if (result.success) {
      console.log(`Email sent successfully to ${email} with message ID: ${result.messageId}`);
    } else if (result.simulated) {
      console.log(`Email simulation for ${email}: OTP ${otp} would be sent in production`);
    } else {
      console.error(`Failed to send email to ${email}: ${result.error}`);
    }
    
    return result;
  } catch (error) {
    console.error('Error in sendEmailOtp:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  generateOtp,
  createOtp,
  verifyOtp,
  sendSmsOtp,
  sendEmailOtp
};

