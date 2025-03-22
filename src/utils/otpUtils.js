const OTP = require("../models/otpModel");

const generateOtp = (length = 6) => {
  // Generate a random 6-digit number
  const min = Math.pow(10, length -1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(Math.random() * (max - min + 1) + min).toString();
};


// create a new otp record
const createOtp = async (data) => {
  const { userId, phoneNumber, email, purpose } = data;

  // Generate OTP
  const otp = generateOtp();

  // Calculate expire time (5 min from now)
  const expiryMinutes = parseInt(process.env.OTP_EXPIRY_TIME) / 60 || 5;
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);

  // Delete any existing otps for this user/phone/email and purpose
  if (userId) {
    await OTP.deleteMany({ userId, purpose });
  } else if (phoneNumber) {
    await OTP.deleteMany({ phoneNumber, purpose });
  } else if (email) {
    await OTP.deleteMany({ email, purpose });
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
  
  return {
    otpRecord,
    otp,
  };

};

// verify otp
const verifyOtp = async (data) => {
  const { userId, phoneNumber, email, otp, purpose } = data;

  // Find the OTP record
  let query = { purpose };
  if (userId) query.userId = userId;
  if (phoneNumber) query.phoneNumber = phoneNumber;
  if (email) query.email = email;

  const otpRecord = await OTP.findOne(query);

  // Check if OTP exists
  if (!otpRecord) {
    return {
      valid: false,
      message: "OTP not found or expired"
    };
  };

  // Check if OTP is already verified
  if (otpRecord.isVerified) {
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
  const isValid = await otpRecord.compareOtp(otp);
  if (isValid) {
    otpRecord.isVerified = true;
    await otpRecord.save();

    return {
      valid: true,
      message: "OTP verified successfully",
      otpRecord,
    };
  };


  return {
    valid: false,
    message: "Invalid OTP",
  };

};


module.exports = {
  generateOtp,
  createOtp,
  verifyOtp,
};

