const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, "Full name is required"],
    minlength: [3, "Full name must be at least 3 characters long"],
    maxlength: [50, "Full name must be less than 50 characters long"],
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    trim: true,
    match: [
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      "Please use a valid email address",
    ],
  },
  phoneNumber: {
    type: String,
    required: [true, "Phone number is required"],
    trim: true,
    unique: true,
    sparse: true, // Allows null/undefined values to not trigger unique constraint
    match: [/^\+?[0-9]{10,15}$/, "Please use a valid phone number with optional country code"],
  },
  password: {
    type: String,
    minlength: [8, "Password must be at least 8 characters long"],
    select: false, // Don't include password in query results by default

  },
  role: {
    type: String,
    enum: ['super_admin', 'sub_admin', 'restaurant_owner', 'delivery_partner', 'customer'],
    default: 'customer'
  },
  // Authentication methods
  authMethod: {
    type: String,
    enum: ['phone_otp', 'email_otp', 'google', 'password'],
    default: 'password'
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  // Profile data
  profilePicture: {
    url: {
      type: String,
      default: 'https://res.cloudinary.com/your-cloud-name/image/upload/v1/profile-pictures/default-avatar.png'
    },
    publicId: {
      type: String
    }
  },
  // Addresses
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  // Terms acceptance
  termsAccepted: {
    type: Boolean,
    default: false
  },
  termsAcceptedDate: {
    type: Date
  },
  // Role-specific fields
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
  },
  adminPermissions: [String],
  deliveryStatus: {
    type: String,
    enum: ['available', 'busy', 'offline'],
    default: 'offline'
  },
  // Customer specific
  paymentMethod: [Object],
  savedAddresses: [Object],

  // Coupon usage tracking
  couponUsage: {
    type: Map,
    of: Number,
    default: {}
  },
  orderCount: {
    type: Number,
    default: 0
  },

  // Account status
  isActive: {
    type: Boolean,
    default: true
  },
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
},{timestamps: true});



// Hash password before saving
userSchema.pre('save', async function(next){
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
})

// Compare password with hashed password
userSchema.methods.comparePassword = async function(candidatePassword){
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Method to track coupon usage
userSchema.methods.trackCouponUsage = function(couponCode) {
  if (!this.couponUsage) {
    this.couponUsage = new Map();
  }
  
  const currentUsage = this.couponUsage.get(couponCode) || 0;
  this.couponUsage.set(couponCode, currentUsage + 1);
  
  return this;
};

// Method to increment order count
userSchema.methods.incrementOrderCount = function() {
  this.orderCount = (this.orderCount || 0) + 1;
  return this;
};



const User = mongoose.model('User', userSchema);

module.exports = User;