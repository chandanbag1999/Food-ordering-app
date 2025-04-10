const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const otpSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    sparse: true, // Allows null for non-registered users
  },
  phoneNumber: {
    type: String,
    sparse: true, // Allows null for non-registered users
  },
  email: {
    type: String,
    sparse: true, // Allows null for non-registered users
  },
  otp: {
    type: String,
    required: true,
  },
  purpose: {
    type: String,
    enum: ['registration', 'login', 'password_reset'],
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 } // Document will be automatically deleted  when expiresAt is reached
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  
});


// Hash OTP before saving
otpSchema.pre('save', async function(next) {
  // Only hash the OTP if it's modified (or new)
  if (!this.isModified('otp')) return next();
  
  try {
    // Generate salt
    const salt = await bcrypt.genSalt(10);
    // Hash OTP with salt
    this.otp = await bcrypt.hash(this.otp, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare OTP
otpSchema.methods.compareOTP = async function(candidateOTP) {
  try {
    console.log('Comparing OTP:', { 
      stored: this.otp.substring(0, 3) + '...',
      provided: candidateOTP.substring(0, 3) + '...'
    });
    
    const result = await bcrypt.compare(candidateOTP, this.otp);
    console.log('OTP comparison result:', result);
    return result;
  } catch (error) {
    console.error('Error comparing OTP:', error);
    throw new Error(error);
  }
};

const OTP = mongoose.model('OTP', otpSchema);

module.exports = OTP;
